using System.Diagnostics;
using System.Text.Json;


if(args.Contains("--block-fixture")){
    if(args.Contains("--spawn-child")){
        var childPath=Path.Combine(Path.GetDirectoryName(Environment.ProcessPath!)!,"FocusGuard.OtherTest.exe");
        using var child=Process.Start(new ProcessStartInfo(childPath,"--block-fixture"){UseShellExecute=false,CreateNoWindow=true})!;
        Directory.CreateDirectory(".test-tmp");File.WriteAllText(".test-tmp/app-unregistered-child.pid",child.Id.ToString());
    }
    Thread.Sleep(Timeout.Infinite);return;
}
int passed=0;
void Check(bool condition,string name){if(!condition)throw new Exception(name);passed++;}
Check(!AppRule.Valid(new("explorer.exe")),"shell cannot be targeted");
try { System.Text.Json.JsonSerializer.Deserialize<AppRule>("{\"executable\":\"steam.exe\",\"mode\":\"warn\"}"); Check(false,"old runtime warning rule must not deserialize as a block"); } catch (System.Text.Json.JsonException) { Check(true,"old runtime warning rule is rejected"); }

var executable=Environment.ProcessPath!;var directory=Path.GetDirectoryName(executable)!;
var otherPath=Path.Combine(directory,"FocusGuard.OtherTest.exe");File.Copy(executable,otherPath,true);
Process Spawn(string path,string extra=""){return Process.Start(new ProcessStartInfo(path,"--block-fixture "+extra){UseShellExecute=false,CreateNoWindow=true})!;}
State Active()=>new(1,"native-apps",DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()+6000,"tracking",[],[new("focusguard.apptests.exe")]);
var childPidFile=Path.Combine(".test-tmp","app-unregistered-child.pid");File.Delete(childPidFile);
using var unrelated=Spawn(otherPath);using var existing=Spawn(executable,"--spawn-child");
Process? unregisteredChild=null;
try{
    var childReady=Stopwatch.StartNew();while(!File.Exists(childPidFile)&&childReady.ElapsedMilliseconds<3000)Thread.Sleep(20);
    Check(File.Exists(childPidFile),"test target spawned an unregistered child");
    unregisteredChild=Process.GetProcessById(int.Parse(File.ReadAllText(childPidFile)));
    var state=Active();
    var result=AppBlocker.Enforce(state,()=>state);
    Check(existing.WaitForExit(3000),"existing exact-name process is forcibly terminated without a window");
    Check(!unrelated.HasExited,"unregistered process is untouched");
    Check(!unregisteredChild.WaitForExit(150),"unregistered child survives termination of the target parent");
    Check(!Process.GetCurrentProcess().HasExited,"guard skips its own process even if configured name matches");
    using var added=Spawn(executable);Thread.Sleep(100);state=Active();AppBlocker.Enforce(state,()=>state);
    Check(added.WaitForExit(3000),"new process is terminated by the same rule");
    using var stopped=Spawn(executable);
    try{
        var inactive=Active() with{status="stopped"};AppBlocker.Enforce(inactive,()=>inactive);
        Check(!stopped.WaitForExit(150),"stopped task does not kill the target");
        state=Active();AppBlocker.Enforce(state,()=>inactive);
        Check(!stopped.WaitForExit(150),"stop rechecked immediately before kill");
        var changed=state with{revision="changed"};AppBlocker.Enforce(state,()=>changed);
        Check(!stopped.WaitForExit(150),"stale revision cannot terminate a target");
        var expired=state with{expiresAt=1};AppBlocker.Enforce(expired,()=>expired);
        Check(!stopped.WaitForExit(150),"expired state never kills the target");
    }finally{if(!stopped.HasExited)stopped.Kill();stopped.WaitForExit();}
}finally{
    if(!existing.HasExited)existing.Kill();if(!unrelated.HasExited)unrelated.Kill();existing.WaitForExit();unrelated.WaitForExit();
    if(unregisteredChild is not null){if(!unregisteredChild.HasExited)unregisteredChild.Kill();unregisteredChild.WaitForExit();unregisteredChild.Dispose();}
}
Console.WriteLine($"App guard: {passed} assertions passed; only dedicated test processes were terminated.");
