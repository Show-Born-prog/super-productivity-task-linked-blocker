using System.Text.Json;

// One-time, per-user path registration. No service, startup entry, registry or elevation.
static class Installation {
    public static int Run(string[] args) {
        string? Option(string name) {
            var index = Array.IndexOf(args, name);
            return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
        }
        try {
            var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            var root = Path.GetFullPath(Option("--data-dir") ?? Path.Combine(home, ".task-linked-blocker"));
            var runtime = Path.Combine(root, "runtime");
            var executable = Path.Combine(AppContext.BaseDirectory, "FocusGuard.Bridge.exe");
            if (!File.Exists(executable)) throw new IOException("Helper executable is missing.");
            // Do not repoint an installation while it is actively enforcing a task.
            var statusFile = Path.Combine(runtime, "bridge-status.json");
            if (File.Exists(statusFile)) {
                using var status = JsonDocument.Parse(File.ReadAllText(statusFile));
                if (status.RootElement.TryGetProperty("updatedAt", out var updated) &&
                    Math.Abs(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - updated.GetInt64()) < 3000)
                    throw new IOException("Stop the task and wait a few seconds before setup.");
            }
            var import = Option("--import-rules");
            byte[]? rules = null;
            if (import is not null) {
                rules = File.ReadAllBytes(import);
                using var data = JsonDocument.Parse(rules);
                if (data.RootElement.ValueKind != JsonValueKind.Array &&
                    (data.RootElement.ValueKind != JsonValueKind.Object || !data.RootElement.TryGetProperty("rules", out var items) || items.ValueKind != JsonValueKind.Array))
                    throw new IOException("Invalid rules file.");
                if (File.Exists(Path.Combine(runtime, "rules.json"))) throw new IOException("Existing settings were kept. Import requires an empty destination.");
            }
            Directory.CreateDirectory(runtime);
            if (rules is not null) {
                using var destinationRules = new FileStream(Path.Combine(runtime, "rules.json"), FileMode.CreateNew, FileAccess.Write, FileShare.None);
                destinationRules.Write(rules);
            }
            var destination = Path.Combine(root, "installation.json");
            var temporary = destination + $".{Environment.ProcessId}.tmp";
            File.WriteAllText(temporary, JsonSerializer.Serialize(new { version = 1, executable }));
            File.Move(temporary, destination, true);
            Console.WriteLine("Task-linked Blocker: setup complete. Load the plugin ZIP and the extension folder.");
            return 0;
        } catch (Exception error) when (error is IOException or UnauthorizedAccessException or JsonException or ArgumentException or InvalidOperationException or FormatException) {
            Console.Error.WriteLine("Task-linked Blocker: setup failed. " + error.Message);
            return 1;
        }
    }
}
