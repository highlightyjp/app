# 占い（Almanac）

単一HTML（`index.html`）で動くブラウザ完結型の占いアプリ。サーバー・外部通信・APIキーを使わない。

- 準拠: アプリ作成 統一指示書 v4（`docs/app-build-guide_v4.md`）。§1 単一HTML、§2-1 既存仕様は凍結、§5 トークン・ダークモード、§6 外部依存ゼロ
- 機能: 今日の運勢（おみくじ・数秘術）、星座占い、四柱推命、九星気学、タロット、周易、ルーン、手相、姓名判断（字画辞書 `kaku` 内蔵）、血液型
- 保存: プロフィール・下書きは端末の localStorage のみ（正本は持たない）
- 既存公開版: https://claude.ai/artifact/PvUJ1GZAyrhbV6CK1huzwZ（表示名 Almanac）

## 中身を変えていない点

`index.html` は、公開版（Artifact PvUJ1GZAyrhbV6CK1huzwZ、版 1789789022-1298）をそのまま取り込んだもの。
SHA-256: `dd67475b9d5c788af64d3505110b28bef7320ef92d30a83491d8cac3b1f9a9f8`（189,382 バイト）。
ロジック・定数・UI は変更していない（§2-1）。

## 検証

| 項目 | 結果 | 区分 |
| --- | --- | --- |
| script ブロック 5 件の構文 | `node --check` で全件 OK | 実測（2026-10-21） |
| 外部参照 | SVG 名前空間（`http://www.w3.org/2000/svg`）のみ。外部スクリプト・CSS・フォントなし | 実測 |
| jsdom スモーク | タイル 10 件、ページエラー 0 件（`tests/smoke.js`） | 実測（jsdom。実ブラウザ・CSP 非再現） |
| iPhone Safari 実機 | 未確認 | 未確認 |
| Apple HIG 準拠 | 未確認（一次情報を取得していない） | 未確認 |
| 字画辞書の網羅 | JIS 第1・第2水準の範囲。異体字・部首 罒 等は既知の限界（過去セッションの報告）。 | 既知の限界 |

テスト実行: `npm i jsdom@24` の後、`node tests/smoke.js`。

## 注意

- 占いの結果は娯楽目的。医療・投資・法律の判断に使わない。
- 個人情報（生年月日・出生時刻・性別・血液型）は端末内に保存される。共有端末では消去すること（プロフィールの「消去」）。
- 公開範囲（リンクを知っている全員／本人のみ）は公開先の表示で確認する。

## GitHub Pages 公開

- 配信元: `.github/workflows/pages-uranai.yml`。`apps/uranai/index.html` のみを Pages のルートに配置する（tests は含めない）。
- 公開URL（予定）: https://highlightyjp.github.io/app/
- 有効化（オーナーの操作が必要）: リポジトリ Settings → Pages → Build and deployment → Source を「GitHub Actions」に設定する。Claude 側からは GitHub API が遮断されており、設定できない。
- 未確認: プライベートリポジトリでの Pages 利用には GitHub の有料プランが必要な場合がある（プラン条件は未確認）。有効化後、このURLを開いて表示を確認すること。
- 注意: Pages は公開配信のため、リポジトリ内のソース（HTML）は誰でも閲覧できる。個人データは端末内にのみ保存される（前述）。
