using System.Net;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Collections.Concurrent;
using System.Diagnostics;

// No REST API, user task database, remote endpoint, or request logging.
if (args.Contains("--install")) {
    Environment.ExitCode = Installation.Run(args);
    return;
}
var stateDir = Value("--state-dir") ?? throw new ArgumentException("--state-dir is required");
var extensionId = Value("--extension-id") ?? throw new ArgumentException("--extension-id is required");
var portText = Value("--port") ?? "47821";
if (!Regex.IsMatch(extensionId, "^[a-p]{32}$") || !int.TryParse(portText, out var port) || port < 1024 || port > 65535) return;
stateDir = Path.GetFullPath(stateDir);
Directory.CreateDirectory(stateDir);
var builder = WebApplication.CreateSlimBuilder();
builder.Logging.ClearProviders();
builder.WebHost.ConfigureKestrel(server => server.Listen(IPAddress.Loopback, port));
await using var app = builder.Build();
var clients = new ConcurrentDictionary<string, BrowserAck>();
using var ownProcess = Process.GetCurrentProcess();
var origin = $"chrome-extension://{extensionId}";
var shutdown = app.Lifetime.ApplicationStopping;
app.UseWebSockets(new WebSocketOptions { KeepAliveInterval = TimeSpan.FromSeconds(10) });
app.Map("/state", async context => {
    if (context.Request.Host.Host != "127.0.0.1" || context.Request.Headers.Origin != origin || !context.WebSockets.IsWebSocketRequest) {
        context.Response.StatusCode = 403; return;
    }
    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    var id = Guid.NewGuid().ToString("N");
    using var connection = CancellationTokenSource.CreateLinkedTokenSource(shutdown);
    var receive = ReceiveAcks(socket, id, connection.Token);
    try {
        while (!connection.IsCancellationRequested && socket.State == WebSocketState.Open) {
            var data = ReadState();
            // Browser enforcement never receives application names or close events.
            var browserState = new {data.version,data.revision,data.issuedAt,data.expiresAt,data.status,data.domains,allowedDomains=data.allowedDomains ?? []};
            await socket.SendAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(browserState)), WebSocketMessageType.Text, true, connection.Token);
            await Task.Delay(500, connection.Token);
        }
    } catch (Exception e) when (e is WebSocketException or OperationCanceledException or IOException) {
        // A disconnected browser is immediately excluded from protection status.
    } finally {
        connection.Cancel(); socket.Abort(); clients.TryRemove(id, out _);
        try { await receive; } catch (Exception e) when (e is WebSocketException or OperationCanceledException or IOException) { }
    }
});

// Do not advertise liveness until the listener has actually bound successfully.
try { await app.StartAsync(); } catch (IOException) { return; }
var monitor = Task.Run(async () => {
    var lastFresh = DateTimeOffset.UtcNow;
    var announced = false;
    try {
        while (!shutdown.IsCancellationRequested) {
            var state = ReadState();
            var appProtection = AppBlocker.Enforce(state,ReadState);
            var now = DateTimeOffset.UtcNow;
            var stopping = state.status != "disconnected" && !NeedsHelper(state);
            if (state.status != "disconnected") lastFresh = now;
            var fresh = clients.Values.Where(a => now.ToUnixTimeMilliseconds() - a.updatedAt < 2500 && a.revision == state.revision).ToArray();
            var published = WriteAtomic("bridge-status.json", new { updatedAt = now.ToUnixTimeMilliseconds(), pid = Environment.ProcessId,
                browsers = fresh, appProtection, stopping, workingSetBytes = Environment.WorkingSet,
                cpuMs = ownProcess.TotalProcessorTime.TotalMilliseconds });
            // Keep the launch lock until liveness replaces it. A bound listener alone
            // leaves a gap where another launch can race before the first status write.
            if (published && !announced) { ReleaseLaunchPending(); announced = true; }
            if (stopping) {
                // Give each WebSocket loop one turn to send the released state.
                // A quick stop/start can reuse this listener instead of racing a new process.
                await Task.Delay(600,shutdown);
                if (NeedsHelper(ReadState())) continue;
                app.Lifetime.StopApplication(); break;
            }
            if (now - lastFresh > TimeSpan.FromSeconds(10)) { app.Lifetime.StopApplication(); break; }
            await Task.Delay(500, shutdown);
        }
    } catch (OperationCanceledException) { }
});
await app.WaitForShutdownAsync();
await monitor;

string? Value(string name) { var i = Array.IndexOf(args, name); return i >= 0 && i + 1 < args.Length ? args[i + 1] : null; }
bool NeedsHelper(State state) => state.status == "tracking" && (state.domains.Length > 0 || state.apps is {Length: > 0});
State ReadState() {
    try {
        var file = new FileInfo(Path.Combine(stateDir, "state.json"));
        if (!file.Exists || file.Length > 262144) return State.Disconnected;
        var state = JsonSerializer.Deserialize<State>(File.ReadAllText(file.FullName));
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        if (state is null || (state.version != 1 && state.version != 2) || state.revision is null || state.revision.Length > 150 ||
            state.issuedAt > now + 1000 || state.expiresAt <= now || state.expiresAt <= state.issuedAt ||
            state.expiresAt - state.issuedAt > 6000 ||
            !new[] { "tracking", "stopped", "break", "unknown", "error" }.Contains(state.status) ||
            state.apps is { Length: > 200 } || (state.apps?.Any(a=>!AppRule.Valid(a)) ?? false) ||
            state.apps?.Select(a=>a.executable).Distinct().Count() != state.apps?.Length ||
            state.domains is null || state.domains.Length > 500 || state.domains.Any(d => !ValidDomain(d)) ||
            (state.version == 2 && (state.allowedDomains is null || state.allowedDomains.Length > 500 || state.allowedDomains.Any(d => !ValidDomain(d))))) return State.Disconnected;
        return state.status == "tracking" ? state : state with { domains = [], apps = [], allowedDomains = [] };
    } catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException) { return State.Disconnected; }
}
bool ValidDomain(string? d) => d is not null && d.Length <= 253 && d.Contains('.') &&
    !Regex.IsMatch(d, "^[0-9.]+$") && d.Split('.').All(label => Regex.IsMatch(label, "^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$"));
void ReleaseLaunchPending() {
    try {
        var pending = Path.Combine(stateDir, "launch-pending.json");
        using var record = JsonDocument.Parse(File.ReadAllText(pending));
        if (record.RootElement.GetProperty("pid").GetInt32() == Environment.ProcessId) File.Delete(pending);
    } catch (Exception e) when (e is IOException or JsonException or UnauthorizedAccessException or KeyNotFoundException or InvalidOperationException or FormatException) { }
}
bool WriteAtomic(string name, object data) {
    try {
        var destination = Path.Combine(stateDir, name);
        var temp = destination + $".{Environment.ProcessId}.tmp";
        File.WriteAllText(temp, JsonSerializer.Serialize(data)); File.Move(temp, destination, true);
        return true;
    } catch (Exception e) when (e is IOException or UnauthorizedAccessException) { return false; }
}
async Task ReceiveAcks(WebSocket socket, string id, CancellationToken ct) {
    var buffer = new byte[2048];
    try {
        while (!ct.IsCancellationRequested && socket.State == WebSocketState.Open) {
            var result = await socket.ReceiveAsync(buffer, ct);
            if (result.MessageType == WebSocketMessageType.Close) break;
            if (!result.EndOfMessage || result.MessageType != WebSocketMessageType.Text) break;
            try {
                var ack = JsonSerializer.Deserialize<BrowserAck>(buffer.AsSpan(0, result.Count));
                if (ack is not null && ack.revision?.Length < 150 && new[] { "active", "idle", "error" }.Contains(ack.protection))
                    clients[id] = ack with { updatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() };
            } catch (JsonException) { break; }
        }
    } finally { clients.TryRemove(id, out _); socket.Abort(); }
}
