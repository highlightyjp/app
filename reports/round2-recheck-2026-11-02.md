# ラウンド2判定の再評価（B系・C系、原文照合）

作成日: 2026-11-02
対象: B系・C系由来のスキル候補。各 `SKILL.md` の原文、両リポジトリの `skills-drafts/INDEX.md`、抽出元の関連ファイル
既存ファイルへの変更: なし（本ファイルの追加のみ）

---

## 0. 結論

| 項目 | 内容 |
|---|---|
| 前提ファイル | `integrated-list-round1-2026-11-02.md`、`round2-review-2026-11-02.md` とも、両リポジトリの全ブランチとPR本文に存在しない（第1節）。ラウンド2の判定と統合先は取得できず、**照合はできていない** |
| 本書で行ったこと | B系・C系の全24件の原文を読み、固定した基準（第3節）で判定と統合先を出し直した。ラウンド2の判定と比べる作業は、第6節の表を使って本人が行う |
| 判定の内訳【評価】 | 採用 21件／吸収 3件／見送り 0件 |
| 吸収とした候補 | B11 `open-data-embedding-pipeline` → C10 `data-provenance-audit`、C03 `primary-source-promotion-survey` → 既存スキル「徹底調査一次情報検証」、C05 `purchase-contract-precheck` → 既存スキル「徹底調査一次情報検証」 |
| 統合先の誤り（原文で確認） | iOS_WebApp INDEX の選外理由「DADS のライセンス・出典の公開面は12の対象」。B12 の原文には権利条件の項目がない。正しい受け皿は C07 `license-rights-check` |
| 両INDEX間の判定の割れ | ① app で見送った「外部取得の許可リスト監査」は、B13 と対象が重なる ② app は §14 を「同じ規則を二か所で持つ」理由で見送ったが、同じ構造の B08 は iOS_WebApp で採用されている |
| 新たに検出した事実 | マチアプ手帳が両リポジトリに別版で存在する（app ルート `APP_VERSION = "1.0.0"`、iOS_WebApp `machiapp-techo/` `"2.1.0"`）。どちらの INDEX にも記載がない |

---

## 1. 前提ファイルの所在確認（事実）

| # | 確認内容 | 結果 |
|---|---|---|
| F1 | `highlightyjp/app` の全リモートブランチ（7本）で、ツリー内のファイル名を `round` `integrated` `review` `reports/` で検索 | 該当ファイルは `reports/cloud-audit-2026-11-01.md`（`claude/confident-allen-idps28`）のみ。前提2ファイルはない |
| F2 | `highlightyjp/iOS_WebApp` の全リモートブランチ（6本）で同じ検索 | 該当なし |
| F3 | 両リポジトリのコミットメッセージ（`git log --all`）を `skill` `round` `review` で検索 | skills-drafts を追加したコミット `ec9e5bd`（app）、`84ceb74`（iOS_WebApp）だけが該当 |
| F4 | GitHub コード検索 `integrated-list-round1` | 0件 |
| F5 | 両リポジトリの全PR（app 3件、iOS_WebApp 3件）の本文 | ラウンド1・ラウンド2への言及なし |

前提ファイルがないため、ユーザーの指示文にある内容（B系13件・C系10件を1行説明で判定した）だけを前提として進めた。

---

## 2. 系統の対応（推定）

| 系統 | 対応先（推定） | 根拠 | 不一致・未確認 |
|---|---|---|---|
| B系 13件 | iOS_WebApp `claude/adoring-babbage-vtlodn` の `skills-drafts/` 01〜13 | 件数が一致（13） | 系統名との対応は推定 |
| C系 10件 | app `claude/ecstatic-euler-k3jxb7` の `skills-drafts/` S01〜S11 | 両リポジトリにある候補群のうち、B系以外はこれだけ | **件数が合わない（原文は11件、指示は10件）**。どの1件がC系から外れたか（A系への移動・統合・除外のどれか）は特定できない。本書では11件すべてを評価した |
| 1行説明 | 各 INDEX の候補一覧表（iOS_WebApp「4. 候補一覧」の主な発動場面、app「2. 候補一覧」のスキル名・種別） | ラウンド2で読まれた範囲として最も可能性が高い | 推定 |

A系の内容は不明（前提ファイルがないため）。A系の候補と重なっているかどうかは確認していない。

---

## 3. 判定基準（24件すべてに同じ基準を使った）

| ID | 基準 | 確認方法 |
|---|---|---|
| K1 | 発生件数: 同じ手順が、独立した成果物・事例に2件以上ある（両リポジトリを合算。規約文書の1か所に書かれているだけなら1件と数える） | INDEX の根拠を原文と関連ファイルで照合 |
| K2 | 原文の手順が抽出元にあるか。起草者が独自に定めた規定の割合 | SKILL.md の手順と抽出元の行を比べる |
| K3 | 重複: 他の候補・既存スキルと比べて、固有の手順・出力が残るか | 原文同士の比較。既存スキルのうち本文を読んだのは「徹底調査一次情報検証」だけ。その他は説明文だけで判断した |
| K4 | 実行可能性: 手順・コマンドが決まっていて、試行の記録があるか | 各 INDEX の検証記録 |

判定規則:
- 採用: K3 で固有の部分が主になっている。K1 を満たさなくても、受け皿になる統合先がなければ「採用（要試行）」とする
- 吸収: K1 を満たさない、または固有の部分を統合先の1節で表せる。そのうえで統合先がある
- 見送り: 統合先がなく、さらに範囲外であるか、固有の部分がない

---

## 4. B系（iOS_WebApp 01〜13）の再評価

| No | 候補 | 判定【評価】 | 統合先 | K1 発生件数（確認値） | 判定を決めた原文上の事実 |
|---|---|---|---|---|---|
| B01 | single-html-integrity-check | 採用 | なし（B02・B07・B10 の後工程として呼ばれる） | estateos 23版中9版・nexa 23版中1版 が FAIL（INDEX §9。今回は再実行していない） | 判定基準とスクリプトが決まっている。他の候補が呼び出す基盤になる |
| B02 | regenerated-code-regression-guard | 採用 | なし（C09 と相互参照） | 全文差し替え4回で関数を削除。スタブの痕跡が5ファイル | C09 は文書と変更履歴の照合、B02 は関数・DOM id・保存キーの台帳差分。入力も出力も違う |
| B03 | app-variant-lineage-registry | 採用（条件付き） | なし | 15ファイル（2026-01-10）＋estateos/nexa の反復差し替え＋**両リポジトリにマチアプ手帳が別版で存在（新規検出）** | 指摘: 命名規則 `<app>_v<MAJOR>.<MINOR>.<PATCH>.html` と台帳の列構成は、抽出元にはない起草者の独自規定（K2）。採用する場合、命名規則と台帳の置き場は本人が決める |
| B04 | storage-schema-migration | 採用 | なし | SUI のキー付け替え4段、`localStorage.clear()` 8ファイル（実測で一致）、参照実装あり | 指摘: app の統一指示書 v5 §4「スキーマ・文書構成の移行（5手順）」（`docs/app-build-guide_v5.md:82-93`）と原則が同じ（退避・別生成・読み戻し照合・旧データの残置）。対象が違う（§4 は共有データの batch、B04 は端末内保存）ため統合はしない。ただし、どちらの INDEX もこの関係を書いていない |
| B05 | ios-standalone-webapp-check | 採用 | なし | `48949ec`、nexa `6aa1234`、estateos L56。nexa は viewport 指定なし（実測で一致） | C06 の P1・P7 と統一指示書 §5 は観点の定義。B05 は iOS 固有の点検手順と計測スクリプト。固有の部分が主 |
| B06 | pwa-service-worker-release | 採用 | なし | coorde・machiapp-techo に加え、**app ルートの `sw.js`（`machiapp-techo-1.0.0`）が3件目（新規検出）** | coorde の `sw.js` の activate が `k !== C` だけを条件に削除すること、プリキャッシュに `icon-180.png` がないことを実測で確認した（D8 と一致） |
| B07 | artifact-standalone-port | 採用 | なし | coorde・machiapp-techo・dasgen の3件 | 本体を改変しない方針、互換層の分離、承認済み改変の列挙。いずれも抽出元に記載がある |
| B08 | phase-gate-transition | 採用 | なし | railway（Phase A-0〜C-10 の22コミット）、sidebiz（`state.json`・`phase_gates.md`）、dasgen（`CLAUDE.md` §フェーズ管理）の3件 | 手順は `sidebiz/00_core/CLAUDE.md:25-40`、`runbook/phase_gates.md` から抽出されている（K2 は満たす）。指摘: 規則の本文は各 `CLAUDE.md` と利用者の常設指示に既にある。app INDEX が §14 を見送ったのと同じ「二重管理」の構造（第8節 X3）。採用を維持した理由は、3プロジェクトで形式が違い（railway には `state.json` がない）、それらをまたぐ判定手順はどの `CLAUDE.md` にもないこと |
| B09 | freeze-seal-verify | 採用 | なし | railway で凍結を複数回（B-1.1、Phase B、C-1〜C-10）。`PHASE_C_SILENCE_LOCK.md` のハッシュは8桁×15件（実測で一致） | 凍結版と main の乖離（D1）が実際にある |
| B10 | deterministic-html-patch | 採用 | なし（B11→C10 から参照される） | `silentize.py`（`.replace(` 23件）と `embed_data.py`。絶対パスは計6箇所（実測で一致） | 指摘: 2件とも同じブランチ・同じ作業の系列から来ている。アプリをまたぐ発生はない |
| B11 | open-data-embedding-pipeline | **吸収** | **C10 data-provenance-audit** | iOS_WebApp では生成1件（`c596253`）。`KANJI_READINGS` 180語（実測で一致） | iOS_WebApp だけでは K1 を満たさない。もう1件の生成（app `apps/shusshin/build/build.py`。出典を定数 `SRC_*` で保持）は、すでに C10 の抽出元になっている。B11 の固有部分（ID規則の検査、参照整合、辞書の網羅率、2回生成してのハッシュ一致、必須ケース）は、C10 の手順5（再現）と手順6（網羅）に検証項目として1節で足せる。埋め込みの工程は B10 を参照する |
| B12 | public-repo-exposure-check | 採用 | なし | `7962ec5`。既定データ4ファイル。QR API への送信2ファイル（`shisanmaru_perfect.html:540`、`shisanmaru_super.html:523`、実測で一致） | 指摘: iOS_WebApp INDEX §6 の選外理由「ライセンス・出典の公開面は12の対象」は、B12 の原文と食い違う。B12 に権利条件の項目はない（第8節 X1） |
| B13 | external-dependency-inventory | 採用 | なし（app で見送った「外部取得の許可リスト監査」の受け皿になりうる） | `chart.js` 版未固定12ファイル、為替API 9、QR API 4（実測で一致） | 指摘: app INDEX §7 は coorde-fetch の許可リスト監査を「範囲が狭い」として見送った。一方 B13 は coorde の中継依存（`coorde-fetch.yml`）を対象に含む（第8節 X2） |

---

## 5. C系（app S01〜S11）の再評価

| No | 候補 | 判定【評価】 | 統合先 | K1 発生件数（確認値） | 判定を決めた原文上の事実 |
|---|---|---|---|---|---|
| C01 (S01) | received-document-inspection | 採用（要試行） | なし（C09 と相互参照済み） | 1件（`muse-setup-v4.md` §3。7項目の表は `:85-93` で原文と一致） | K1 は満たさない。受け皿になる候補・既存スキルもない。試行は機械検査だけ（手順2）で、7項目の判定は試していない |
| C02 (S02) | claim-evidence-audit | 採用 | なし（C03・C04・C08 の最終工程） | muse §6.2（`:208-224`）、統一指示書 §0・§7、uranai README・AUDIT | 「徹底調査一次情報検証」の本文と照合した。同スキルは調査する側の手順で、主張を1件ずつ抜き出して ID を振る手順と、指摘の型（区分の格上げ・時点切れ・計測環境の欠落）がない。固有の部分が主 |
| C03 (S03) | primary-source-promotion-survey | **吸収** | **既存スキル「徹底調査一次情報検証」**（代わりの受け皿は C02） | 1件（統一指示書 §11.1〜11.7） | 「徹底調査一次情報検証」の手順1〜6と「取得不能時の扱い」が、一次情報の優先・本文の取得・別経路での試行・試行の記録・二次情報の種別明記をすでに定めている。C03 の固有部分は「製品×機能の台帳」と「昇格・降格の記録」だけで、1節で表せる。注意: 統合先はリポジトリの外にある本人のスキル。改訂するかどうかは本人が決める |
| C04 (S04) | same-criteria-comparison | 採用 | なし | 3件（統一指示書 §13.1、§15.2、`apps/shusshin/README.md:19-43`） | 「徹底調査一次情報検証」は「表で比較」「食い違いは両方を示す」までしか定めていない。軸の先決め、条件の統一、差の原因の切り分けは C04 に固有 |
| C05 (S05) | purchase-contract-precheck | **吸収** | **既存スキル「徹底調査一次情報検証」** | 1件（muse v1 `:25`、v4 §6） | 「徹底調査一次情報検証」の適用条件に「価格・在庫の確認」「購入判断」が明記されている。C05 の固有部分（総額・解約・自動更新の確認表、確定前に示す4項目）は1節で表せる。指摘: Muse の段階計画では「購入の下準備」は第2段階（`muse-setup-v4.md` §11.1）。Muse の現在の段階は確認できていない。第2段階に入っていなければ、スキル化はまだ始まっていない段階を先に実装することになり、その場合は見送りになる |
| C06 (S06) | fixed-criteria-persona-audit | 採用 | なし | 2件（`apps/uranai/AUDIT_v5.md`、`apps/shusshin/AUDIT_v5.md`） | 基準表を写さず、統一指示書 §13.2〜13.3 を参照して本人に確認する設計（原文の入力表）。§14 の見送り理由（二重管理）には当たらない |
| C07 (S07) | license-rights-check | 採用 | なし（iOS_WebApp で選外にした「DADS ライセンス表記」の正しい受け皿） | 統一指示書 §12・§13.5、shusshin README、iOS_WebApp の coorde・machiapp-techo（DADS） | 第8節 X1 のとおり、iOS_WebApp 側の権利条件の受け皿は B12 ではなく C07 |
| C08 (S08) | published-value-reconciliation | 採用（要試行） | なし | 1件（`apps/uranai/AUDIT_v5.md:29-62`）。shusshin の「較正」（README `:66-78`）は当てはめで、公表値との照合ではないため数えていない | K1 は満たさない。C02 は文書の主張を監査するもので修正はしない。C08 は点ごとの統計、構造の不変条件、回帰テスト、修正範囲の管理を含み、C02 の1節には収まらない |
| C09 (S09) | version-diff-audit | 採用 | なし（B02・B09 と相互参照） | 2系列（muse v1〜v4、統一指示書 v4・v5）。v3→v4 で試行済み | 文書と変更履歴の照合。コード台帳を扱う B02 とは別物 |
| C10 (S10) | data-provenance-audit | 採用 | なし（**B11 の受け皿**） | shusshin build（出典定数 `SRC_K24`・`SRC_K08`・`SRC_SG`・`SRC_JMA`・`SRC_MX`、実測で確認）と、B11 を吸収したあとの railway 生成 | B11 を吸収すると、生成側の検証項目（ID規則・参照整合・決定性）が加わる |
| C11 (S11) | verification-coverage-report | 採用 | なし | 統一指示書 §7・§15.11、uranai・shusshin の README の「検証」表 | iOS_WebApp D3（`B-2/B-3/B-4_*.log` が項目名と PASS だけ。実測で確認）も同じ型の事例。B09 の「コマンドと出力のない PASS を作らない」と重なるが、B09 は凍結物に限っている |

---

## 6. ラウンド2判定との照合表（本人が記入する）

ラウンド2の判定は取得できていない。下の表の「ラウンド2」列に、前提ファイルの値を写して比べる。一致しない行が判定変更の候補になる。「1行説明から読み取れない事実」は、その判定が原文を読んで初めて決まった理由を示す。

| No | 本書の判定 | 本書の統合先 | ラウンド2（未取得） | 1行説明から読み取れない事実 |
|---|---|---|---|---|
| B01 | 採用 | — | — | 他の3候補が呼び出す基盤 |
| B02 | 採用 | — | — | C09 とは入力・出力が違う |
| B03 | 採用（条件付き） | — | — | 命名規則・台帳は起草者の独自規定。両リポジトリに別版が並存している |
| B04 | 採用 | — | — | 統一指示書 §4 と原則が同じ（統合はしない） |
| B05 | 採用 | — | — | — |
| B06 | 採用 | — | — | app 側の `sw.js` が3件目 |
| B07 | 採用 | — | — | — |
| B08 | 採用 | — | — | 各 `CLAUDE.md` との二重管理（§14 の見送りと同じ構造） |
| B09 | 採用 | — | — | — |
| B10 | 採用 | — | — | 発生源が1つの作業系列に限られる |
| B11 | **吸収** | C10 | — | iOS_WebApp での発生は1件。生成のもう1件は C10 の抽出元 |
| B12 | 採用 | — | — | 権利条件は対象外（iOS_WebApp INDEX の選外理由と食い違う） |
| B13 | 採用 | — | — | app で見送った許可リスト監査と対象が重なる |
| C01 | 採用（要試行） | — | — | 発生1件。7項目の判定は試行していない |
| C02 | 採用 | — | — | 「徹底調査一次情報検証」にない固有の手順がある |
| C03 | **吸収** | 徹底調査一次情報検証 | — | 固有部分は台帳と昇格の記録だけ |
| C04 | 採用 | — | — | — |
| C05 | **吸収** | 徹底調査一次情報検証 | — | 統合先の適用条件に購入判断が明記されている。Muse では第2段階 |
| C06 | 採用 | — | — | 基準表を写さず参照する設計 |
| C07 | 採用 | — | — | iOS_WebApp 側の DADS 権利条件の受け皿 |
| C08 | 採用（要試行） | — | — | 発生1件。受け皿になる候補がない |
| C09 | 採用 | — | — | — |
| C10 | 採用 | — | — | B11 の受け皿 |
| C11 | 採用 | — | — | — |

C系が10件とされている件（第2節）: 上の11行のうち、ラウンド2に存在しない1行は比較の対象から外す。

---

## 7. 統合後の構成案【評価】

| 区分 | 構成 |
|---|---|
| 単一HTMLの変更系（B系） | B02（差し替え前）→ B10（機械置換）→ B01（構造検査）。版の扱いは B03、保存データは B04、iOS は B05、PWA は B06、移植は B07 |
| 公開・依存系 | B12（個人情報・送信）、B13（外部依存。app で見送った許可リスト監査を含められる）、C07（権利条件。iOS_WebApp の DADS 表記を含む） |
| 運用統制系 | B08（フェーズ）、B09（凍結）、C09（版間差分）、C01（受領物の検査） |
| 調査・監査系 | C02（最終工程）、C04、C06、C08、C10（＋B11）、C11 |
| 既存スキルへの吸収 | 「徹底調査一次情報検証」に C03（台帳と昇格の記録）と C05（購入の確認項目と確定前の提示）を節として追加する案。既存スキルを改訂することになるため、本人の判断が要る |

---

## 8. 横断で検出した不整合（事実。修正はしていない）

| # | 内容 | 箇所 |
|---|---|---|
| X1 | iOS_WebApp INDEX §6 は「DADS トークン適用とライセンス表記」の選外理由に「ライセンス・出典の公開面は12の対象」と書いている。B12 `public-repo-exposure-check` の原文（発動条件・出力・手順）には、ライセンス・出典表示の項目がない | iOS_WebApp `skills-drafts/INDEX.md` §6、`skills-drafts/public-repo-exposure-check/SKILL.md` |
| X2 | app INDEX §7 は「外部取得の許可リスト監査（`coorde-fetch.js`、§15.9）」を範囲が狭いとして見送った。iOS_WebApp の B13 は、coorde の中継が別リポジトリの `coorde-fetch.yml` に頼っていることを対象に含めて採用している。同じ対象への判定が2つのリポジトリで分かれている | app `skills-drafts/INDEX.md` §7、iOS_WebApp `skills-drafts/external-dependency-inventory/SKILL.md` 手順4 |
| X3 | app INDEX §7 は §14 を「スキルにすると同じ規則を二か所で持つ」理由で見送った。iOS_WebApp INDEX は、各 `CLAUDE.md` に規則がすでにあるフェーズ管理（B08）を採用している。どちらの INDEX も相手側の基準に触れていない | app `skills-drafts/INDEX.md` §7、iOS_WebApp `sidebiz/00_core/CLAUDE.md:25-40`（`claude/phase-0-execution-trd0vd`） |
| X4 | マチアプ手帳が両リポジトリに別版で存在する（app ルート `index.html` は `APP_VERSION = "1.0.0"`・`sw.js` は `machiapp-techo-1.0.0`、iOS_WebApp `machiapp-techo/` は `2.1.0`）。両者の関係はどちらの INDEX にも記載がない | app `index.html:10272`、`sw.js:2`。iOS_WebApp `machiapp-techo/index.html:10388` |
| X5 | 選定基準の有無が違う。iOS_WebApp INDEX は選定基準3項目を明記している（§1）が、app INDEX には選定基準の記載がない。2つの系統は異なる基準で抽出されている | 両 `skills-drafts/INDEX.md` |
| X6 | app INDEX の第5節「根拠区分（提案）」と、B系の各 `SKILL.md` の区分（OK・NG・該当なし・未確認、PASS・FAIL）が統一されていない | app INDEX §5、iOS_WebApp 各 `SKILL.md` の出力表 |

---

## 9. 未確認・限界

| # | 事項 | 理由 |
|---|---|---|
| U1 | ラウンド1の統合リストとラウンド2の判定・統合先 | 前提ファイルがない（第1節） |
| U2 | B系・C系とリポジトリ側の候補との対応、C系の10件と11件の差 | 前提ファイルがない |
| U3 | A系の候補との重複 | A系の内容が不明 |
| U4 | 既存スキル（engineering:code-review、security-review、data:validate-data、engineering:testing-strategy、engineering:deploy-checklist、design:accessibility-review）との重複 | 本文を読んでいない。説明文だけで判断した。重複が大きくても、本書の判定は変えていない |
| U5 | Muse の現在の段階 | 記録がない（C05 の判定にかかわる） |
| U6 | app リポジトリの GitHub Pages の配信オリジンと公開状態 | 確認していない。iOS_WebApp と同じオリジンなら、B04・B06 の「同一オリジン」の範囲が app にも及ぶ |
| U7 | INDEX §9 に記録されたスクリプト検証結果（B01・B02・B05・B10） | 本書では再実行していない。件数の照合（第4節の「実測で一致」）は grep・git での照合に限る |
| U8 | 下書き24件の試行（発動の精度・出力の質） | 両 INDEX と同じく未実施 |

---

## 10. 本人が決めること

- 第6節の照合（前提ファイルが見つかった場合）と、判定の変更を採るかどうか
- 吸収3件の扱い（特に、既存スキル「徹底調査一次情報検証」を改訂するかどうか）
- B03 の命名規則と台帳の置き場
- 第8節 X1〜X3 で分かれた基準を、どちらに揃えるか
- 第8節 X4（マチアプ手帳の2版）の扱い

---

## Sources（実際に取得・実行したもの）

- app `origin/claude/ecstatic-euler-k3jxb7`（`ec9e5bd`）: `skills-drafts/INDEX.md`、`skills-drafts/*/SKILL.md` 11件（全文）
- iOS_WebApp `origin/claude/adoring-babbage-vtlodn`（`84ceb74`）: `skills-drafts/INDEX.md`、`skills-drafts/*/SKILL.md` 13件（全文）
- app（`claude/wizardly-newton-hqrast` = `main` と同じコミット `6739469`）: `muse-setup-v4.md:79-95`、`:199-224`、§11.1、`docs/app-build-guide_v5.md`（見出し全体、`:82-93`、`:395-437`）、`apps/uranai/AUDIT_v5.md`、`apps/shusshin/README.md`、`apps/shusshin/build/build.py:30-45`、`index.html`、`sw.js`
- iOS_WebApp（`claude/wizardly-newton-hqrast` = `48949ec`）: ルート直下の HTML 全件と `coorde/`・`machiapp-techo/` に対する grep（`localStorage.clear()`、`user-scalable=no`、`chart.js`、viewport、`exchangerate-api`、`qrserver`、特殊入力値）、`coorde/sw.js`、`machiapp-techo/sw.js`
- iOS_WebApp `origin/claude/generate-railway-data-uTIy4`: `data/silentize.py`、`data/embed_data.py`、`data/generate_railway_data.py`（`KANJI_READINGS`）、`PHASE_C_SILENCE_LOCK.md`、`B-2_INTERNAL_AUDIT.log`、コミット履歴
- iOS_WebApp `origin/claude/phase-0-execution-trd0vd`: `sidebiz/runbook/phase_gates.md`、`sidebiz/00_core/CLAUDE.md`
- iOS_WebApp `origin/claude/dasgen-local-setup-929p4z`: `dasgen/CLAUDE.md`
- 既存スキル「徹底調査一次情報検証」の `SKILL.md`（本文）
- 両リポジトリの PR 一覧（本文を含む）、GitHub コード検索
