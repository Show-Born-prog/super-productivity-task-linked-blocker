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

## Live desktop verification completed

- Used only the existing disposable task `【検証用】Bのみ`, which already carried
  the blocker test tag. Its test-only tracked time increased during the check;
  no ordinary task was timed or edited.
- Started its focus session: the real installed plugin published `tracking` and
  `example.org`; the real Chrome extension acknowledged the same revision with
  `protection: active`. A Chrome navigation to `https://example.org` returned
  `net::ERR_BLOCKED_BY_CLIENT`.
- The internal extension block page could not be inspected through Browser Use's
  URL policy; no alternate surface or protocol was used to inspect it. The
  navigation error and revision-matched real extension acknowledgement are the
  evidence for blocking, not an inspected block-page screenshot.
- Completed the focus session to enter a short break: the plugin published
  `break` with no domains, Chrome acknowledged `idle` at that revision, and the
  real Windows helper exited.
- Skipped the break: tracking and Chrome's matching `active` acknowledgement
  resumed. Cancelled the session: `stopped`, empty domains, matching `idle`
  acknowledgement, and zero helper processes were observed.
- Edited the disposable rule through the real plugin UI from `example.org` to
  `compatibility.example.org`; verified its automatic save in the runtime file.
  Left the view for Inbox and reopened it; the changed value reappeared. Restored
  `example.org` through the UI. The final rules file matched the pre-test backup
  byte-for-byte (SHA-256 comparison).
- No compatibility defect requiring a product-code or package change was found.
  The Windows app-termination path was tested with the real helper in the native
  suite, not by adding an app rule to the daily profile.

## MCP connection completed

- The user enabled assistant access, granted `tasks:read` and `tasks:capture`,
  generated the access key and reported copying it. Key-generation and permission
  controls were not automated. Task-note reading remains ungranted.
- Read the copied credential without printing it, then verified the actual local
  MCP endpoint with `initialize`, `tools/list` and `get_status`. Negotiated protocol
  `2025-11-25`; server `super-productivity` reported ready.
- Available tools: `get_status`, `list_tasks`, `get_task`, `list_projects`,
  `list_tags`, `create_task`.
- Added one `mcp_servers.super-productivity` section to the existing user Codex
  configuration, preserving its other contents. It uses the loopback URL and
  `bearer_token_env_var = "SP_ASSISTANT_KEY"`, with the six tools allowlisted.
  Stored the credential in the user's environment, not in the config or repo.
- `codex mcp get super-productivity --json` parsed the configuration successfully
  and reported the server enabled. Verified there is exactly one configuration
  section and no access-key literal in the configuration.
- Registered one Inbox task, `【接続確認】Codex MCP 2026-11-14`, via the actual MCP
  `create_task` tool and read it back through `list_tasks`; result was `created`,
  Inbox project, no tags and no tracked time. Left this clearly labelled task for
  the user to inspect. No duplicate was created.
- A fresh `get_status` request after the UI checks still reported ready with the
  same two scopes. Credentials were not printed, included in reports or committed.

## User restart remaining

Codex must be fully closed and reopened to inherit the new user environment
variable and load the new MCP server into its tool list. This running chat's tool
registry has not been hot-reloaded. The endpoint, credentials, configuration and
actual task capture were verified separately; post-restart tool discovery in
Codex itself remains for the next session.

## Sources

- https://github.com/super-productivity/super-productivity/releases/tag/v20.0.0
- https://github.com/super-productivity/super-productivity/blob/v20.0.0/docs/wiki/2.23-Connect-an-AI-Assistant.md
- https://learn.chatgpt.com/docs/extend/mcp?surface=cli
