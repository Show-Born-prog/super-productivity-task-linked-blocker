# ソースからビルドする

開発者向けの手順です。通常の導入は、ビルド済みZIPと[導入手順](INSTALL.md)を使えます。

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

**この開発用ビルドは、その場所に置いたまま使ってください。** 開発用の設定は`.local/runtime/`に残し、配布版の設定とは分離します。他PCへ渡す場合は、次の配布用ビルドを使います。

Chromeへ`dist/extension`、本体へ`dist/super-focus-guard.zip`を読み込みます。最初はタスクを停止してから再生し、登録したサイトが遮断され、停止で解除されることを確認してください。

## ビルド済み配布ZIPを作る

```powershell
npm run package
npm run test:package
```

`dist/task-linked-blocker-バージョン-win-x64.zip`とSHA-256ファイルを生成します。Windows 11 x64向けで、必要な.NET／ASP.NET Coreランタイムとそのライセンス、初回セットアップ、Chrome拡張、本体用ZIPを同梱します。初回ビルドは公式NuGetからランタイムを取得するため、ネット接続が必要です。npmの追加パッケージは使いません。

配布版の本体ZIPには、開発PCの絶対パスを埋め込みません。補助機能の場所はセットアップ時に記録し、設定はユーザーフォルダーの`.task-linked-blocker/runtime/`へ保存します。作業フォルダーの設定や履歴は同梱しません。生成だけではGitHubへのアップロードや公開は行いません。

`test:package`は配布ZIPを試験専用の別フォルダーへ展開し、初回設定・設定移行／保持・実補助の起動・遮断／許可例外・休憩／停止終了・配置先変更を検査します。Super ProductivityとChromeのAPIは模擬し、日常設定を変更しません。

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
