# Third-party notices

Task-linked Blocker is an independent, unofficial plugin for Super Productivity.
It is not affiliated with or endorsed by the upstream projects listed here.
Their names identify compatibility and sources; their licenses remain in force.

| Material | Source | License and notice |
| --- | --- | --- |
| Settings and task-row appearance, adapted HTML structure | [Super Productivity 19.2.0](https://github.com/super-productivity/super-productivity/tree/v19.2.0) | MIT; Copyright (c) 2018 Johannes Millan. Full text: [plugin/native/NOTICE.txt](plugin/native/NOTICE.txt). |
| Button, input, menu, switch and related component styles | Angular Material bundled with Super Productivity 19.2.0; [Angular Components](https://github.com/angular/components) | MIT; Copyright (c) 2026 Google LLC. Full text from the installed app's `3rdpartylicenses.txt`: [plugin/native/NOTICE.txt](plugin/native/NOTICE.txt). |
| Product prohibition icon and derived PNGs | [Lucide — ban](https://lucide.dev/icons/ban) | ISC; full upstream license, including its Feather notice: [assets/NOTICE.txt](assets/NOTICE.txt) and [extension/icons/NOTICE.txt](extension/icons/NOTICE.txt). |
| Unused comparison icons in `preview/identity-icons/` | [Lucide](https://lucide.dev/) and [Tabler Icons](https://tabler.io/icons) | [Lucide license](preview/identity-icons/LICENSE-lucide.txt), [Tabler MIT license](preview/identity-icons/LICENSE-tabler.txt). Comparison assets are not included in the product build. |

## Changes to reused material

- Host styles retain their component appearance. Angular scope placeholders are bound to local selectors; layout adjustments are kept in `plugin/ui.css`.
- The markup is connected to this plugin's controls. Angular/Formly execution code and the host's settings persistence are not bundled.
- The Lucide SVG adds an identifying ID and explicit `fill="none"` on its shapes for host compatibility. Chrome PNGs use black lines, a white circle interior and a transparent exterior.
- Fonts and the host's common theme stylesheet are referenced from the installed app. Font binaries and Super Productivity's executable are not redistributed here.

## Distribution

The build includes the full appearance and icon license texts in `NOTICE.txt`
beside the plugin, Chrome extension and helper. The appearance notice is also
embedded in the plugin HTML, and the Chrome icons retain their own notice.
Keep these notices when redistributing those materials.

The prebuilt Windows x64 ZIP includes the .NET/ASP.NET Core runtime. Its original
MIT licenses and third-party notices are copied from the exact runtime packages
used for publishing into `bridge/licenses/` (separate files for
`Microsoft.NETCore.App` and `Microsoft.AspNetCore.App`). These files must remain
with the distribution. Node.js is not redistributed; the plugin uses Super
Productivity's existing Node execution API. The developer build instead uses
the installed .NET runtime.
The README's example registrations are fictional. Reference projects' README
text, code and logos have not been copied into it.

The license for this project's original code is a separate decision; see the
[proposed MIT license](docs/LICENSE-MIT.proposed.txt). That proposal does not
replace or restrict any upstream license.
