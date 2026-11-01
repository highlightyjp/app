# リポジトリ監査レポート(2026-11-01)

- 対象: `highlightyjp/app` main `6739469`(追跡ファイル 61件・9,272,220バイト)
- 範囲: 全追跡ファイル。観点は不具合・セキュリティ・アクセシビリティ・パフォーマンス
- 実施者: Claude Code(クラウド環境)。同一作成者による監査で、独立監査ではない
- 修正: 重要度「高」の3件を別ブランチ `claude/confident-allen-idps28-fixes` で修正 → https://github.com/highlightyjp/app/pull/1 (draft)。中・低は未修正(本レポートで報告のみ)
- 区分: 【実測】=ツールで実行・再現した結果、【コード】=ソースの読解による判断、【未確認】=検証していないもの

## 1. 要約

| 重要度 | 件数 | 修正 |
| --- | ---: | --- |
| 緊急 | 0 | — |
| 高 | 3 | 3件とも PR #1 で修正 |
| 中 | 11 | 未修正 |
| 低 | 18 | 未修正(L-3 のみ H-1 の修正に含めた) |

重要度の基準:
- 高: 悪用可能なセキュリティ欠陥、永続的な機能停止、支援技術利用者が操作を完了できない障害
- 中: 条件付きで悪用可能・影響が限定的な欠陥、WCAG 2.1 AA 不適合(操作は可能)、既知だが未対策のリスク
- 低: 保守性・衛生・軽微な不整合、要確認事項

## 2. 重要度「高」(PR #1 で修正済み)

### H-1 中継スクリプトのリダイレクト先が許可ホスト検査を通らずに要求される(セキュリティ / SSRF)
- 場所: `coorde-fetch.js:17-19`(修正前)
- 内容: `fetch(..., { redirect: "follow" })` で転送を自動追従し、検査は最終URL(`r.url`)だけ。許可ホスト(uniqlo・gu-global・yahoo・zozo)上のオープンリダイレクトを経由すると、許可外のホストや内部アドレス(例: 169.254.169.254)へ GitHub Actions ランナーから要求が出る。最終的に許可ホストへ戻せば成功扱いになり、取得結果はリポジトリへコミットされる(`coorde-fetch.yml` の commit 手順)。
- 根拠【実測】: fetch を差し替えた試験(許可ホスト→169.254.169.254→許可ホスト)で、内部アドレスへの要求1件が発生し status 200 で成功扱い。
- 修正: `redirect: "manual"` で1段ずつ追従し、Location を許可ホストか検査してから要求。上限20段(follow と同じ)。タイムアウトを本文読込まで延長(L-3)。出力キーは不変。エラー値 `too_many_redirects` を追加。
- 修正後【実測】: 内部アドレスへの要求0件・`redirect_host_not_allowed`。許可ホスト内の相対リダイレクト・リンク抽出は従来どおり。Node の `redirect:"manual"` が 302 と Location を返すことをローカルHTTPサーバーで確認。
- 残存【未確認】: ランナー(Node 20)上での実行。修正の試験は Node 22。

### H-2 不正なバックアップの読込でプロフィールタブが恒久的に描画不能になる(不具合)
- 場所: `index.html` `validateImport`(10829行〜、修正前)・`renderProfile`(10692行〜)
- 内容: `validateImport` は `profile.intros` の要素を検査しない。`intros` に `null` や `text` が文字列でない要素を含むファイルを読み込むと、`currentIntro()` の `v.id` で TypeError。データは localStorage に保存されるため、再読込後もプロフィールタブが空のまま。
- 根拠【実測】: Chromium で `intros:[null, {id:"v",text:123}]` を読込 → 「読み込みました」表示後、プロフィールタブの子要素0、再読込後も同じ、TypeError 2件。
- 修正: intros の各要素に `id`・`text`(文字列)・`createdAt`(数値)を要求し、不正なら読み込まない。アプリ自身の書き出し形式はすべて満たす。intros が配列でない場合は従来どおり許容。
- 修正後【実測】: 不正3種を拒否、正常ファイルは読込可、ページエラー0。
- 残存: 既に不正データを保存した端末は、正常なバックアップを読み込み直すまで直らない。

### H-3 シート(ダイアログ)に名前がなく、フォーカスが背面に残る(アクセシビリティ)
- 場所: `index.html:158`(`#sheet`)、`openSheet`/`closeSheet`(10431〜10439行、修正前)
- 内容: `role="dialog" aria-modal="true"` だがアクセシブルな名前がない(WCAG 4.1.2)。設定・デート・読込確認シートを開いてもフォーカスは背面のボタンに残る。`aria-modal` により背面は支援技術から隠れるため、スクリーンリーダー利用者はフォーカス位置を失う。閉じてもフォーカスが戻らない(WCAG 2.4.3)。
- 根拠【実測】: axe-core 4.10.2 `aria-dialog-name`(serious)。【コード】フォーカス移動の処理なし。
- 修正: `aria-labelledby="sheetTitle"`、開いたら見出し(tabindex=-1)へフォーカス、閉じたら開いた要素へ戻す。連絡先シートは従来どおり名前欄へフォーカス。
- 修正後【実測】: axe 違反0、フォーカス移動・復帰を Playwright で確認。
- 残存: フォーカストラップ・背面の inert 化は未実装(M-11)。削除で行が消えた場合は戻り先がない。

## 3. 重要度「中」(未修正)

| ID | 区分 | 場所 | 内容 | 根拠 | 対応案(未実施) |
| --- | --- | --- | --- | --- | --- |
| M-1 | A11y | `apps/uranai/index.html` CSS トークン | ライトで文字コントラスト不足: `--label2` 3.47:1(背景)/3.62:1(カード)、主ボタン 白/#007AFF 4.01:1、副ボタン 3.11:1、`--red` 3.18〜3.55:1(エラー・凶方位タグ)。ダークでタブ選択ラベル 3.06〜3.39:1、主ボタン 3.64:1。WCAG 1.4.3 不適合 | 【実測】axe・計算。おみくじの紙片は初回測定 2.24:1 だったがアニメーション途中の値で、静止後 3.62:1 | 配色トークンの変更。既存デザインの変更になるため所有者判断 |
| M-2 | A11y | `index.html` `--muted` #64756D | 背景 #F2F5F1 上で 4.44:1(基準4.5に0.06不足)。件数・注記・空表示 | 【実測】axe | 同上 |
| M-3 | A11y | `apps/shusshin/src/app.html` | ①回答ごとに選択肢を作り直すためフォーカスが body に落ち、キーボード・SR 利用者は毎問先頭から辿る ②地図 `svg role="img"` に名前なし(`aria-label` は役割のない div に付いている) ③データ地図の県選択は地図のタップのみ ④main ランドマークなし・見出し順序 | 【実測】axe `svg-img-alt`・`landmark-one-main`・`heading-order`。①③【コード】 | 次の質問文へフォーカス移動、svg へ名前、県選択の代替操作 |
| M-4 | セキュリティ | `.github/workflows/coorde-fetch.yml` commit 手順 | `git commit -m "relay ${{ inputs.rid }}"` で入力をシェルへ直接展開(スクリプトインジェクションの型)。直前の fetch 手順で RID を検証し失敗時は commit 手順が走らないため、現状は悪用不可 | 【コード】 | `env: RID` 経由で `"$RID"` を参照 |
| M-5 | セキュリティ/データ | 同 commit 手順 | ①`find coorde-relay -mmin +1440 -delete` は checkout 直後のファイル時刻(取得時刻)で判定するため、24時間超のファイルが削除されない ②削除しても履歴には残る ③取得した HTML 全文(最大60万字)が既定ブランチにコミットされ、公開リポジトリなら誰でも読める | 【コード】(ワークフローは未実行のため【未確認】部分あり。現在 `coorde-relay/` は追跡ファイルなし) | ファイル名の時刻・コミット時刻で判定、専用ブランチや Artifact へ出力 |
| M-6 | セキュリティ | `apps/shusshin/src/app.html` `submitPlay`・`normPlay` | 共有DBの pool は Contributor 以上なら誰でも書け、形式が正しい偽回答で判定を偏らせられる。「1人1回」は本人領域の印を読むクライアント側の検査のみ | 【コード】。`AUDIT_v5.md` P3 に既知の記載あり | 書込側の制約はプラットフォーム依存【未確認】 |
| M-7 | 不具合 | 同 `loadCrowd` | 1,000件以上で県ごとに `limit(1000)` で読むため、1県1,000件を超えると黙って切り捨て、多い県ほど過小に数える。読込は最大48回の逐次問い合わせ | 【コード】 | ページング、切り捨て時の表示 |
| M-8 | 性能 | `docs/reference/exclusive-control/merge.js` `materialize` | 祖先集合を全件保持し、1レコードの履歴長に対し時間・メモリが2乗で増える | 【実測】perf.js: 1×5,000件 11.5秒・827MB。`app-build-guide_v5.md` §15.8 に既知の記載あり(8.5秒) | 祖先判定の方式変更 |
| M-9 | 不具合/運用 | `sw.js` | 全リクエストをキャッシュ優先で返し、更新は `sw.js` のバイトが変わったときだけ。`index.html` だけ更新すると利用者に届かない。スコープ `./` はリポジトリ直下のため、リポジトリ全体を同一オリジンで配信すると `apps/*` もこの SW の対象になり、更新が届かない・オフライン時に別アプリへ index.html を返す | 【コード】。ルートアプリの配信先は【未確認】(pages-uranai.yml は uranai のみ配信) | VERSION の更新運用、スコープ限定 |
| M-10 | A11y | `index.html` `toast` | `role="status"` の要素を hidden から表示へ切り替えると同時に文言を入れるため、読み上げられない環境がある | 【コード】、SR 実機【未確認】 | 常時表示の live region に文言のみ差し替え |
| M-11 | A11y | `index.html` KPI 入力・シート | KPI 入力の change で画面全体を再描画しフォーカスが消える。シート内のフォーカストラップなし(H-3 の残り) | 【コード】 | 再描画後に同じ入力へフォーカス、トラップ追加 |

## 4. 重要度「低」(未修正)

| ID | 区分 | 場所 | 内容 | 根拠 |
| --- | --- | --- | --- | --- |
| L-1 | 権利 | `index.html` 166〜10267行 | jsQR を同梱しているが版・ライセンス(Apache-2.0)表記がない | 【コード】 |
| L-2 | プライバシー/性能 | `apps/shusshin/src/app.html:3-4` | Google Fonts を外部読込(閲覧者の IP が Google へ送られる、オフラインで遅延) | 【コード】。`AUDIT_v5.md` P7 に記載あり |
| L-3 | 不具合 | `coorde-fetch.js:18`(修正前) | タイムアウトを本文読込前に解除しており、本文が遅いとジョブ時間(5分)まで待つ | 【コード】。H-1 の修正に含めた |
| L-4 | 保守 | `coorde-fetch.js:4` | `/^zozo\.jp$/` と `/^(www\.)?zozo\.jp$/` が重複 | 【コード】 |
| L-5 | サプライチェーン | `.github/workflows/*.yml` | actions をタグ(`@v4` 等)で参照し、コミット SHA で固定していない | 【コード】 |
| L-6 | 衛生 | `apps/shusshin/build/__pycache__/spec.cpython-313.pyc` | 生成物が追跡されている。`.gitignore` に `__pycache__/` なし | 【実測】git ls-files |
| L-7 | 文書 | `apps/uranai/README.md` | 見出しが「V3」(アプリ表示は V5)。冒頭の「index.html は公開版をそのまま…変更していない」は V2 以降と矛盾 | 【コード】 |
| L-8 | 文書 | `README.md` | 見出しのみ。ルートアプリ(マチアプ手帳)・各アプリの説明なし | 【実測】 |
| L-9 | 不具合 | `index.html` `validateImport` | 連絡先 id の重複、日付形式、メモ等の型は未検査(現状クラッシュは確認されず、表示崩れのみ) | 【コード】 |
| L-10 | 性能 | `apps/shusshin/index.html` | 2.9MB の単一HTML。DOMContentLoaded 660ms・load 1,234ms(Chromium・デスクトップ相当、外部フォント含む)。スマホ実機【未確認】。エンジンは pickNext 平均8ms・最大22ms で問題なし | 【実測】 |
| L-11 | セキュリティ | `apps/shusshin/src/app.html:614` | テスト用の `window.__shusshin` が本番にも公開され、内部状態を操作できる(自分のページ内のみ) | 【コード】 |
| L-12 | PWA | `manifest.webmanifest` | アイコンが `purpose:"any"` のみ(maskable なし)。Android で余白付き表示になる可能性 | 【コード】 |
| L-13 | 不具合 | `apps/shusshin/src/app.html` `normPlay` | まとめ問題の id 重複(`c:a+a`)を拒否しない | 【コード】 |
| L-14 | A11y | `apps/uranai/index.html:388` | `role="tablist"/"tab"` だが tabpanel・`aria-controls`・矢印キー操作がない(実態はナビゲーション) | 【コード】 |
| L-15 | A11y/UX | 同 | 「プロフィールを消去」が確認なしで即時削除。タロット・周易・ルーンの結果表示が読み上げ・フォーカス移動なし | 【コード】 |
| L-16 | 性能 | 同 2455〜2456行 | スライダーの input ごとに localStorage へ書込 | 【コード】 |
| L-17 | 要確認 | 同 `honmei` | 本命星を性別で変えている(一般的な九星気学では性別に依存しない)。仕様判断のため変更しない | 【コード】、出典照合【未確認】(`AUDIT_v5.md` も九星気学を未確認と記載) |
| L-18 | 保守 | `docs/reference/exclusive-control/merge.js:17` | `MAX_EVENT_BYTES` が UTF-16 の文字数で判定しており名前と不一致(日本語で約3倍まで通る) | 【コード】 |

## 5. 問題なしと判断した主な点

- innerHTML: ルート `index.html:10758`(固定SVG)、uranai `icon()`/`chevron()`(固定SVG)のみ。外部・利用者入力の挿入なし【コード】
- `eval`/`new Function`/`document.write`: アプリコードになし【実測】grep
- 秘密情報(APIキー・トークン・秘密鍵の形式): 追跡ファイルになし【実測】grep(raw データ・生成物は除外)
- LINE URL の検証(`lineUrl`)・リンクの `rel="noopener noreferrer"`、shusshin の出典リンクは https のみ【コード】
- uranai の保存処理(schema v1・NORM・読込失敗時の保存停止)はテスト7件合格【実測】
- shusshin のビルド再現性: 一次データから再生成し `questions.json`・`map.json` はバイト一致、`index.html` はビルド日時のみ差【実測】
- uranai の旧版 `versions/index_v1_pre-schema.html` の SHA-256 は README 記載値と一致【実測】
- JSON 14件の構文、JS 18件(`node --check`)、Python 4件(`py_compile`)すべて OK【実測】

## 6. 実行した検証

| 項目 | 結果 |
| --- | --- |
| uranai `smoke.js` / `spec.test.js` / `storage.test.js` / `tabs.test.js` / `nao_terms.test.js`(jsdom 24) | すべて合格(7/7、7/7、最大12.6分) |
| uranai `layout.test.js` / `ops.test.js`(Chromium) | 368件・問題0 / 問題0 |
| shusshin `engine.test.js` / `e2e.js`(Chromium・ライト/ダーク) | 8件合格 / エラー0 |
| exclusive-control `test.js` / `perf.js` | pass=338 fail=0 / M-8 の数値 |
| axe-core 4.10.2(WCAG 2.0/2.1 A・AA+best-practice、390px、ライト/ダーク、3アプリ計22画面) | M-1・M-2・M-3・H-3 の根拠 |
| H-1 再現試験(fetch 差し替え)・H-2 再現(Chromium) | 修正前 FAIL、修正後 PASS |
| 読込時間計測(Chromium) | ルート 44ms、uranai 91ms、shusshin 1,234ms(load) |

未実施・未確認: iPhone Safari(WebKit)実機、スクリーンリーダー実機、GitHub Actions 上での `coorde-fetch` 実行、`sim.js`(長時間)、一次データ値の出典照合、`docs/*.md` の内容の妥当性(構成・リンク・セキュリティ規定のみ確認)、jsQR 同梱部の脆弱性照合(版が不明のため)。

## 7. ファイル別の確認証跡(全61件)

SHA-256 は監査時点(main `6739469`)の値。
| # | ファイル | バイト | 行 | SHA-256(先頭12桁) | 確認方法と結果 |
| --- | --- | ---: | ---: | --- | --- |
| 1 | `.github/workflows/coorde-fetch.yml` | 1,245 | 37 | `2ee2d208ebfe` | 全文精読。入力の受け渡し・コミット手順・保持削除を確認 → M-4, M-5, L-5 |
| 2 | `.github/workflows/pages-uranai.yml` | 884 | 42 | `17ab162a5dbb` | 全文精読。権限・配信対象を確認 → L-5 |
| 3 | `README.md` | 5 | 0 | `bdd1532dfe7b` | 全文精読(5バイト、見出しのみ) → L-8 |
| 4 | `apple-touch-icon.png` | 9,433 | 19 | `1d056d57226f` | PNGヘッダー読取(180×180) |
| 5 | `apps/shusshin/.gitignore` | 31 | 3 | `617ff27abb1b` | 全文精読 → L-6 |
| 6 | `apps/shusshin/AUDIT_v5.md` | 2,044 | 17 | `090f46f1812c` | 全文精読(既知事項の照合元) |
| 7 | `apps/shusshin/README.md` | 8,881 | 116 | `db6268d16e92` | 全文精読 → 記載とビルド結果を照合 |
| 8 | `apps/shusshin/build/__pycache__/spec.cpython-313.pyc` | 23,590 | 27 | `1f9f4a156f7d` | 内容は確認対象外(生成物)。追跡されていること自体を指摘 → L-6 |
| 9 | `apps/shusshin/build/build.py` | 17,245 | 219 | `308abf553828` | 冒頭〜生成処理を精読、外部通信・eval なしを grep 確認、別領域で再実行し questions.json 一致 |
| 10 | `apps/shusshin/build/build_html.py` | 1,619 | 20 | `389044915c7d` | 全文精読、別領域で再実行し index.html はビルド日時以外一致 |
| 11 | `apps/shusshin/build/build_map.py` | 4,472 | 72 | `bf5b1a40a764` | 全文精読、別領域で再実行し map.json 一致 |
| 12 | `apps/shusshin/build/raw/japan_prefectures_topo_s0010.json` | 455,889 | 0 | `bf8dca7c8aa8` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 13 | `apps/shusshin/build/raw/jma_normals.json` | 16,669 | 734 | `65d49a0160cb` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 14 | `apps/shusshin/build/raw/kakei_2008.json` | 882,076 | 0 | `f0476eed0a30` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 15 | `apps/shusshin/build/raw/kakei_2023_2025.json` | 463,403 | 0 | `28bd949863cf` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 16 | `apps/shusshin/build/raw/maff_kyodo_ryori.json` | 387,251 | 8,191 | `d16186519377` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 17 | `apps/shusshin/build/raw/mext_kyushoku.json` | 42,216 | 0 | `c85f2a67440f` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 18 | `apps/shusshin/build/raw/prefs_capitals.json` | 1,252 | 0 | `9921a3ce5727` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 19 | `apps/shusshin/build/raw/sugata_2026.json` | 10,105 | 673 | `8140ee68d002` | 一次データ。JSON構文OK、build.py の入力として再ビルドで使用(値の出典照合は未実施) |
| 20 | `apps/shusshin/build/spec.py` | 28,345 | 276 | `013bce3c4194` | import・ファイル操作・eval を grep 確認(問題定義データ)。py_compile OK |
| 21 | `apps/shusshin/data/map.json` | 226,057 | 0 | `a6680802e418` | JSON構文OK、再ビルド結果とバイト一致 |
| 22 | `apps/shusshin/data/meta.json` | 1,748 | 0 | `1111395ac9e9` | JSON構文OK、再ビルド結果と built 日時のみ差 |
| 23 | `apps/shusshin/data/questions.json` | 2,625,967 | 0 | `4dd398b847e0` | JSON構文OK、再ビルド結果とバイト一致(1,487問) |
| 24 | `apps/shusshin/index.html` | 2,905,184 | 803 | `1e41c18d1b3f` | src/app.html と engine.js の埋め込み生成物。再ビルドと照合、Chromium e2e・axe・読込時間計測 → M-3, L-2, L-10 |
| 25 | `apps/shusshin/src/app.html` | 41,015 | 616 | `22d3700ae525` | 全文精読 → M-3, M-6, M-7, L-2, L-11, L-13 |
| 26 | `apps/shusshin/src/engine.js` | 10,075 | 176 | `e6a76bded258` | 全文精読、単体テスト8件合格、pickNext 所要時間計測 |
| 27 | `apps/shusshin/tests/e2e.js` | 3,561 | 55 | `b02eefd771f0` | 全文精読、実行して合格(ライト/ダーク) |
| 28 | `apps/shusshin/tests/engine.test.js` | 2,530 | 15 | `1653dfc9880e` | 全文精読、実行して8件合格 |
| 29 | `apps/shusshin/tests/sim.js` | 3,360 | 52 | `ad49a5e46e90` | 全文精読、node --check OK(長時間のため実行は未実施) |
| 30 | `apps/uranai/AUDIT_v5.md` | 8,022 | 81 | `d89b085bc2ab` | 全文精読(既知事項・未確認事項の照合元) |
| 31 | `apps/uranai/README.md` | 7,899 | 107 | `e02105e377b8` | 全文精読 → L-7 |
| 32 | `apps/uranai/index.html` | 195,220 | 2,463 | `acb136ad9a6e` | script 5件・CSS を全文精読(長いデータ行は先頭のみ)。jsdom/Chromium テスト全件・axe 検査 → M-1, L-14, L-15, L-16, L-17 |
| 33 | `apps/uranai/tests/README.txt` | 165 | 2 | `f94bfbcbb845` | 全文精読 |
| 34 | `apps/uranai/tests/data/hexagrams.json` | 667 | 5 | `0a1a6bf58c71` | JSON構文OK、spec.test.js で使用 |
| 35 | `apps/uranai/tests/data/nao_terms.json` | 2,137 | 19 | `b362e59c798a` | JSON構文OK、nao_terms.test.js で使用 |
| 36 | `apps/uranai/tests/harness.js` | 1,098 | 23 | `10ec683f638d` | 全文精読 |
| 37 | `apps/uranai/tests/layout.test.js` | 7,401 | 110 | `c507ba289ea9` | 全文精読、実行して 368件・問題0 |
| 38 | `apps/uranai/tests/nao_terms.test.js` | 1,966 | 32 | `3af68cb7f79c` | 全文精読、実行して合格(最大12.6分) |
| 39 | `apps/uranai/tests/ops.test.js` | 11,994 | 150 | `f453d830b32e` | 全文精読、実行して問題0 |
| 40 | `apps/uranai/tests/smoke.js` | 900 | 15 | `d8807393f0ba` | 全文精読、実行してエラー0 |
| 41 | `apps/uranai/tests/spec.test.js` | 3,823 | 64 | `ed2c63be43e1` | 全文精読、実行して7/7合格 |
| 42 | `apps/uranai/tests/storage.test.js` | 4,413 | 80 | `7f9f3bb3d890` | 実行して7/7合格 |
| 43 | `apps/uranai/tests/tabs.test.js` | 1,046 | 25 | `40694882a08c` | 全文精読、実行して合格 |
| 44 | `apps/uranai/versions/index_v1_pre-schema.html` | 189,382 | 2,357 | `dd67475b9d5c` | ロールバック用の旧版。SHA-256 が README 記載値(dd67475b…)と一致することを確認。配信対象外(pages-uranai.yml) |
| 45 | `coorde-fetch.js` | 3,030 | 43 | `386672d82ed0` | 全文精読、node --check OK、fetch差し替え試験で再現 → H-1, L-3, L-4 |
| 46 | `docs/app-build-guide_v4.md` | 80,124 | 655 | `c5942e943f8b` | 見出し構成を v5 と比較、§1〜§6 相当を確認(v5 に置換済みの旧版) |
| 47 | `docs/app-build-guide_v5.md` | 116,348 | 937 | `b132156f2138` | §6 セキュリティ規約・§15.8 性能を精読、外部リンク抽出 → M-8 の既知記載を照合 |
| 48 | `docs/reference/exclusive-control/README.md` | 642 | 10 | `251d211c92f1` | 全文精読 |
| 49 | `docs/reference/exclusive-control/merge.js` | 8,450 | 202 | `ff65a7aae6de` | 全文精読 → M-8, L-18 |
| 50 | `docs/reference/exclusive-control/perf.js` | 787 | 16 | `861d996ac0f5` | 全文精読、実行(1×5,000件で11.5秒・827MB) |
| 51 | `docs/reference/exclusive-control/sha256.js` | 2,380 | 35 | `c0232bfcbc5e` | 冒頭精読、test.js 内で検証 |
| 52 | `docs/reference/exclusive-control/test.js` | 11,543 | 199 | `715d2f84b276` | 冒頭精読、実行して pass=338 fail=0 |
| 53 | `icon-192.png` | 9,553 | 27 | `b178382ce9a5` | PNGヘッダー読取(192×192) |
| 54 | `icon-512.png` | 14,513 | 24 | `b7e1c9adf6f5` | PNGヘッダー読取(512×512) |
| 55 | `index.html` | 308,507 | 10,926 | `67d82931bf12` | アプリ本体(10269〜10926行)全文精読、CSS(15〜135行)精読、jsQR同梱部(166〜10267行)は構造・出所表記のみ確認。Chromium で不具合再現・axe 検査 → H-2, H-3, M-2, M-10, M-11, L-1, L-9 |
| 56 | `manifest.webmanifest` | 555 | 16 | `3cf896c0ddf9` | 全文精読、JSON構文OK → L-12 |
| 57 | `muse-setup-v1.md` | 2,720 | 31 | `7a11e419ac24` | 全文精読(秘密情報・外部送信指示なし) |
| 58 | `muse-setup-v2.md` | 31,364 | 555 | `df02fff42711` | 秘密情報 grep、行数確認(v4 の旧版) |
| 59 | `muse-setup-v3.md` | 33,330 | 574 | `1230451341bc` | 秘密情報 grep、行数確認(v4 の旧版) |
| 60 | `muse-setup-v4.md` | 34,748 | 585 | `75ea70c6914d` | 冒頭・受領時検査・安全規則を精読、秘密情報 grep |
| 61 | `sw.js` | 1,341 | 29 | `991f2686814a` | 全文精読、node --check OK → M-9 |
