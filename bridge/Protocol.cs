using System.Text.RegularExpressions;
using System.Text.Json.Serialization;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
record AppRule(string executable) {
    public static bool Valid(AppRule? rule) => rule is not null &&
        rule.executable is { Length: > 4 and <= 150 } && rule.executable == rule.executable.Trim().ToLowerInvariant() &&
        rule.executable.EndsWith(".exe", StringComparison.Ordinal) && !rule.executable.StartsWith('.') &&
        !Regex.IsMatch(rule.executable, "[<>:\"/\\\\|?*\\x00-\\x1f]") &&
        !new[] { "super productivity.exe", "focusguard.bridge.exe", "explorer.exe", "winlogon.exe", "csrss.exe", "dwm.exe", "taskmgr.exe" }.Contains(rule.executable);
}
record State(int version, string revision, long issuedAt, long expiresAt, string status, string[] domains,
    AppRule[]? apps = null, string[]? allowedDomains = null) {
    public static State Disconnected => new(1, "", 0, 0, "disconnected", [], []);
    public bool AppsActive => status == "tracking" && expiresAt > DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() && apps is { Length: > 0 };
}
record BrowserAck(string revision, string protection, long updatedAt);
record AppProtection(string status, string? detail = null, int pendingCount = 0, string? revision = null);
