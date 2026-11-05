using System.ComponentModel;
using System.Diagnostics;

// No window matching: a block rule applies to the exact executable name only.
// The process handle is acquired before revalidation so PID reuse cannot redirect Kill.
static class AppBlocker {
    internal static AppProtection Enforce(State snapshot,Func<State> read) {
        if (!snapshot.AppsActive) return new("idle",revision:snapshot.revision);
        var errors=0;var pending=0;
        foreach(var rule in snapshot.apps!) {
            if (!AppRule.Valid(rule)) {errors++;continue;}
            foreach(var process in Process.GetProcessesByName(rule.executable[..^4])) {
                using(process) {
                    try {
                        if(process.Id==Environment.ProcessId || process.HasExited) continue;
                        _=process.Handle;
                        var current=read();
                        if(!current.AppsActive || current.revision!=snapshot.revision ||
                            !current.apps!.Any(a=>a.executable==rule.executable))
                            return new("updating",revision:current.revision);
                        if(!string.Equals(process.ProcessName+".exe",rule.executable,StringComparison.OrdinalIgnoreCase)) continue;
                        process.Kill(); // Deliberately do not kill an unregistered child process tree.
                        if(!process.WaitForExit(0))pending++;
                    } catch(InvalidOperationException) { } // Already exited.
                    catch(Exception e) when(e is Win32Exception or NotSupportedException) {errors++;}
                }
            }
        }
        return errors>0 ? new("error","強制終了できない対象があります。対象アプリとの権限の違い等を確認してください。",pending,snapshot.revision) :
            new("monitoring",pending>0 ? "対象プロセスの終了処理中です。" : null,pending,snapshot.revision);
    }
}
