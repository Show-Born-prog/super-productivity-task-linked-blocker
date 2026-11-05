# Task-linked Blocker — 導入

Windows 11（x64）向け。Node.js・Git・.NETの別途インストールやビルドは不要です。

1. 配布ZIPを、使い続けるフォルダーへ**すべて展開**します。
2. `Setup.cmd`を実行します。管理者権限は不要です。「setup complete」が出たら閉じます。
3. Chromeの`chrome://extensions`でデベロッパー モードをオンにし、「パッケージ化されていない拡張機能を読み込む」から`extension`フォルダーを選びます。
4. Super Productivityの設定 → プラグインで`super-focus-guard.zip`を読み込み、有効にします。Node実行の許可は設定保存と補助機能の起動に使います。

左メニューの「タスク連動ブロッカー」で、タグと遮断対象を登録します。

## 更新・移動・削除

- **更新：** タスクを停止し、数秒待ってから新しい配布ZIPを展開して`Setup.cmd`を実行。本体ZIPを再導入し、Chrome拡張も新しい`extension`フォルダーへ読み替えます。登録済みルールは引き継がれます。
- **移動：** タスク停止後にフォルダーを移し、移動先の`Setup.cmd`を実行。Chrome拡張は移動先のフォルダーを読み直します。
- **削除：** タスク停止後、本体プラグインとChrome拡張を削除し、展開フォルダーを削除します。設定も消す場合は、ユーザーフォルダー内の`.task-linked-blocker`を削除します。

セットアップは置き場所をPC内に記録するだけです。Windowsサービスや自動起動を追加しません。展開フォルダーは利用中そのまま残してください。

## 開発版から設定を移す場合

タスク停止後に、展開先で以下を一度実行します。既存の移行先設定は上書きしません。`rules.json`以外の古い状態は引き継ぎません。

```powershell
.\bridge\FocusGuard.Bridge.exe --install --import-rules '以前の開発フォルダー\.local\runtime\rules.json'
```

## English

Windows 11 x64. No build tools or separate .NET installation required.

1. Extract the entire release ZIP to a permanent folder. Run `Setup.cmd` (no administrator access required).
2. Chrome: open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select the `extension` folder.
3. Super Productivity: Settings → Plugins → load `super-focus-guard.zip`, enable it, and allow Node execution for local settings and helper startup.

Keep the extracted folder. Stop the task before updating or moving it, rerun setup in the new folder, then reload the plugin and select the new extension folder. Settings remain in `%USERPROFILE%\.task-linked-blocker`.

## 繁體中文

適用於 Windows 11 x64，不需自行編譯或另外安裝 .NET。

1. 將配布 ZIP **完整解壓縮**至固定資料夾，執行 `Setup.cmd`，不需要系統管理員權限。
2. Chrome：開啟 `chrome://extensions`，啟用開發人員模式，選擇「載入未封裝項目」，指定 `extension` 資料夾。
3. Super Productivity：設定 → 外掛程式，載入 `super-focus-guard.zip` 並啟用。Node 執行權限用於本機設定儲存及輔助程式啟動。

請保留解壓縮後的資料夾。更新或移動前先停止工作，在新位置重新執行設定，再重新載入外掛並指定新的擴充功能資料夾。設定保留於 `%USERPROFILE%\.task-linked-blocker`。
