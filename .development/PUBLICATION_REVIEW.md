# 公開前の確認

確認日：2026-11-06。GitHubリポジトリは **private**。ユーザーの明示指示により、最新変更のpushと配布ZIP添付、および非公開リポジトリ内での下書きReleaseの確定を行う。0.11.2を最新の通常リリースとして登録し、Releases欄へ表示する。publicへの変更、ストア申請、本家への申請は行わない。

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

## 独自コードのライセンス案

**MITを推奨。作者確認待ちで、まだ採用していない。** [提案文](LICENSE-MIT.proposed.txt)は許諾を発効させる `LICENSE` ではない。既存の第三者素材の許諾は有効なまま。

MITは著作権・許諾文の保持を条件に、利用・改変・再配布・商用利用を広く許す。改変版のソース公開義務を課さない。独自コードへこの権利を与える判断は作者が行う。[GitHubのライセンス案内](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)でも、公開しただけでは通常のOSS利用許諾にならないと説明されている。

承認後にのみ、提案文のMIT本文をルートの `LICENSE` とし、package.jsonのlicenseを設定し、READMEの「提案中」表示を確定表記へ替える。ライセンス未確定のまま「MITのOSS」と告知しない。

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

配布版は初回セットアップで補助の配置先を記録する。本体ZIPに開発PCのパスを含めず、Windows x64用.NET／ASP.NET Coreランタイムを同梱する。ランタイム10.0.11の取得元は公式NuGetの`Microsoft.NETCore.App.Runtime.win-x64`／`Microsoft.AspNetCore.App.Runtime.win-x64`。各パッケージのMIT原文と第三者表記を`site-blocker-extension/bridge/licenses/`へそのまま収録する。ZIP直下はtask-linked-blockerフォルダー1つで、その中はtask-linked-blocker-plugin.zip・site-blocker-extension・HowToInstall.mdだけとし、公開前レビュー用の資料は配布ZIPへ入れない。配布ZIPとSHA-256を検証し、非公開リポジトリのReleaseへ添付する。根拠：[Microsoftの配布方式](https://learn.microsoft.com/en-us/dotnet/core/deploying/)。

## 公開前に残ること

- 作者がREADMEの内容と独自コードのMIT採用を確認する。
- 検証済み配布ZIPとSHA-256をReleaseへ添付し、READMEにReleasesへのリンクを置く。非公開リポジトリ内でのRelease確定はユーザーが許可済み。リポジトリのpublic化は別の明示指示を待つ。
- READMEは英語を標準とし、docs/README.ja.md・docs/README.zh-TW.mdへ見出し付近のリンクから切り替える。
- 公開設定を変える直前に、送信するコミット・ファイル・履歴を再確認する。`.local/`、`.research/`、`.test-tmp/`、`dist/`、個人ルール・認証情報は含めない。
- 本家の更新に追従する場合は、転用した外観の出典・ライセンスと対応環境を確認する。
- 公開設定の変更、push、Releaseやストア掲載は、ユーザーの別の明示指示を受けて行う。

これは上記の一次資料と現在の同梱物の確認記録であり、公開先や将来の変更を含む包括的な法的適合性を保証するものではない。
