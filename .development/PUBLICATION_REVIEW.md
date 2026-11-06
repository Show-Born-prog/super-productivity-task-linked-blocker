# 公開前の確認

確認日：2026-11-06。GitHubリポジトリは **private**。ユーザーの明示指示により、最新変更のpushと配布ZIP添付、および非公開リポジトリ内での下書きReleaseの確定を行う。MIT採用版0.11.3を非公開リポジトリ内の最新Releaseとして用意する。publicへの変更、ストア申請、本家への申請は行わない。

## 公開前の最終確認（2026-11-06）

- 対象は送信済みmainの19コミット、v0.11.2タグ、到達可能な268個のファイル内容と今回の修正差分。コミット作者はGitHubのnoreplyアドレスのみ。ローカルの旧masterは送信対象外。GitHubのIssue／PR、Actions実行、Actions添付生成物はいずれも0件。
- 既知の認証トークン・秘密鍵・認証付きURL・個人メール・ユーザーパスを検索し、ファイル構成と候補を目視確認した。個人設定・タスクDB・活動履歴・ブラウザーのプロファイル・キャッシュ・ビルド生成物の追跡は見つからなかった。拡張の公開鍵はID固定用で、秘密鍵ではない。
- 履歴中の開発パスは`D:\Projects\Focus-Tools`、`C:\Users\user`という一般的なパス例。現在の開発プレビュー説明は環境変数へ一般化した。過去の記述を消すための履歴書換えはしていない。画像はサンプル登録のみで、過去の画面例も確認した。
- 実際のGitHub添付ZIPを取得し、配布ダイジェストと一致を確認。Windows ZIP APIで外側362ファイルと内側のプラグイン8ファイルを列挙・展開。直下1フォルダー／内部3項目、版0.11.2、3言語、HTML上限、パス逸脱なし、PDB・設定・ログ・Setup.cmd・別添.sha256なしを確認した。330個のDLLとcreatedump.exeは同梱.NETランタイムを含む構成で、個人ファイルではない。
- 配布内THIRD_PARTY_NOTICES.mdに、ソースツリー向けの相対リンクが残っていた。全文ライセンスは既に同梱済み。リンクを配布内NOTICE／icons/NOTICEと、同じ版のGitHub出典へ修正し、配布試験に実在確認を追加した。現在のRelease差替え用ZIPは元の配布物からこの文書だけを変更し、プラグイン・拡張・Windows補助・ランタイムの内容は保持した。
- README3言語・導入文書を含むMarkdown14文書のローカルリンク／アンカー45か所に欠落なし。HowToInstall.mdの内容と配布内の実ファイル名が一致。Super Productivity・Angular・Lucideの原文と.NETのライセンス／第三者表記4文書を保持。ランタイムの第三者表記中の作者メールは著作権表記として残す。
- JS76件、配布ビルド、修正版ZIPの配布3件が合格。Windows実補助＋模擬本体／Chromeで、両導入順・許可例外・休憩／停止・移動後の再登録を確認した。初回の制限環境ではPC内接続がEACCESとなり、許可された実行環境で再試験して合格。ライセンスのリンク確認も旧ZIPで失敗を再現後、修正ZIPで合格した。日常データへの操作と本体／Chromeへの再導入は行っていない。
- **独自コードのライセンスはMIT採用済み（2026-11-06ユーザー決定）。** 下記の正式なLICENSEと配布への同梱に反映する。非公開設定は維持し、今回の確認をpublic化の承認とは扱わない。この検索・目視・試験で確認した範囲を超える完全な漏洩保証とはしない。

## 本家のライセンス・公開方法

| 対象 | 確認した一次資料 | 判断・対応 |
| --- | --- | --- |
| Super Productivity | [19.2.0のLICENSE](https://github.com/super-productivity/super-productivity/blob/v19.2.0/LICENSE)、[現行LICENSE](https://github.com/super-productivity/super-productivity/blob/master/LICENSE)、インストール済み19.2.0のpackage.json | いずれもMIT。複製・変更・配布等が許され、著作権表示と許諾文の保持が条件。外観の転用部分へ原文を保持する。MIT本文には個別の公開申請・許可料の条件はない。 |
| プラグインの配布 | [19.2.0の開発ガイド](https://github.com/super-productivity/super-productivity/blob/v19.2.0/docs/plugin-development.md)、[現行ガイド](https://github.com/super-productivity/super-productivity/blob/master/docs/plugin-development.md#contributing) | 独立したZIPの手動導入が案内されている。本体のCommunity Pluginsへの掲載は別のPR申請。現行の直接導入用エントリにはリリースURL・版・SHA-256等があり、10MB上限等の検査がある。GitHubで独立公開することと本家掲載を同一視しない。掲載自体も本家によるコードレビュー・安全性保証ではない。 |
| ブランド | [本家Press Kit](https://super-productivity.com/press-kit/)、上記LICENSE・ガイド | 確認した資料の範囲で独立プラグインのGitHub公開に別途承認を必須とする記載は見つからなかった。資料の不在を包括的な商標利用許諾と解釈しない。本家ロゴを製品ロゴに使わず、自作の名称とLucideの禁止マークを使用。非公式・非提携をREADMEに明記する。 |
| Angular Material | インストール済み19.2.0内 `.tmp/angular-dist/3rdpartylicenses.txt` の `@angular/material`、[公式LICENSE](https://github.com/angular/components/blob/main/LICENSE) | MIT、Copyright (c) 2026 Google LLC.。実際に同梱されたライセンス全文をNOTICEへ収録。本家19.2.0のlockfileでは21.2.12。現在のmainを実機版と同一扱いしない。 |
| 製品アイコン | [Lucide公式LICENSE](https://github.com/lucide-icons/lucide/blob/main/LICENSE)、[ban SVG](https://github.com/lucide-icons/lucide/blob/main/icons/ban.svg) | ISC。原ライセンスとFeatherに関する付記を維持。SVGのID・fillとPNGへの変換を出典一覧へ記載。 |
| 比較用アイコン | `.development/preview/identity-icons/`の既存ライセンス | Lucide ISC／Tabler MITを保持。製品配布へは含めない。 |

本家サイトのプライバシーポリシーは、本家の処理を説明するものとして区別する。本プラグイン自身の権限・保存先・通信は実装を確認してREADMEへ説明する。名称が似た別事業者のサイトは根拠に使用していない。

## 独自コードのライセンス

**2026-11-06、ユーザーがMIT採用を明示承認。** 正式な本文はルートの[LICENSE](../LICENSE)。著作権者は公開用のGitHub名Show-Born-prog。提案ファイルは廃止し、第三者素材の許諾はそのまま保持する。

MITは著作権・許諾文の保持を条件に、利用・改変・再配布・商用利用を広く許す。改変版のソース公開義務を課さない。独自コードへこの権利を与える判断は作者が行う。[GitHubのライセンス案内](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)でも、公開しただけでは通常のOSS利用許諾にならないと説明されている。

package.jsonはlicense: MITとし、README3言語と第三者表記を正式なMIT表記へ統一する。配布の3項目構成を保ち、本体ZIP・拡張・補助へLICENSE.txtを同梱する。ライセンス採用をリポジトリのpublic化の承認とは扱わない。通常／配布ビルド、JS76件、配布3件で原文同梱・配布構成・両導入順の動作を確認した。

## READMEの参考にしたリポジトリ

実際にGitHubのREADME本文とリポジトリAPIを取得して確認した。スター数は確認時点の値で、文面・画像・ロゴは転用していない。

| リポジトリ | スター | 参考にした構成 |
| --- | ---: | --- |
| [Super Productivity](https://github.com/super-productivity/super-productivity) | 23,421 | 冒頭の用途説明、画面例、導入導線、機能一覧、関連資料へのリンク |
| [PowerToys](https://github.com/microsoft/PowerToys) | 140,594 | 冒頭のナビゲーション、対応環境と導入を分かりやすく分離、詳細を折りたたむ構成 |
| [uBlock Origin](https://github.com/gorhill/uBlock) | 69,108 | ブラウザごとの対応状況、権限、制限、使い方への導線を明示する構成 |

他のプロジェクトのスターやCI成功を、本プロジェクトの実績に見せるバッジは付けない。開発経緯・旧版ごとの説明は公開用READMEへ載せない。

READMEは用途・基本操作・最小限の導入手順に絞る。ビルド用ページへの案内は削除し、配布する説明書を`HowToInstall.md`に統一する。サイトの登録例はexample.org等、アプリは架空名を使い、画面例も一致させる。細かな編集操作、検討中に比較した別製品名、長い制限・免責の列挙は載せない。データ損失に直結する強制終了と、確認済みの環境は明示する。

## ビルド不要の配布

一般利用者向けには、[GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)等でビルド済みファイルを配布する案を推奨する。PowerToysはインストーラー、本家は各種ダウンロード導線を用意している。ソースビルドだけを唯一の公開形態とする必要はない。

配布版は初回セットアップで補助の配置先を記録する。本体ZIPに開発PCのパスを含めず、Windows x64用.NET／ASP.NET Coreランタイムを同梱する。ランタイム10.0.11の取得元は公式NuGetの`Microsoft.NETCore.App.Runtime.win-x64`／`Microsoft.AspNetCore.App.Runtime.win-x64`。各パッケージのMIT原文と第三者表記を`site-blocker-extension/bridge/licenses/`へそのまま収録する。ZIP直下はtask-linked-blockerフォルダー1つで、その中はtask-linked-blocker-plugin.zip・site-blocker-extension・HowToInstall.mdだけとし、公開前レビュー用の資料は配布ZIPへ入れない。配布ZIPを検証し、非公開リポジトリのReleaseへ添付する。別添の.sha256は生成・添付しない。根拠：[Microsoftの配布方式](https://learn.microsoft.com/en-us/dotnet/core/deploying/)。

## 公開前に残ること

- 検証済み配布ZIPをReleaseへ添付し、READMEにReleasesへのリンクを置く。非公開リポジトリ内でのRelease確定はユーザーが許可済み。リポジトリのpublic化は別の明示指示を待つ。
- READMEは英語を標準とし、docs/README.ja.md・docs/README.zh-TW.mdへ見出し付近のリンクから切り替える。
- 公開設定を変える直前に、送信するコミット・ファイル・履歴を再確認する。`.local/`、`.research/`、`.test-tmp/`、`dist/`、個人ルール・認証情報は含めない。
- 本家の更新に追従する場合は、転用した外観の出典・ライセンスと対応環境を確認する。
- 公開設定の変更、push、Releaseやストア掲載は、ユーザーの別の明示指示を受けて行う。

これは上記の一次資料と現在の同梱物の確認記録であり、公開先や将来の変更を含む包括的な法的適合性を保証するものではない。
