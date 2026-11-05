# 製品アイコン

ユーザーが選択したLucideの[ban](https://lucide.dev/icons/ban)。公式SVGの円・斜線・線幅を使い、グラデーションや影は付けない。原ライセンスは`NOTICE.txt`に同梱する。

- `icon.svg`：本体のメニューと設定画面用。`currentColor`で明暗テーマに合わせる。
- `../extension/icons/icon16.png`／32／48／128：Chrome用。元の円の内側だけ白、線は黒、外側は透明としてラスタライズ。暗いツールバーでも判別できる。Sharpで開発時に生成した静的ファイルで、製品に描画用ライブラリーや常駐処理を追加しない。
- 本体上部のヘッダーボタンAPIはMaterialのアイコン名だけを描画するため、標準の`block`を使う。SVGの差し込みや本体改変は行わない。

表示名は`scripts/build.mjs`の`productName`が共通元。本体・拡張のmanifest、画面・説明へ反映する。プラグインID・拡張公開鍵／ID・実行ファイル名・ローカル保存先は表示名から独立させ、改名しても既存設定や接続を維持する。

本体19.2.0の左メニューは`.plugin-svg-icon svg {fill:currentColor}`を適用する。rootだけのfill="none"はCSSに上書きされるため、circle・pathにもfill="none"を明示し、塗りつぶしの継承を防ぐ。再取得・差替え時もこの互換性を維持する。

rootの`task-linked-blocker-icon`は自分のナビ行だけを識別する。`plugin/navigation-appearance.mjs`はその行に限り、標準Materialアイコンと異なるテキストラッパーの配置を揃え、SVGを18pxへ縮小する。スタイル1枚だけを登録し、アンロード時に除去する。本体ファイル・他のメニュー・権限は変更せず、監視タイマーも追加しない。
