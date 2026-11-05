# ソースからビルドする

現行の開発版の導入手順です。配布ファイルを置くだけで導入する方式は、まだ実装していません。

## 必要なもの

- Windows 11
- [Node.js 20.15以上](https://nodejs.org/en/download)
- [.NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0)（補助機能の実行に必要な.NET／ASP.NET Coreランタイムも含む）
- [Git](https://git-scm.com/downloads)

## ビルド

使い続ける場所でPowerShellを開き、実行します。すでに本プラグインを利用中の場合は、先にタスクを停止してください。

```powershell
git clone https://github.com/Show-Born-prog/super-productivity-task-linked-blocker.git
cd super-productivity-task-linked-blocker
npm run build
```

追加のnpmパッケージのインストールは不要です。

```text
dist/
├── super-focus-guard.zip   # Super Productivityへ読み込む
├── extension/             # Chromeへ読み込む
└── bridge/                # 補助機能。プラグインから自動起動
```

**ビルドしたフォルダーは、その場所に置いたまま使ってください。** 現行版は補助機能と設定の場所をビルド時に決めるため、ZIPだけを別のPCやフォルダーへ移しても使えません。

生成後は [READMEの導入手順](../README.md#install)へ進みます。最初はタスクを停止してから再生し、登録したサイトが遮断され、停止で解除されることを確認してください。

## 更新・移動・削除

- **更新：** タスクを停止し、同じ場所で再ビルドしてZIPを再導入。Chrome側も `chrome://extensions` で拡張を再読み込みします。
- **移動：** `.local/runtime/` をバックアップし、移動先で再ビルド・再導入します。設定も移動先へ引き継いでください。
- **削除：** タスクを停止し、本体プラグインとChrome拡張を削除。設定も消す場合は、バックアップ後に `.local/runtime/` を削除します。

## 起動時に動かない場合

- 本体・プラグインの読込直後は、タスクをいったん停止して再生してください。
- .NET／ASP.NET Core 10の有無、ビルドしたフォルダーの場所、ポート47821の競合を確認してください。
- 接続状態はプラグイン最下部の「状態」から確認できます。

## 開発時の検証

```powershell
npm test
npm run test:native
```

`test:native` はWindows上の実.NET補助機能と架空データで行う試験です。本体やChromeを操作する実機試験とは区別します。
