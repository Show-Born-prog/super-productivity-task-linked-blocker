@echo off
"%~dp0bridge\FocusGuard.Bridge.exe" --install
set "taskBlockerSetupExit=%errorlevel%"
if errorlevel 1 (
  echo Setup failed. Stop the task and check the message above.
) else (
  echo Now load super-focus-guard.zip in Super Productivity and the extension folder in Chrome.
)
pause
exit /b %taskBlockerSetupExit%
