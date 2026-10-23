# 占い（Almanac）V3

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

## V2 更新（統一指示書 v5、2026-10-22）

- データ schema v1: 保存キーを `uranai:profile:v1` / `uranai:birth:v1` / `uranai:ui:v1` に変更（`v: 1` を持つ）。
- 移行: 旧キー（`uranai:profile` / `uranai:birth` / `uranai:ui`）は削除せず残す。v1 がなければ旧キーから写しを作る。
- NORM: 保存・読込・消去のすべてで正規化（不正値は空、未知のキーは破棄）。
- 読込失敗時（v1 が壊れている等）は保存を停止し、既存データを上書きしない。「プロフィールを消去」で初期化できる。
- 版表示: 外観タブの末尾に「V2」を表示。
- 計算ロジック・定数・画面構造は変更していない（差分は保存・読込・消去・外観保存・版表示のみ）。
- 旧版: `versions/index_v1_pre-schema.html`（ロールバック用）。
- 監査: `AUDIT_v5.md`（同一作成者による模擬監査。独立監査ではない）。
- 正本: GitHub（`apps/uranai/index.html`）。Artifact（PvUJ1G…）は V1 のまま。

### テスト

```
cd apps/uranai && npm i jsdom@24
node tests/smoke.js
node tests/storage.test.js   # 7件（移行・NORM・読込失敗・消去・外観・版表示）
node tests/tabs.test.js      # 全10ツールの開閉・ページエラー0
```

ステータス: jsdom で通過（2026-10-22）。iPhone Safari 実機は未確認。

## V3 仕様見直し（2026-10-24）

- 四柱推命: 23時台（晩子時）の時柱の天干を、翌日の日干から求めるよう修正。日柱は当日のまま（0時で切替）。出生時刻が23時台の場合、時柱が変わる。
- 四柱推命の注記: 節入り精度を「最大13分」に更新（国立天文台 暦要項 2022〜2027年の公表値72点で実測 最大12.6分、警告しきい値は30分のまま）。
- 回帰テスト追加:
  - `tests/nao_terms.test.js`: 節入り72点（出典: `tests/data/nao_terms.json`）
  - `tests/spec.test.js`: 時柱の連続性、周易64卦の順序（出典: `tests/data/hexagrams.json`）、タロット78枚、ルーン24文字
- 詳細・未確認事項は `AUDIT_v5.md` の「V3 仕様見直し」。

```
node tests/nao_terms.test.js   # 節入り: 最大13分以内
node tests/spec.test.js        # 7件
```

## V4 横スクロール対策・UI改善（2026-10-24）

- 原因: (1) 画面遷移アニメーション中に `main` が一時的に横へ +10px 超過（320/390px幅で検出）。(2) 大運表の5列目が狭幅で切れる。(3) 命式の大きな干支が 320px・文字135%で切れる。
- 修正: `main{overflow-x:clip}`（非対応環境は `html,body{overflow-x:hidden}`）、表を `minmax(0,…)` グリッド化、大運表を4列化（開始列に「年齢＋西暦」を縦積み）、命式文字を `min(1.75rem,8.5vw)`、`img/svg/canvas` の `max-width:100%`、入力・選択の `min-width:0`。
- 取り入れた考え方（既存パッケージのモバイル表で一般的な「列の折りたたみ」「はみ出しをコンテナ内で処理」。実装は自作、資産・コードの流用なし）。
- 計算ロジック・定数・保存スキーマは変更なし。
- 新規テスト `tests/layout.test.js`（Chromium/Playwright）: 幅320/360/390/430 × 文字100/135%、全ツール・全スプレッドを走査。V4: 368件・問題0。修正前の版: 38件（320/390幅）。

```
NODE_PATH=/opt/npm-tools/node_modules node tests/layout.test.js
```

未確認: iPhone Safari（WebKit）実機。Chromium のみで検証（`<input type=date>` の固有幅など WebKit 差異は未検証）。

## V5 操作性（2026-10-24）

検出（`tests/ops.test.js`: 4画面サイズ×全画面・全ボタン・全select値・連打・履歴・キーボード・スワイプ・回転・ダーク・文字85/135%）と修正:
- ブラウザの戻る/Safariの端スワイプでアプリから離脱 → History API 連携（ツール表示で pushState、popstate でホームへ。開閉を繰り返しても履歴は増えない）。
- 戻るでホーム一覧のスクロール位置が先頭へ戻る → 位置を保存・復元（`history.scrollRestoration="manual"`）。
- タップ領域が44px未満（入力欄38〜40、検索42、スライダー32、九星の盤切替34、姓名の画数入力38。V4で入力欄を38に下げたのは §5 違反だった） → すべて44px以上。
- ホーム再タップで先頭へ（iOS標準の慣習）。
- 計算・定数・保存スキーマは変更なし。版表示は V5。

```
NODE_PATH=/opt/npm-tools/node_modules node tests/ops.test.js   # 0件で合格
```

未確認: iPhone Safari（WebKit）実機。Chromium のみで検証。
