# Super Productivity 20.0.0 compatibility — 2026-11-14

## Scope

The user requested updating the installed desktop app, checking the existing blocker,
repairing any incompatibility, and connecting this Codex client through local MCP.
No cloud sync setup, public publishing, or GitHub push is part of this request.

## Update and recovery

- Installed app before the update: 19.2.0, read from the installed ASAR package metadata.
- Latest official stable release checked on 2026-11-14: 20.0.0.
- Downloaded the official x64 NSIS installer. Its SHA-256 matched the release asset:
  `246b5e0ab1b2aa495353e2bcbeadb763747ecec90ae007f6273d24a5f0346350`.
- Authenticode status was Valid, signer SignPath Foundation.
- Installer exited with code 0; installed package metadata and the running app's
  settings footer both identify 20.0.0.
- Before launching the new app, backed up the closed app's complete profile and
  the blocker runtime under ignored `.local/backup-before-sp20-20261114/`.
  These contain private data and must never enter Git or release archives.

## Verification completed

- Live desktop: the pre-existing enabled blocker loads, shows version 0.11.0,
  and displays its existing tag rule and `example.org` entry. No visible layout
  regression was observed at the existing 800-pixel window width.
- Repository source remains version 0.11.3. Do not describe the newer source-only
  tests as tests of the exact 0.11.0 ZIP installed in the daily profile.
- JavaScript tests: 76 passed, 0 failed.
- Windows native tests with real helper processes: 3 passed, 0 failed. This covers
  12 dedicated app-guard assertions, demand launch, task/tag transitions, normal
  stop/break exit, rapid restart, stale leases, and atomic publication conflicts.
  Super Productivity and Chrome APIs are simulated in these tests.
- The initial restricted native run failed on NuGet configuration access and a
  denied local socket connection. Re-running with the needed process/network
  access passed all three tests; these failures were not plugin incompatibilities.
- Installed 20.0.0 source inspection: task-update payload still provides `taskId`
  and the full `task`; the five focus-session/break action strings consumed by
  the blocker are unchanged.

## Remaining checks

- Live desktop task play/stop/break and real Chrome acknowledgement.
- Live setting save and reload with the original blocker rules restored afterward.
- User must enable assistant access, choose permissions and generate the key in
  Super Productivity. No permission or key-generation control was automated.
- Configure Codex only after checking the copied key against the local endpoint.
  Do not print the credential, put it into the repository, or save it in reports.
- MCP handshake, allowed tool list, status and a single clearly labelled Inbox
  capture test; Codex restart is required to load a newly configured MCP server.

## Sources

- https://github.com/super-productivity/super-productivity/releases/tag/v20.0.0
- https://github.com/super-productivity/super-productivity/blob/v20.0.0/docs/wiki/2.23-Connect-an-AI-Assistant.md
- https://learn.chatgpt.com/docs/extend/mcp?surface=cli
