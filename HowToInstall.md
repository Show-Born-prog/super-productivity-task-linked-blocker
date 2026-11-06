# タスク連動ブロッカーのインストール

Windows 11（x64）とSuper Productivityが必要です。

1. ダウンロードしたZIPを右クリックし、**すべて展開**します。
2. 展開した`extension`内の`Setup.cmd`を一度実行します。「setup complete」が出たら閉じます。
3. Chromeで`chrome://extensions`を開き、**デベロッパー モード**をオン → **パッケージ化されていない拡張機能を読み込む** → 展開した`extension`フォルダーを選びます。
4. Super Productivityの**設定 → プラグイン**から`super-focus-guard.zip`を読み込み、有効にします。Node実行の許可は、設定保存とWindowsアプリ遮断用の補助機能の起動に使います。

左メニューの「タスク連動ブロッカー」で、タグとブロックするサイト・アプリを登録します。設定は自動保存され、タスク再生でブロック、停止で解除されます。アプリのブロックは強制終了です。

展開フォルダーは利用中そのまま残してください。更新・移動はタスク停止後に行い、新しい場所の`extension/Setup.cmd`を再実行して、本体プラグインとChrome拡張を読み込み直します。登録済みの設定は保持されます。

## English

Requires Windows 11 x64 and Super Productivity.

1. Right-click the downloaded ZIP and choose **Extract All**.
2. Run `Setup.cmd` inside the extracted `extension` folder once. Close it after “setup complete” appears.
3. Chrome: open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the extracted `extension` folder.
4. Super Productivity: **Settings → Plugins**, load `super-focus-guard.zip`, and enable it. Allow Node execution for saving local settings and starting the Windows app-blocking helper.

Open Task-linked Blocker from the sidebar and add sites or apps to a tag. Settings save automatically. Play a task to block; stop it to unblock. Blocked apps are force-terminated.

Keep the extracted folder. Stop the task before updating or moving it, rerun `extension/Setup.cmd` in the new location, then reload the plugin and select the new extension folder. Existing settings are kept.

## 繁體中文

需要 Windows 11 x64 與 Super Productivity。

1. 在下載的 ZIP 上按右鍵，選擇**全部解壓縮**。
2. 執行解壓縮後`extension`資料夾內的`Setup.cmd`一次，出現「setup complete」後關閉。
3. Chrome：開啟`chrome://extensions`，啟用**開發人員模式** → **載入未封裝項目** → 選取解壓縮後的`extension`資料夾。
4. Super Productivity：**設定 → 外掛程式**，載入`super-focus-guard.zip`並啟用。Node 執行權限用於儲存本機設定及啟動 Windows 應用程式封鎖輔助程式。

從側邊欄開啟「工作連動封鎖工具」，為標籤加入要封鎖的網站或應用程式。設定會自動儲存；開始工作時封鎖，停止時解除。被封鎖的應用程式會強制結束。

使用期間請保留解壓縮後的資料夾。更新或移動前先停止工作，在新位置重新執行`extension/Setup.cmd`，再重新載入外掛並指定新的擴充功能資料夾。既有設定會保留。
