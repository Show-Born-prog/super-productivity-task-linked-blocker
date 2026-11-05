# 本体の外観リソース

Super Productivity **19.2.0**のインストール済み`app.asar`から転用したスタイル。本体の共通テーマCSSはZIPへ重複格納せず、表示時に本体が読み込み済みのスタイルシートから参照する。

`components.css`は同梱Angular Materialのbutton、icon-button、form-field、select、icon、menu、pseudo-checkbox、slide-toggleと、本体のcollapsible、config-section、config-form、config-page、taskのコンポーネントスタイル。寸法・色・状態スタイルは変更せず、Angularの`%COMP%`スコープだけローカルの`fg-native-*`へ結び付けている。サイト・アプリの一覧はtaskの行構造・スタイルを使い、チェックボックス等の不要な操作は取り込まない。承認済みの配置調整は`../ui.css`に分離する。

ケバブメニューは本体Material menuとslide-toggleの外観を使い、`../rule-menu.mjs`が許可欄のオン・オフを扱う。スイッチは実際のbuttonを使い、`:enabled`による本体のハンドル配色も適用する。メニュー項目のcheckboxロールとaria-checkedで状態を読み上げ、Space／Enter・Escape・外側クリックを扱う。新規タイマーやプロセスは使わない。

タグメニューは見出しの本体Materialアイコンボタンから開く。本体のmenu／pseudo-checkboxの外観を使い、ブラウザ標準のPopoverで手前へ表示する。単一選択、矢印・Escape・外側クリック、画面内の配置を集中ガード側で扱う。開いている間だけスクロール・サイズ変更を監視し、閉じると解除する。空のフォーム補足欄は表示せず、入力間隔は本体のmargin-bottomを使う。

パーツのマークアップを`../native.mjs`で集中ガードの既存コントロールへ接続する。Angular／Formlyの実行コード、設定保存、本体サービスは取り込まない。本体の現在のCSS変数とアイコン読込状態を画面表示時に参照し、字体・テーマを合わせる。フォントは本体同梱の`media/`を参照する。

元のライセンスは`NOTICE.txt`。本体のindex.html上限を守るため、コンポーネントCSSはビルド時にgzipへ圧縮し、画面を開く際にブラウザ標準のDecompressionStreamで復元する。CSSの値・セレクターは変えない。JavaScriptは圧縮・難読化しない。ビルドとテストでHTMLを100000バイト以下に制限し、CSSの復元一致も検証する。

再抽出はプロジェクトルートで`node scripts/import-host-appearance.mjs`を実行する。本体を変更・実行せず、インストール済みASAR内のスタイル文字列だけを取り出す。別パスは引数で指定できる。本体の版を更新するときは、パーツの構造・テーマ変数・フォント参照を確認する。
