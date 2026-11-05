<p align="center"><img src="assets/icon.svg" width="40" height="40" alt="禁止マーク"></p>

<h1 align="center">Task-linked Blocker</h1>

<p align="center"><strong>タスクを再生したら、気が散るサイトとアプリを自動でブロック。</strong></p>
<p align="center">Super Productivity用プラグイン · Windows 11 · 日本語 / English / 繁體中文</p>

<p align="center">
  <a href="#features">機能</a> · <a href="#usage">使い方</a> · <a href="#install">導入</a> ·
  <a href="#privacy">プライバシー</a> · <a href="#license">ライセンス</a>
</p>

![タグごとにサイト・許可サイト・アプリを登録する設定画面](docs/images/settings.jpg)

設定画面の表示例。

<a id="features"></a>
## できること

**タスクごとに、集中しやすい環境へ。** Super Productivityのタグに、ブロックするサイト・アプリを登録します。

- **再生でブロック、停止で解除。** タスクの切替やFocus Modeの休憩にも連動します。
- **ブラウザはそのまま使える。** 登録したサイトだけが対象。すでに開いているタブにも対応します。
- **サイトの一部だけ許可できる。** サブドメインを例外として登録できます。
- **複数タグに対応。** 禁止リストを合算し、許可サイトを優先します。
- **設定は自動保存。** 本体のテーマと言語に合わせて表示します。

タスク管理や時間計測は、Super Productivityのままです。

<a id="usage"></a>
## 使い方

1. **タグを選ぶ。** 本体にあるタグを「タグを追加」から選択。
2. **ブロックする対象を登録。** 「サイト」「アプリ」の＋から追加。
3. **タスクを再生。** そのタグに登録したルールが自動で有効になります。

| 登録するもの | 入力例 |
| --- | --- |
| サイトのドメイン | `example.org` |
| アプリの実行ファイル名 | `sample-app.exe`（架空のアプリ） |

たとえば `example.org` を禁止し、`reference.example.org` を許可すれば、そのサブドメインは利用できます。許可サイトはタグ右端の **︙** から追加できます。

設定内容は自動で保存されます。

<a id="install"></a>
## 導入

**動作確認環境：Windows 11 / Super Productivity 19.2.0 / Chrome 156**

アプリのブロックは強制終了です。未保存の作業内容は失われます。

現在は開発版です。[ビルド手順](docs/BUILD.md)で導入ファイルを生成してから、以下の2つを読み込みます。

| 導入先 | 読み込むもの | 操作 |
| --- | --- | --- |
| Chrome | `dist/extension` | `chrome://extensions` → デベロッパー モード →「パッケージ化されていない拡張機能を読み込む」 |
| Super Productivity | `dist/super-focus-guard.zip` | 設定 → プラグイン → ファイルを選択 → 有効化 |

本体のNode実行許可は、設定の保存とWindows補助機能の起動に使います。導入後は左メニューの「タスク連動ブロッカー」から設定できます。

Chrome拡張は手動導入です。ほかのChromium系ブラウザは、現時点では動作未確認です。

<a id="privacy"></a>
## プライバシー

**ブロックの処理と設定保存はPC内で完結します。** アカウントやクラウド接続は不要です。

- 設定はローカル保存。開発者への送信やアクセス解析はありません。
- ブラウザのタブ情報は、禁止サイトの判定と解除後の復帰に使います。
- キー入力・画面・クリップボードは取得しません。
- Windows補助機能は必要な計測中だけ起動し、停止・休憩で終了します。

権限と保存先の詳細は [データと権限](docs/PRIVACY.md)を参照してください。

## 不具合報告

[Issues](https://github.com/Show-Born-prog/super-productivity-task-linked-blocker/issues)へ、使用バージョンと再現手順をお知らせください。設定やスクリーンショットに個人情報が含まれていないか、投稿前に確認してください。

<a id="license"></a>
## ライセンスと謝辞

独自コードの公開ライセンスは [MIT案](docs/LICENSE-MIT.proposed.txt)を確認中です。

画面の外観にはSuper Productivity・Angular Material（MIT）、アイコンにはLucide（ISC）を使用しています。出典とライセンス全文は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)にまとめています。

本プロジェクトはSuper Productivity公式とは独立したプラグインです。
