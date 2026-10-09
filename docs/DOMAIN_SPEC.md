# DOMAIN_SPEC.md

# 言葉の温度差：データモデル・計算仕様

この文書は Phase 2（コアロジック）の仕様であり、`src/domain/` と `src/data/` の実装と一致させる。
すべて React に依存しない純粋な TypeScript とし、Vitest で単体テストする（`tests/domain/`・`tests/data/`）。

関連文書：[PRD.md](PRD.md) / [UX_SPEC.md](UX_SPEC.md) / [TECH_SPEC.md](TECH_SPEC.md)

---

## 1. 基本方針

1. 比較は **2つの閉区間の幾何学的な関係** だけを扱う。
2. 計算結果から「誤解する確率」「すれ違い率」「相性スコア」などを **算出しない・表示しない**。
3. 回答範囲を確率分布（一様分布など）とみなさない。範囲は「この言葉が当てはまると感じる時間の範囲」というユーザーの申告であり、その内部に重みや分布は仮定しない。
4. 「重なりがない ＝ 必ず誤解する」「重なりがある ＝ 誤解しない」と断定しない。
5. どちらの回答が正しいか・普通かを判定する値や文言を生成しない。
6. **言葉の解釈** と **実際に行動できる時間** を区別する。比較結果から出す時間の候補は解釈の手がかりであり、実行できる約束とみなさない（§7）。

---

## 2. 時間の単位・起点・最大値

### 2.1 時間単位

- 内部の時間単位は **整数秒**（型 `Seconds`）。
- 表示時に秒・分・時間へ変換する（§9.1）。

### 2.2 シナリオ（言葉・場面・起点・終点・最大値）

実装：`src/data/scenarios.ts`

| ID | 言葉 | 使用場面 | 起点（0秒） | 終点（測る時点） | 最大値 | 入力の刻み |
|---|---|---|---|---|---|---|
| `sugu-iku` | すぐ行く | 友だちと待ち合わせ中。先に着いたあなたに、友だちから「すぐ行く」とメッセージが来た。 | メッセージが届いた時点 | 友だちが到着する時点 | 60分（3600秒） | 1分 |
| `chotto-matte` | ちょっと待って | 家の人に「ちょっと来て」と呼ばれて、「ちょっと待って」と返事をした。 | 「ちょっと待って」と言った時点 | 呼んだ人のところへ行く時点 | 30分（1800秒） | 10秒 |
| `atode-yaru` | あとでやる | 家の人に「宿題やったの？」と聞かれて、「あとでやる」と答えた。 | 「あとでやる」と答えた時点 | 宿題を **始める** 時点 | 12時間（43200秒） | 5分 |

- 「あとでやる」の終点を「始める時点」とするのは、宿題の量という別の要因を混ぜないため。
- **最大値はアプリで扱う比較範囲の上限であり、言葉の意味の客観的な上限ではない。** 上限を超える解釈もありうることを UI で明記する（UX_SPEC §3）。
- 入力の刻み（`inputStepSeconds`）は UI のスライダー・数値入力のためのもの。ドメインの比較計算は刻みに依存せず、`[0, maxSeconds]` 内の任意の整数秒で動作する。

### 2.3 0秒・長さ0の範囲

- 0秒は「起点と同時（ただちに）」を意味し、有効な値である。
- `start === end`（長さ0の範囲）も有効な回答である（「ちょうど5分」）。

---

## 3. 型定義

実装：`src/domain/types.ts`（セッション関連は `src/domain/session.ts`）

| 型 | 内容 |
|---|---|
| `Seconds` | 0 以上の整数秒 |
| `TimeRange` | 閉区間 `{ start, end }` |
| `RangeDraft` | 入力途中の範囲 `{ start: Seconds \| null, end: Seconds \| null }`。null は未入力 |
| `ScenarioId` | `'sugu-iku' \| 'chotto-matte' \| 'atode-yaru'` |
| `Scenario` | id, phrase, scene, question, originLabel, endpointLabel, maxSeconds, inputStepSeconds, agreementTemplate, feasibilityTemplate |
| `ParticipantId` | `'A' \| 'B'` |
| `Mode` | `'solo' \| 'duo'` |
| `SampleAnswer` | 架空のサンプル回答。sampleId, name, scenarioId, range, note, `fictional: true` |
| `RangeRelation` | 6種類の関係（§5.4） |
| `ComparisonResult` | 比較結果（§5.5） |
| `ComparisonDescription` | 説明文 `{ headline, details, prompt }`（§9.2） |
| `AgreementCandidate` | 具体化の候補 `{ seconds, basis }`（§7.2） |

ひとりモードでは「あなた」を A、架空サンプルを B として比較する。

---

## 4. 入力の検証（不正入力の扱い）

実装：`src/domain/range.ts`

```ts
type RangeValidationError = 'incomplete' | 'not-integer' | 'negative' | 'exceeds-max' | 'start-after-end'
type ValidationResult = { ok: true; range: TimeRange } | { ok: false; errors: RangeValidationError[] }

validateRange(range: TimeRange, maxSeconds: Seconds): ValidationResult
validateDraft(draft: RangeDraft, maxSeconds: Seconds): ValidationResult
```

| エラー | 条件 |
|---|---|
| `incomplete` | `validateDraft` で start または end が null（未入力） |
| `not-integer` | 整数でない（NaN・Infinity を含む） |
| `negative` | 0 未満 |
| `exceeds-max` | maxSeconds を超える |
| `start-after-end` | start > end（逆転した区間） |

- 例外を投げず結果型で返す。該当するエラーはすべて重複なしで列挙する。
- 自動修正（入れ替え・丸め込み）は行わない。
- `compareRanges` は不正な区間を受け取ると `Error` を投げる（UI が検証を通さずに呼んだプログラムの誤りとして扱う）。

---

## 5. 区間計算

A = [a1, a2]、B = [b1, b2]（いずれも両端を含む閉区間）。実装：`src/domain/range.ts`

### 5.1 共通範囲と重なり

```
lo = max(a1, b1)、hi = min(a2, b2)
intersectRanges(A, B)   = lo <= hi ? [lo, hi] : null
hasIntersection(A, B)   = intersectRanges(A, B) !== null
intersectionLength(A, B) = 共通範囲があれば hi - lo、なければ 0
```

- 境界の1点だけで接する場合も **共通点が存在する**（`hasIntersection = true`、共通範囲は長さ0の区間）。
- **意味**：2人とも「この言葉が当てはまる」と感じた時間。
- **限界**：共通範囲の中の時間でも、相手が実際にその時間を意図しているとは限らない。

### 5.2 区間の空白

```
gapBetween(A, B) = max(0, max(a1, b1) - min(a2, b2))
```

- **意味**：2人の範囲のあいだの、どちらも当てはまると答えなかった時間の長さ。共通点があれば 0。
- **限界**：空白が大きくても、実際の会話で困るとは限らない。

### 5.3 中心値と中心値の差

```
midpoint(R) = (start + end) / 2
midpointDifference(A, B) = |midpoint(A) - midpoint(B)|
```

- 0.5秒単位の値になりうる（例：[0, 1] の中心値は 0.5）。
- **意味**：それぞれの範囲の「まんなか」同士の距離。範囲全体が早め／遅めのどちらに寄っているかの目安。
- **限界**：中心値は「その人が最もありそうだと思う時間」ではない。UI では「範囲のまんなか」と表現し、「平均」「いちばん多い」「本当の答え」などの語を使わない。図には描かず文章でのみ示す（UX_SPEC §4）。

### 5.4 6種類の関係と判定の優先順位

`classifyRelation(A, B)` は上から順に判定し、最初に当てはまったものを返す。順序で判定するため、1つの組が複数に分類されることはない。

| 順 | relation | 条件 |
|---|---|---|
| 1 | `identical` | a1 = b1 かつ a2 = b2 |
| 2 | `a-contains-b` | a1 ≤ b1 かつ b2 ≤ a2（1 を除く） |
| 3 | `b-contains-a` | b1 ≤ a1 かつ a2 ≤ b2（1 を除く） |
| 4 | `overlap` | 共通範囲の長さ > 0（1〜3 を除く） |
| 5 | `touch` | 共通点がちょうど1点（1〜3 を除く） |
| 6 | `gap` | 共通点なし |

- 完全一致は包含より優先する（一致は双方向の包含でもあるため）。
- 2 と 3 が同時に成り立つのは一致のときだけなので、1 を先に判定すれば重複しない。
- 包含は接触より優先する（例：点 [600, 600] と [0, 600] は `b-contains-a`）。

### 5.5 比較結果（compareRanges）

```ts
interface ComparisonResult {
  relation: RangeRelation
  hasIntersection: boolean
  intersection: TimeRange | null
  intersectionLength: Seconds
  gapLength: Seconds
  midpointA: number
  midpointB: number
  midpointDifference: number
  laterMidpoint: 'A' | 'B' | 'same'
}
```

### 5.6 境界値（すべてテスト済み）

| ケース | A | B | relation | 共通範囲 | 空白 |
|---|---|---|---|---|---|
| 完全一致 | [60, 300] | [60, 300] | identical | [60, 300] | 0 |
| 一部重複 | [0, 900] | [180, 1800] | overlap | [180, 900] | 0 |
| 完全分離 | [0, 300] | [900, 1800] | gap | null | 600 |
| A が B を包含 | [0, 1800] | [300, 600] | a-contains-b | [300, 600] | 0 |
| B が A を包含 | [300, 600] | [0, 1800] | b-contains-a | [300, 600] | 0 |
| 1点接触 | [0, 300] | [300, 900] | touch | [300, 300] | 0 |
| 端点を共有する包含 | [0, 600] | [0, 300] | a-contains-b | [0, 300] | 0 |
| 長さ0の点が範囲内 | [300, 300] | [0, 600] | b-contains-a | [300, 300] | 0 |
| 長さ0の点が範囲の端 | [600, 600] | [0, 600] | b-contains-a | [600, 600] | 0 |
| 同じ点 | [300, 300] | [300, 300] | identical | [300, 300] | 0 |
| 異なる点 | [60, 60] | [300, 300] | gap | null | 240 |
| 0秒を含む | [0, 60] | [0, 0] | a-contains-b | [0, 0] | 0 |
| 中心値が0.5秒 | [0, 1] | [0, 0] | a-contains-b | [0, 0] | 0（中心値の差 0.5） |

### 5.7 意図的に導入しない指標

| 指標 | 導入しない理由 |
|---|---|
| すれ違い率・誤解率 | 範囲の重なりから誤解の発生確率を推定する根拠がない |
| 相性スコア・一致度（%） | 「点数」「正解・不正解」に見え、判定しない方針に反する |
| 重なり率（共通範囲 ÷ 和集合など） | 数学的には定義できるが、スコアとして受け取られやすい。MVP では使わない |
| 平均・分布 | 2人の比較では意味が薄く、サンプルを統計と誤認させる恐れがある |

---

## 6. 線形時間軸の座標計算

実装：`src/domain/scale.ts`

- 時間軸は **実際の経過時間に比例する線形軸** とする。
- 表示範囲（`domain`、秒）と描画座標（`range`、px など）を持つ `LinearScale` を作り、相互に変換する。
- 表示範囲を変えた scale を作り直すだけで拡大表示に対応できる。Phase 3 では「全体表示」と「拡大表示」の2つを切り替える（任意の倍率のズーム UI は作らない）。

```ts
createLinearScale(domain: {start, end}, range: {start, end}): LinearScale
timeToCoordinate(scale, seconds, { clamp? }): number
coordinateToTime(scale, coordinate, { clamp?, round? }): number
projectRange(scale, range: TimeRange): ProjectedRange | null
generateTicks(view: TimeRange, maxTicks: number): Seconds[]
computeZoomView(ranges: TimeRange[], maxSeconds): TimeRange
```

| 関数 | 仕様 |
|---|---|
| `createLinearScale` | domain の end ≤ start、range の長さ 0、有限でない値は `RangeError`。range は逆向き（start > end）も可 |
| `timeToCoordinate` | `rangeStart + (t - domainStart) / (domainEnd - domainStart) × (rangeEnd - rangeStart)`。既定では表示範囲外も比例して外挿。`clamp: true` で端に丸める |
| `coordinateToTime` | 上の逆変換。`clamp` で表示範囲に丸め、`round` で整数秒に四捨五入 |
| `projectRange` | 範囲を座標に変換し、表示範囲からはみ出した部分を切り取る（`clippedAtStart`・`clippedAtEnd`）。表示範囲と共通点がなければ null。表示範囲の端に接する範囲は残す |
| `generateTicks` | 目盛りの間隔を候補（1秒〜24時間の「切りのよい」値）から選ぶ。目盛り数が `maxTicks` 以下になる最小の間隔の倍数を、表示範囲内に並べる。間引きは目盛りを減らすだけで、比例関係は変えない |
| `computeZoomView` | 拡大表示の表示範囲。すべての範囲を含む区間 [最小の start, 最大の end] の長さに、両側 15%（`ZOOM_PADDING_RATIO`）の余白を足す（最小 `MIN_ZOOM_SPAN` = 30秒）。中心をそろえて置き、0 未満・最大値超過になる場合は内側へずらす。結果は整数秒（外側へ切り上げ）。全体より広くなる場合は `[0, maxSeconds]` を返す |

- 短い範囲を見やすくするために、実際の幅より太く描く「最小描画幅」は使わない。代わりに拡大表示を使う。

---

## 7. 言葉の具体化（解釈と実行可能性の区別）

実装：`src/domain/agreement.ts`

### 7.1 方針

- 比較結果から出す時間の候補は **解釈の手がかり** であり、実行できる約束ではない。
- アプリは時間を自動で決定しない。初期状態は未選択。
- ユーザーが時間を選び、**その時間で実際にできるか（実行可能性）を本人が確認したうえで** 承認する。確認なしの承認はセッションが拒否する（§8）。

### 7.2 候補（agreementCandidates）

- 文型は「◯◯以内」「◯◯だけ」のように上限を約束する形のため、候補には範囲の **終わり** を使う。
  - `end-of-intersection`：共通範囲の終わり（共通点がある場合のみ）
  - `end-of-a`：A の範囲の終わり
  - `end-of-b`：B の範囲の終わり
- 0秒は除外する。同じ秒数は `end-of-intersection` > `end-of-a` > `end-of-b` の優先順で1つにまとめ、昇順に並べる。候補は 0〜3 個。
- 中間値などの **妥協点は生成しない**。

### 7.3 選べる時間

- `isValidAgreementSeconds`：1秒以上、maxSeconds 以下の整数。候補以外の時間も選べる。

### 7.4 文の生成

| ID | 終点（入力した時間の意味） | agreementTemplate（例：600秒） | いつ（agreementWhen） | 何をする（agreementAction） | feasibilityTemplate（例：600秒） |
|---|---|---|---|---|---|
| `sugu-iku` | 友だちが着く | 今から10分以内に着くね | 今から10分以内 | 着く | 今から10分以内に、本当に着けそう？ |
| `chotto-matte` | 呼んだ人のところへ行く | 今から10分以内にそっちへ行くね | 今から10分以内 | そっちへ行く | 今から10分以内に、本当に行けそう？ |
| `atode-yaru` | 宿題を始める | 今から10分以内に宿題を始めるね | 今から10分以内 | 宿題を始める | 今から10分以内に、本当に宿題を始められそう？ |

- `buildAgreementText`・`buildFeasibilityQuestion`・`buildAgreementParts` が `{time}` を `formatDuration` の結果で置換する。
- **完成文の意味**：比較で答えた範囲は「起点 → 終点」の時間なので、完成文も終点と同じ時点（到着・行く・宿題を始める）を「◯以内」で約束する形にする。時間は起点（メッセージが届いた／言った／答えた瞬間）から数え、文では「今から」で表す（Phase 7）。画面では「「今から」は、メッセージが届いたときのことです。」と補足する。
- `buildAgreementParts` は完成文を「いつ」「何をする」に分ける。どちらも文にそのまま含まれる語だけで、文にない情報を足さない（テストで確認）。

#### Phase 7 の変更（理由と影響範囲）

| 変更前 | 変更後 | 理由 |
|---|---|---|
| 「10分以内に着くね」など | 「今から10分以内に着くね」など（3シナリオとも。実行可能性の問いも同じ） | 起点が文に含まれず、コピーした文だけでは「いつからの10分か」が分からなかった。3シナリオとも起点は「その言葉を伝えた瞬間」なので「今から」で表せる |

影響範囲：`src/data/scenarios.ts` の `agreementTemplate`・`agreementWhen`・`feasibilityTemplate`、具体化画面の起点の注記、関連テスト。計算・候補・状態遷移は変えていない。

#### Phase 6B の変更（理由と影響範囲）

| 変更前 | 変更後 | 理由 |
|---|---|---|
| すぐ行く「10分以内に行くね」 | 「10分以内に着くね」 | 終点は「友だちが着く」（到着）。「行く」は出発とも読め、答えた時間と意味がずれる |
| ちょっと待って「10分だけ待ってて」 | 「10分以内にそっちへ行くね」 | 文に「何をするか」がなかった。終点（呼んだ人のところへ行く）を文に入れる |
| ちょっと待って「10分で、本当に行けそう？」 | 「10分以内に、本当に行けそう？」 | 完成文（以内）と形をそろえる |
| あとでやる「10分以内に始めるね」 | 「10分以内に宿題を始めるね」 | 何を始めるかを文に入れる |

影響範囲：`src/data/scenarios.ts`（文型と、新しい `agreementWhen`・`agreementAction`）、`Scenario` 型、`AgreementView.parts`、具体化・完了画面の表示、関連テスト。比較の計算・候補（`agreementCandidates`）・入力の検証は変えていない。

---

## 8. セッション状態

実装：`src/domain/session.ts`（状態遷移）、`src/domain/views.ts`（UI へ渡す情報の選択）

### 8.1 状態

```ts
type SessionStep = 'HOME' | 'SCENARIO_SELECT' | 'INPUT_A' | 'HANDOFF' | 'INPUT_B'
                 | 'READY_TO_REVEAL' | 'COMPARISON' | 'AGREEMENT' | 'COMPLETE'

interface SessionState {
  step: SessionStep
  mode: Mode | null
  scenarioId: ScenarioId | null
  draft: RangeDraft            // 入力中の範囲。初期値は未入力 { start: null, end: null }
  answerA: TimeRange | null
  answerB: TimeRange | null    // ふたりモードの2人目
  sampleId: string | null      // ひとりモードで比較中の架空サンプル
  agreement: { seconds: Seconds | null; approvedBy: ParticipantId[] }
}
```

### 8.2 イベント

| イベント | 内容 |
|---|---|
| `SELECT_MODE { mode }` | モードを選ぶ |
| `SELECT_SCENARIO { scenarioId }` | シナリオを選ぶ |
| `SET_DRAFT { draft }` | 入力中の範囲を更新する（確定ではない） |
| `SUBMIT_ANSWER` | 入力中の範囲を回答として確定する |
| `START_INPUT_B` | 交代画面から B の入力へ |
| `REVEAL` | 公開前画面から比較へ |
| `SELECT_SAMPLE { sampleId }` | ひとりモードで比較するサンプルを変える |
| `START_AGREEMENT` | 比較から具体化へ |
| `CHOOSE_AGREEMENT_TIME { seconds }` | 具体化の時間を選ぶ（確認はリセット） |
| `APPROVE_AGREEMENT { participant, feasibilityConfirmed }` | 実行可能性を確認したうえで承認する |
| `REVISE_AGREEMENT` | 時間の選択からやり直す |
| `BACK` | 1つ前へ（許可された画面のみ） |
| `RESTART_SAME_MODE` | 同じモードのまま、シナリオ選択からやり直す |
| `RESET` | 最初（HOME）に戻る |

### 8.3 遷移表

| 現在 | イベント | 次 | 条件・備考 |
|---|---|---|---|
| HOME | SELECT_MODE | SCENARIO_SELECT | |
| SCENARIO_SELECT | SELECT_SCENARIO | INPUT_A | 存在するシナリオのみ。draft は未入力 |
| SCENARIO_SELECT | BACK | HOME | |
| INPUT_A / INPUT_B | SET_DRAFT | 同じ | |
| INPUT_A | SUBMIT_ANSWER | solo: COMPARISON / duo: HANDOFF | draft が完全かつ有効なときのみ。solo では先頭のサンプルを選ぶ |
| INPUT_A | BACK | SCENARIO_SELECT | 入力は破棄 |
| HANDOFF | START_INPUT_B | INPUT_B | draft は未入力 |
| INPUT_B | SUBMIT_ANSWER | READY_TO_REVEAL | draft が完全かつ有効なときのみ |
| INPUT_B | BACK | HANDOFF | **INPUT_A には戻れない** |
| READY_TO_REVEAL | REVEAL | COMPARISON | |
| COMPARISON | SELECT_SAMPLE | 同じ | solo のみ。同じシナリオのサンプルのみ |
| COMPARISON | START_AGREEMENT | AGREEMENT | |
| AGREEMENT | CHOOSE_AGREEMENT_TIME | 同じ | 1秒以上・上限以下の整数。承認をリセット |
| AGREEMENT | APPROVE_AGREEMENT | 同じ / COMPLETE | 時間選択済み・`feasibilityConfirmed: true`・承認すべき人・未承認のときのみ。solo は A、duo は A と B がそろうと COMPLETE |
| AGREEMENT | REVISE_AGREEMENT | 同じ | 時間と承認をクリア |
| AGREEMENT | BACK | COMPARISON | 時間と承認をクリア |
| COMPARISON / AGREEMENT / COMPLETE | RESTART_SAME_MODE | SCENARIO_SELECT | mode だけ残して初期化 |
| すべて | RESET | HOME | 全状態を初期化 |

- COMPARISON からの BACK は拒否する（入力画面へは戻らない）。やり直しは RESTART_SAME_MODE または RESET。
- 表にない組み合わせはすべて **拒否** する。

### 8.3b 確認の取り消し（Phase 6B）

| イベント | 条件 | 結果 |
|---|---|---|
| `WITHDRAW_APPROVAL { participant }` | step が `AGREEMENT` で、その人が確認済み | その人を `approvedBy` から外す。選んだ時間はそのまま。確認していない人は `not-approved` で拒否 |

- 完了（`COMPLETE`）は、これまでどおり必要な全員（ふたりモードは A と B）が確認したときだけ。
- 時間を変える（`CHOOSE_AGREEMENT_TIME`）・選びなおす（`REVISE_AGREEMENT`）と、確認はすべてリセットされる（変更なし）。

### 8.4 拒否の扱い

```ts
transition(state, event, catalog): { ok: true; state } | { ok: false; state; error: TransitionError }
createSessionReducer(catalog): (state, event) => state   // useReducer 用
```

- 拒否時は元の state オブジェクトをそのまま返し、理由（`TransitionError`）を付ける：
  `invalid-event-for-step` / `unknown-scenario` / `unknown-sample` / `invalid-answer` / `invalid-agreement-time` / `agreement-time-not-chosen` / `feasibility-not-confirmed` / `invalid-participant` / `already-approved`
- シナリオとサンプルは `SessionCatalog` として引数で渡す（テストで差し替え可能。既定は `src/data/catalog.ts`）。

### 8.5 UI へ渡す情報（views.ts）

| 関数 | 返す情報 | 返す画面 |
|---|---|---|
| `selectInputView` | participant, mode, scenario, draft, canSubmit | INPUT_A / INPUT_B |
| `selectComparisonView` | scenario, a・b（ラベルと範囲）, result, description, candidates, samples, selectedSampleId | COMPARISON / AGREEMENT / COMPLETE |
| `selectAgreementView` | seconds, text, feasibilityQuestion, approvedBy, requiredApprovers | AGREEMENT / COMPLETE |

- `selectInputView` は **もう一方の回答を含まない**。ふたりモードで B の入力画面に A の回答が届かない（テスト済み）。
- `selectComparisonView` は比較画面以降でのみ値を返す（READY_TO_REVEAL では null）。
- ラベル：ひとりモードは「あなた」と「ソラ（架空）」、ふたりモードは「Aさん」「Bさん」。

---

## 9. 表示用の文字列

### 9.1 時間の表示（format.ts）

| 入力 | 表示 |
|---|---|
| 0 | 0分 |
| 1〜59秒 | N秒 |
| 60〜3599秒 | N分（端数があれば N分M秒） |
| 3600秒以上 | N時間（端数があれば N時間M分。秒は切り捨て） |

- 0.5秒単位の値は四捨五入（0.5 は切り上げ）してから表示する。負の値・非有限値は `RangeError`。
- `formatRange`：「5分〜15分」。長さ0は「5分」。
- `formatSampleLabel`：「ソラ（架空）」。データの `name` には「（架空）」を含めず、表示時に必ず付ける。

### 9.2 比較結果の説明文（describe.ts）

生成ルール：

1. 範囲の値・共通範囲・空白・中心値の差だけを用いる。
2. 「正しい」「正解」「間違い」「普通」「常識」「相性」「確率」「誤解」「すれ違い」「率」「%」「スコア」「点数」「ずれ」「〜すぎ」「良い」「悪い」を使わない（テストで検査）。
3. どちらかを基準にしない（「B のほうがまんなかが◯分あと」は可）。
4. 誤解を断定しない。

| relation | headline（例） | details |
|---|---|---|
| identical | 2人の「すぐ行く」はぴったり同じでした | 2人とも◯〜◯だと考えていました。 |
| a-contains-b / b-contains-a | Bさんの「すぐ行く」は、Aさんの範囲にすっぽり入っています | 両者の範囲／共通しているのは◯〜◯です。／中心値の文 |
| overlap | 2人の「すぐ行く」は一部だけ重なっています | 両者の範囲／2人とも当てはまると考えたのは◯〜◯です。／中心値の文 |
| touch | 2人の「すぐ行く」は5分の1点だけで重なっています | 両者の範囲／共通しているのは5分ちょうどの1点です。／中心値の文 |
| gap | 2人の「すぐ行く」は重なりませんでした | 両者の範囲／2人の範囲のあいだには◯のひらきがあります。／中心値の文／このまま使うと、思っていた時間がちがうかもしれません。 |

- 中心値の文：差が 0 なら「範囲のまんなかは同じです。」、それ以外は「範囲のまんなかは、◯◯のほうが◯分あとです。」
- prompt（共通）：「同じ言葉でも、思い浮かべる時間はちがうことがあります。具体的な時間にしてみましょう。」

---

## 10. 架空のサンプルデータ

実装：`src/data/samples.ts`（値は [DEMO_SPEC.md](DEMO_SPEC.md) §7）

- 各シナリオ 3 件。すべて `fictional: true`。値は入力の刻みに合う。
- ファイル冒頭のコメントと画面表示で架空であることを明記する。
- 集計（平均・多数決など）して表示しない。
- 各シナリオの先頭のサンプルが最初に表示される。

---

## 11. テスト（Phase 2 で実装済み）

| ファイル | 内容 |
|---|---|
| `tests/domain/range.test.ts` | 検証（逆転・上限超過・負・非整数・未入力・複数エラー）、共通範囲・空白・中心値（0.5秒）、6分類と境界値、対称性、gap と共通点の排他性 |
| `tests/domain/format.test.ts` | 時間表示の各形式と丸め、範囲表示、架空ラベル |
| `tests/domain/describe.test.ts` | 6分類の説明文、禁止語が含まれないこと |
| `tests/domain/agreement.test.ts` | 候補の生成（0除外・重複統合・妥協点なし）、時間の検証、文型 |
| `tests/domain/scale.test.ts` | 線形変換の正確性・逆変換・外挿と丸め・表示範囲の変更・切り取り・目盛り・拡大表示の範囲計算 |
| `tests/domain/session.test.ts` | 両モードの全体の流れ、未入力回答の確定拒否、不正な遷移、INPUT_B → INPUT_A 不可、実行可能性の確認、リセット・やり直し |
| `tests/domain/views.test.ts` | B の入力画面に A の回答が含まれないこと、公開前に比較が出ないこと |
| `tests/data/catalog.test.ts` | シナリオの最大値・刻み、サンプルの件数・有効性・架空フラグ |

## 12. 場面を変えて比べる（Phase 6A）

既存の2区間の比較（§5〜§8）には手を入れず、別の純粋関数と状態として追加した。

### 12.1 場面データ（`src/data/contextScenes.ts`）

| 番号 | id | 言葉 | 場面 | 終点 |
|---|---|---|---|---|
| ① | `tell-friend` | すぐ行く | 待ち合わせをしている友だちに「すぐ行く」と伝えた | 行くために動き出す |
| ② | `reply-message` | すぐ返信する | 友だちからのメッセージに「すぐ返信する」と伝えた | 返信を書き始める |
| ③ | `start-homework` | すぐ始める | 家の人に、宿題を「すぐ始める」と伝えた | 宿題を始める |

- 共通設定（`CONTEXT_SETTINGS`）：起点「言葉を伝えた」（0秒）、上限 1800秒（30分）、スライダーの刻み 60秒。数値入力は「分・秒」（`unitsFor`）。
- 既存シナリオ `sugu-iku` は終点が「友だちが着く」・上限60分で、測るものが違う。混ぜないため別に定義した。

### 12.2 入力と状態（`src/domain/contextSession.ts`）

```ts
interface ContextState {
  step: 'INPUT' | 'RESULT'
  index: number                     // 答えている場面（0〜2）
  draft: RangeDraft                 // 初期値は未入力
  answers: (TimeRange | null)[]     // 確定した回答
}
type ContextEvent = SET_DRAFT | SUBMIT_ANSWER | BACK | RETRY
```

- `SUBMIT_ANSWER` は既存の `validateDraft(draft, 1800)` で検証し、不正なら拒否（state は変わらない）。最後の場面のあとは `RESULT`。
- 次の場面の入力欄は空（前の回答を引き継がない）。`BACK` で前の場面に戻ると、その場面の回答を入力欄に戻す。最初の場面の `BACK` は拒否し、App がスタート画面へ戻す。
- `RETRY` は初期状態へ。App の「最初から」は既存セッションと両方をリセットする。

### 12.3 3区間の比較（`compareContextRanges`）

範囲は検証済み（0 ≤ start ≤ end ≤ 上限の整数秒）を前提とする。

- 共通部分：`commonMin = max(各 start)`、`commonMax = min(各 end)`。`commonMin <= commonMax` のときだけ `{ start: commonMin, end: commonMax }`、それ以外は `null`。2区間ずつの `intersectRanges` を重ねた結果と一致する（テストで全組み合わせを確認）。
- `commonIsPoint`：共通部分があり `commonMin === commonMax`。
- `allIdentical`：すべての start と end がそれぞれ等しい。**共通部分があっても一致とは限らない**（例：0〜30分・5〜10分・5〜10分は共通 5〜10分だが一致ではない）。
- まんなか（`midpoint`）が最も早い／遅い場面の番号（同じ値ならすべて）と、その差 `midpointSpread`。

### 12.4 説明文（`describeContextComparison`）

| 条件 | 文 |
|---|---|
| allIdentical | 見出し「3つの場面で、あなたの「すぐ」は同じでした」。「3つの場面で、選んだ時間が同じでした。」「どの場面も◯でした。」 |
| それ以外 | 見出し「場面によって、あなたの「すぐ」の範囲が違いました」。「場面によって、選んだ時間の範囲が違いました。」 |
| 共通部分あり | 「3つの場面に共通する時間があります。共通するのは◯〜◯です。」 |
| 共通が1点 | 「3つの場面に共通する時間があります。共通するのは、ちょうど◯の1点です。」 |
| 共通なし | 「3つすべてに共通する時間はありません。」 |
| まんなか | 同じなら「範囲のまんなかは、どの場面も同じでした。」、違えば「範囲のまんなかがいちばん早いのは「◯」、いちばん遅いのは「◯」で、◯ちがいます。」 |

性格・正しさ・誤解・割合・「必ず」などの語を使わない（テストで確認）。
