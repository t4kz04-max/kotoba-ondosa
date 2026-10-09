# DOMAIN_SPEC.md

# 言葉の温度差：データモデル・計算仕様

この文書は Phase 2（コアロジック実装）の直接の入力となる。
ここで定義する型・関数はすべて React に依存しない純粋な TypeScript として `src/domain/` に実装する。

関連文書：[PRD.md](PRD.md) / [UX_SPEC.md](UX_SPEC.md) / [TECH_SPEC.md](TECH_SPEC.md)

---

## 1. 基本方針

1. 比較は **2つの閉区間の幾何学的な関係** だけを扱う。
2. 計算結果から「誤解する確率」「すれ違い率」「相性スコア」などを **算出しない・表示しない**。
3. 回答範囲を確率分布（一様分布など）とみなさない。範囲は「この言葉が当てはまると感じる時間の範囲」というユーザーの申告であり、その内部に重みや分布は仮定しない。
4. 「重なりがない ＝ 必ず誤解する」「重なりがある ＝ 誤解しない」と断定しない。重なりは「2人が当てはまると感じた時間の範囲に共通部分があるか」を示すだけである。
5. どちらの回答が正しいかを判定する値・文言を生成しない。

---

## 2. 時間の単位・起点・最大値

### 2.1 時間単位

- 内部の時間単位は **秒（整数）** とする。
- 理由：「ちょっと待って」は秒単位（10秒・30秒）の感覚がありうるため、分単位では表現できない。一方で「あとでやる」は時間単位になるため、表示時に分・時間へ変換する（§9）。
- 型 `Seconds` は 0 以上の整数（`Number.isInteger`）でなければならない。

### 2.2 言葉ごとの起点・終点・最大値（MVP の3語）

時間範囲は「起点からの経過時間」で表す。各言葉は1つの使用場面と結びつき、起点と終点を場面の文章で明示する。

| ID | 言葉 | 使用場面（画面に表示） | 起点（0秒） | 終点（測る時点） | 最大値 |
|---|---|---|---|---|---|
| `sugu-iku` | すぐ行く | 友だちと待ち合わせ中。先に着いたあなたに、友だちから「すぐ行く」とメッセージが来た。 | メッセージが届いた時点 | 友だちが到着する時点 | 60分（3600秒） |
| `chotto-matte` | ちょっと待って | 家の人に「ちょっと来て」と呼ばれて、「ちょっと待って」と返事をした。 | 「ちょっと待って」と言った時点 | 呼んだ人のところへ行く時点 | 30分（1800秒） |
| `atode-yaru` | あとでやる | 家の人に「宿題やったの？」と聞かれて、「あとでやる」と答えた。 | 「あとでやる」と答えた時点 | 宿題を **始める** 時点（終わる時点ではない） | 12時間（43200秒） |

- 「あとでやる」の終点を「始める時点」とする理由：「終わる時点」にすると宿題の量という別の要因が混ざり、言葉の解釈の比較にならないため。
- 最大値を超える感覚を持つ人がいる可能性は残る。MVP では最大値を範囲の上限とし、UI で「最大値以上」は選べない（要確認事項 D-3）。

### 2.3 目盛り（stops）

各言葉は、選択可能な値の昇順リスト `stops` を持つ。UI の入力値はこのリストの値に限られる。

| ID | stops |
|---|---|
| `sugu-iku` | 0, 1分, 2分, 3分, 5分, 10分, 15分, 20分, 30分, 45分, 60分 |
| `chotto-matte` | 0, 10秒, 30秒, 1分, 2分, 3分, 5分, 10分, 15分, 20分, 30分 |
| `atode-yaru` | 0, 5分, 10分, 15分, 30分, 1時間, 2時間, 3時間, 4時間, 6時間, 12時間 |

- いずれも 11 点。先頭は必ず 0、末尾は必ず最大値。
- 時間軸は stops を **等間隔に並べた区分線形スケール**（非線形軸）で描画する（§8）。短い時間の差を細かく、長い時間の差を粗く表示するため。この選択は要確認事項 D-1。
- ドメイン関数（比較計算）は stops に依存せず、`[0, maxSeconds]` 内の任意の整数秒で正しく動作しなければならない。stops は UI と軸描画のための情報である。

### 2.4 0 を含む場合

- 0秒は「起点と同時（ただちに）」を意味し、有効な値である。
- `start = 0` の範囲は「ただちに〜」を含む。特別扱いはせず、通常の値として計算する。

---

## 3. 型定義

```ts
/** 0 以上の整数秒 */
export type Seconds = number

/** 閉区間 [start, end]。start <= end。start === end（幅0の「点」）も有効 */
export interface TimeRange {
  readonly start: Seconds
  readonly end: Seconds
}

export type ExpressionId = 'sugu-iku' | 'chotto-matte' | 'atode-yaru'

/** 言葉と使用場面（MVPでは1語につき1場面） */
export interface Expression {
  readonly id: ExpressionId
  /** 例：「すぐ行く」 */
  readonly phrase: string
  /** 場面の説明文 */
  readonly scene: string
  /** 入力画面の問い。例：「メッセージが来てから友だちが着くまで…」 */
  readonly question: string
  /** 起点の説明。例：「メッセージが届いたとき」 */
  readonly originLabel: string
  /** 終点の説明。例：「友だちが着くとき」 */
  readonly endpointLabel: string
  readonly maxSeconds: Seconds
  /** 昇順・重複なし・先頭0・末尾maxSeconds */
  readonly stops: readonly Seconds[]
  /** 具体化の文型。{time} を時間表現で置換する。例：「{time}以内に行くね」 */
  readonly clarifyTemplate: string
}

export type ParticipantId = 'A' | 'B'

/** 回答者。ひとりモードの比較相手は架空のサンプル */
export type Respondent =
  | { readonly kind: 'person'; readonly id: ParticipantId; readonly label: string }
  | { readonly kind: 'sample'; readonly sampleId: string; readonly label: string }

/** 1人分の回答 */
export interface Answer {
  readonly respondent: Respondent
  readonly expressionId: ExpressionId
  readonly range: TimeRange
}

/** 架空のサンプル回答（ひとりモード用）。実在の人物・統計ではない */
export interface SampleAnswer {
  readonly sampleId: string
  /** 名前のみ（例：「ソラ」）。画面では formatSampleLabel で「ソラ（架空）」として表示する */
  readonly name: string
  readonly expressionId: ExpressionId
  readonly range: TimeRange
  /** サンプルの人物設定の一言（任意） */
  readonly note?: string
  readonly fictional: true
}

/** 2区間の関係 */
export type RangeRelation =
  | 'identical'      // 完全に一致
  | 'a-contains-b'   // A が B を包含（一致を除く）
  | 'b-contains-a'   // B が A を包含（一致を除く）
  | 'overlap'        // 共通範囲が幅 > 0（包含を除く）
  | 'touch'          // 共通部分がちょうど1点（包含を除く）
  | 'gap'            // 共通部分なし

export interface ComparisonResult {
  readonly relation: RangeRelation
  /** 共通範囲。共通部分がなければ null。touch や点を含む包含では幅0の区間 */
  readonly intersection: TimeRange | null
  /** 共通範囲の長さ（秒）。共通部分なしは 0 */
  readonly intersectionLength: Seconds
  /** 区間の空白（秒）。共通部分があれば 0 */
  readonly gapLength: Seconds
  /** 各範囲の中心値（秒。0.5秒単位になりうる） */
  readonly midpointA: number
  readonly midpointB: number
  /** 中心値の差の絶対値（秒。0.5秒単位になりうる） */
  readonly midpointDifference: number
  /** 中心値が大きいのはどちらか（同じなら 'same'） */
  readonly laterMidpoint: ParticipantId | 'same'
}

/** 言い換え（具体化）結果 */
export interface Clarification {
  readonly expressionId: ExpressionId
  /** 双方が話し合って選んだ時間 */
  readonly seconds: Seconds
  /** 生成された具体的な文。例：「10分以内に行くね」 */
  readonly text: string
  /** 確認済みの人。ふたりモードでは A と B の両方がそろって完了 */
  readonly confirmedBy: readonly ParticipantId[]
}
```

比較関数は回答の順序を A（1人目／あなた）、B（2人目／サンプル）として扱う。ひとりモードでは「あなた」を A、サンプルを B とする。

---

## 4. 入力の検証（不正入力の扱い）

```ts
export type RangeValidationError =
  | 'not-integer'      // 整数でない、NaN、Infinity
  | 'negative'         // 0 未満
  | 'exceeds-max'      // maxSeconds を超える
  | 'start-after-end'  // start > end

export type ValidationResult =
  | { readonly ok: true; readonly range: TimeRange }
  | { readonly ok: false; readonly errors: readonly RangeValidationError[] }

export function validateRange(range: TimeRange, maxSeconds: Seconds): ValidationResult
```

- 検証は例外を投げず、結果型で返す。該当するエラーはすべて列挙する。
- 自動修正（start と end の入れ替え、範囲内への丸め込み）はドメイン関数では **行わない**。UI 側で不正な値が作れないようにする（UX_SPEC §4）。
- `compareRanges` は検証済みの範囲を前提とする。未検証の値が渡された場合に備え、内部で `validateRange` を行い、不正なら `Error` を投げる（プログラムの誤りとして扱う）。
- `stops` に含まれない値もドメイン上は有効とする（将来の入力方法の変更に備えるため）。

---

## 5. 区間計算

A = [a1, a2]、B = [b1, b2] とする（いずれも閉区間、a1 ≤ a2、b1 ≤ b2）。

### 5.1 共通範囲（intersection）

```
lo = max(a1, b1)
hi = min(a2, b2)
lo <= hi なら intersection = [lo, hi]、そうでなければ null
intersectionLength = intersection ? hi - lo : 0
```

- **意味**：2人とも「この言葉が当てはまる」と感じた時間の範囲。
- **限界**：共通範囲の中の時間でも、相手が実際にその時間を意図しているとは限らない。

### 5.2 区間の空白（gap）

```
gapLength = max(0, max(a1, b1) - min(a2, b2))
```

- **意味**：2人の範囲のあいだの、どちらも当てはまると答えなかった時間の長さ。
- 共通部分があれば 0。
- **限界**：空白が大きくても、実際の会話で困るとは限らない（状況や言い方で補われることがある）。

### 5.3 中心値と中心値の差

```
midpointA = (a1 + a2) / 2
midpointB = (b1 + b2) / 2
midpointDifference = |midpointA - midpointB|
```

- **意味**：それぞれの範囲の「まんなか」同士がどれだけ離れているか。範囲の幅が違っても、全体として早め／遅めのどちらに寄っているかの目安になる。
- **限界**：中心値は「その人が最もありそうだと思う時間」ではない。ユーザーは範囲しか入力していないため、範囲内のどこを重視しているかは分からない。このため UI では「範囲のまんなか」と表現し、「平均」「いちばん多い」「本当の答え」などの語を使わない。
- 0.5 秒単位の値になりうる。表示時の丸めは §9。

### 5.4 関係の分類（relation）

以下の順に判定し、最初に当てはまったものを採用する。

| 順 | 条件 | relation |
|---|---|---|
| 1 | a1 = b1 かつ a2 = b2 | `identical` |
| 2 | a1 ≤ b1 かつ b2 ≤ a2 | `a-contains-b` |
| 3 | b1 ≤ a1 かつ a2 ≤ b2 | `b-contains-a` |
| 4 | lo < hi | `overlap` |
| 5 | lo = hi | `touch` |
| 6 | lo > hi | `gap` |

### 5.5 境界値の扱い

| ケース | 例 | 結果 |
|---|---|---|
| 1点だけ重なる | A=[0, 300], B=[300, 900] | `touch`、intersection=[300, 300]、length=0、gap=0 |
| 一方が他方を包含 | A=[0, 1800], B=[300, 600] | `a-contains-b`、intersection=[300, 600] |
| 端点を共有する包含 | A=[0, 600], B=[0, 300] | `a-contains-b` |
| 幅0の点が範囲内にある | A=[300, 300], B=[0, 600] | `b-contains-a`、intersection=[300, 300]、length=0 |
| 幅0の点が範囲の端にある | A=[600, 600], B=[0, 600] | `b-contains-a`（包含が接触より優先） |
| 両方が同じ点 | A=[300, 300], B=[300, 300] | `identical` |
| 両方が異なる点 | A=[60, 60], B=[300, 300] | `gap`、gap=240 |
| 0 を含む | A=[0, 60], B=[0, 0] | `a-contains-b` |
| 全範囲 | A=[0, max], B=任意 | `identical` または `a-contains-b` |

- 区間は閉区間として扱うため、端点が一致すれば共通部分があるとみなす。
- touch は「共通範囲が1点だけ」である事実を伝えるが、「ほぼ同じ」「ぎりぎり同じ」といった評価はしない。

### 5.6 関数一覧（Phase 2 で実装）

```ts
export function validateRange(range: TimeRange, maxSeconds: Seconds): ValidationResult
export function intersectRanges(a: TimeRange, b: TimeRange): TimeRange | null
export function gapBetween(a: TimeRange, b: TimeRange): Seconds
export function midpoint(range: TimeRange): number
export function classifyRelation(a: TimeRange, b: TimeRange): RangeRelation
export function compareRanges(a: TimeRange, b: TimeRange, maxSeconds: Seconds): ComparisonResult
export function formatDuration(seconds: number): string
export function formatRange(range: TimeRange): string            // 「5分〜15分」。幅0は「5分」
export function formatSampleLabel(sample: SampleAnswer): string  // 「ソラ（架空）」
export function describeComparison(result: ComparisonResult, labels: { a: string; b: string }, expression: Expression): ComparisonDescription
export function clarifyCandidates(a: TimeRange, b: TimeRange, result: ComparisonResult): ClarifyCandidate[]
export function buildClarificationText(expression: Expression, seconds: Seconds): string
export function positionOnScale(seconds: number, stops: readonly Seconds[]): number // 0〜1
```

すべて純粋関数とし、引数を変更しない。

### 5.7 意図的に導入しない指標

| 指標 | 導入しない理由 |
|---|---|
| すれ違い率・誤解率 | 範囲の重なりから誤解の発生確率を推定する根拠がない |
| 相性スコア・一致度（%） | 1つの数値にすると「点数」「正解・不正解」に見え、判定しない方針に反する |
| 重なり率（共通範囲 ÷ 和集合など） | 数学的には定義できるが、非線形軸の見た目と数値が食い違い、スコアとして受け取られやすい。MVPでは表示しない |
| 平均・分布 | 2人の比較では意味が薄く、サンプルを統計と誤認させる恐れがある |

---

## 6. 言葉の具体化（Clarification）

### 6.1 方針

- 計算は **話し合いの手がかり（候補）** を示すだけで、採用する時間は人が選ぶ。
- アプリが自動で「この時間に決定」とすることはない。初期状態では時間は **未選択** とする。

### 6.2 候補の生成（clarifyCandidates）

```ts
export interface ClarifyCandidate {
  readonly seconds: Seconds
  /** 候補の根拠。表示ラベルの生成に使う */
  readonly basis: 'end-of-a' | 'end-of-b' | 'end-of-intersection'
}
```

- 具体化の文型は「◯◯以内」「◯◯だけ」のように **上限** を約束する形とする。そのため候補は各範囲の **終わり（end）** を使う。
  - `end-of-a`：A の範囲の終わり（a2）
  - `end-of-b`：B の範囲の終わり（b2）
  - `end-of-intersection`：共通範囲の終わり（共通部分がある場合のみ）
- 値が 0 の候補は除外する（「0分以内」は約束として成り立たないため）。
- 同じ秒数の候補は1つにまとめ、根拠は最初のもの（`end-of-intersection` > `end-of-a` > `end-of-b` の順）を残す。
- 昇順に並べる。候補の数は 0〜3 個（両方の範囲の終わりが 0 なら候補なし）。
- 「2人の間をとる（中央値）」のような計算上の妥協案は自動生成しない。人が話し合って選ぶ余地を残すため。

### 6.3 選択できる時間

- 候補に加え、その言葉の `stops` のうち 0 を除くすべての値から選べる。
- 選んだ時間 `seconds` は 1 以上、`maxSeconds` 以下の整数でなければならない。

### 6.4 文の生成（buildClarificationText）

`expression.clarifyTemplate` の `{time}` を `formatDuration(seconds)` で置換する。

| ID | clarifyTemplate | 例（600秒） |
|---|---|---|
| `sugu-iku` | `{time}以内に行くね` | 10分以内に行くね |
| `chotto-matte` | `{time}だけ待ってて` | 10分だけ待ってて |
| `atode-yaru` | `{time}以内に始めるね` | 10分以内に始めるね |

### 6.5 確認

- ふたりモード：A と B がそれぞれ「OK」を押すと `confirmedBy` に追加される。両方そろうと完了。どちらかが「変えたい」を押すと `confirmedBy` を空にして時間の選択に戻る。
- ひとりモード：比較相手は架空のサンプルで同意できないため、`confirmedBy` は `['A']` で完了とする。完了画面では「本当の相手と使うときは、相手にも確認しよう」と表示する。

---

## 7. セッション状態（ひとりモード・ふたりモード）

画面遷移はこの状態の `step` で決まる。状態更新は純粋なリデューサー関数で行う（TECH_SPEC §3）。

```ts
export type Mode = 'solo' | 'duo'

export type Step =
  | 'start'
  | 'select'
  | 'input-a'
  | 'handoff-to-b'   // ふたりモードのみ
  | 'input-b'        // ふたりモードのみ
  | 'handoff-reveal' // ふたりモードのみ
  | 'compare'
  | 'clarify'
  | 'done'

export interface SessionState {
  readonly step: Step
  readonly mode: Mode | null
  readonly expressionId: ExpressionId | null
  readonly rangeA: TimeRange | null
  readonly rangeB: TimeRange | null          // ふたりモードの2人目
  readonly selectedSampleId: string | null   // ひとりモードの比較相手
  readonly clarifySeconds: Seconds | null
  readonly confirmedBy: readonly ParticipantId[]
}

export type SessionAction =
  | { type: 'choose-mode'; mode: Mode }
  | { type: 'choose-expression'; expressionId: ExpressionId }
  | { type: 'submit-range'; range: TimeRange }
  | { type: 'continue' }                       // handoff 画面・比較画面から次へ
  | { type: 'choose-sample'; sampleId: string }
  | { type: 'choose-clarify-seconds'; seconds: Seconds }
  | { type: 'confirm'; participant: ParticipantId }
  | { type: 'request-change' }                 // 具体化をやり直す
  | { type: 'back' }
  | { type: 'choose-another' }                 // 完了後、同じモードで別の言葉へ
  | { type: 'reset' }
```

### 7.1 遷移表

| 現在 | アクション | 次 | 備考 |
|---|---|---|---|
| start | choose-mode | select | mode を設定 |
| select | choose-expression | input-a | |
| select | back | start | |
| input-a | submit-range | solo: compare / duo: handoff-to-b | solo では最初のサンプルを selectedSampleId に設定 |
| input-a | back | select | rangeA は保存しない |
| handoff-to-b | continue | input-b | |
| input-b | submit-range | handoff-reveal | |
| input-b | back | handoff-to-b | **input-a へは戻れない**（A の回答を B に見せないため） |
| handoff-reveal | continue | compare | |
| compare | choose-sample | compare | solo のみ |
| compare | continue | clarify | |
| clarify | choose-clarify-seconds | clarify | confirmedBy を空にする |
| clarify | confirm | clarify / done | duo：A・B 両方そろえば done。solo：A で done |
| clarify | request-change | clarify | clarifySeconds と confirmedBy を空にする |
| clarify | back | compare | clarifySeconds と confirmedBy を空にする |
| done | reset | start | 全状態を初期化 |
| done | choose-another | select | mode だけ残し、ほかの状態を初期化 |
| 任意 | reset | start | 「最初から」ボタン |

- 表にない組み合わせのアクションは無視し、状態を変えない。
- 入力が不正な `submit-range` は無視する（UI では不正値を作れないが、防御として）。
- handoff-to-b / input-b / handoff-reveal の各画面は `rangeA` の値を表示しない。

---

## 8. 軸上の位置（positionOnScale）

非線形軸に秒数を配置するための関数。

```
stops = [s0, s1, ..., sn]（s0 = 0, sn = max）
seconds が si ≤ seconds ≤ s(i+1) にあるとき
  position = (i + (seconds - si) / (s(i+1) - si)) / n
```

- 戻り値は 0〜1。stops 上の値は等間隔の位置になる。
- 範囲外の値は 0 または 1 に丸める（描画の安全のため。計算には使わない）。
- 区間の端点・共通範囲の端点・空白の端点は必ず入力値なので、stops 上の位置に来る。中心値は stops 上に来ないことがあり、区分線形補間で配置される。このため非線形軸では **中心値は見た目の範囲のまんなかと一致しない**。MVP では中心値を軸上に描画せず、文章でのみ示す（要確認事項 D-6）。

---

## 9. 表示用の文字列

### 9.1 時間の表示（formatDuration）

- 入力は秒（0.5秒単位の値を含みうる）。まず `Math.round` で整数秒に丸める（0.5 は切り上げ）。
- 表示規則：

| 範囲 | 形式 | 例 |
|---|---|---|
| 0 | 「0分」 | 0分 |
| 1〜59秒 | 「N秒」 | 30秒 |
| 60秒〜3599秒 | 「N分」、端数があれば「N分M秒」 | 5分、1分30秒 |
| 3600秒以上 | 「N時間」、端数があれば「N時間M分」（秒は切り捨て） | 2時間、1時間30分 |

- 範囲は「A〜B」（例：「5分〜15分」）。幅0なら単独表記（例：「5分」）。

### 9.2 比較結果の説明文（describeComparison）

```ts
export interface ComparisonDescription {
  /** 見出し：関係を一言で */
  readonly headline: string
  /** 本文：具体的な数値を含む事実の説明（1〜3文） */
  readonly details: readonly string[]
  /** 次の行動へのうながし */
  readonly prompt: string
}
```

#### 生成ルール

1. **事実だけを述べる**：範囲の値・共通範囲・空白・中心値の差のみを用いる。
2. **評価語を使わない**：「正しい」「間違い」「ずれている」「おかしい」「普通」「常識」「相性」「◯%一致」などは使わない。
3. **どちらかを基準にしない**：「A さんより B さんが遅い」は可（事実の比較）。「B さんは遅すぎる」は不可。
4. **誤解を断定しない**：「誤解する」「すれ違う」と断言しない。使う場合は「〜かもしれません」とする。
5. 名前には UI のラベル（「あなた」「サンプル：ソラ（架空）」「Aさん」「Bさん」）を使う。
6. 時間はすべて `formatDuration` で表示する。

#### relation 別のテンプレート（a・b は表示名、phrase は言葉）

| relation | headline | details（例） |
|---|---|---|
| identical | 2人の「{phrase}」はぴったり同じでした | 2人とも {範囲} だと考えていました。 |
| a-contains-b | {b}の「{phrase}」は、{a}の範囲にすっぽり入っています | {a}は {範囲A}、{b}は {範囲B} でした。／共通しているのは {共通範囲} です。 |
| b-contains-a | {a}の「{phrase}」は、{b}の範囲にすっぽり入っています | 同上（a・b 入れ替え） |
| overlap | 2人の「{phrase}」は一部だけ重なっています | 2人とも当てはまると考えたのは {共通範囲} です。／範囲のまんなかは {中心値の差} ちがいます。 |
| touch | 2人の「{phrase}」は {t} の1点だけで接しています | {a}は {範囲A}、{b}は {範囲B} でした。 |
| gap | 2人の「{phrase}」は重なりませんでした | {a}は {範囲A}、{b}は {範囲B} でした。／2人の範囲のあいだには {空白} のひらきがあります。 |

- 中心値の差は、`overlap`・`gap`・包含の場合に details に含める（identical では 0 のため省略）。`midpointDifference` が 0 の場合は「範囲のまんなかは同じです」とする。
- prompt（共通）：「同じ言葉でも、思い浮かべる時間はちがうことがあります。具体的な時間にしてみましょう。」
- gap のときの追加文（任意）：「このまま使うと、思っていた時間がちがうかもしれません。」（断定しない）

具体的な文言は Phase 3 で調整してよいが、上記のルール 1〜6 は守る。

---

## 10. 架空のサンプルデータ（ひとりモード）

- 各言葉につき 3 件の `SampleAnswer` を用意する（具体値は [DEMO_SPEC.md](DEMO_SPEC.md) §7）。
- 表示名には必ず「（架空）」を付ける（`formatSampleLabel`。データの `name` には付けない）。画面には「このサンプルは説明用に作った架空の回答です。実際の調査結果ではありません。」を表示する。
- サンプル同士を集計（平均・多数決など）して表示しない。
- サンプルデータはソースコード（`src/data/samples.ts`）に定数として置き、ファイル冒頭のコメントでも架空であることを明記する。

---

## 11. テストすべき性質（Phase 2）

- §5.5 の境界値表のすべてのケース
- 対称性：`intersectRanges(a, b)` と `intersectRanges(b, a)` は等しい。`gapBetween`・`midpointDifference` も対称。`classifyRelation` は `a-contains-b` ⇔ 入れ替え後 `b-contains-a`。
- `gapLength > 0` ⇔ `intersection === null`
- `relation === 'touch'` ⇒ `intersectionLength === 0`
- `validateRange` の各エラーと複数エラーの同時検出
- `formatDuration` の各表示形式と丸め（例：7.5秒 → 8秒、450.5秒 → 7分31秒）
- `positionOnScale` が stops 上で等間隔になること、範囲外を丸めること
- `clarifyCandidates` が 0 を除外し、重複をまとめ、昇順であること
- `describeComparison` の出力に禁止語（§9.2 ルール2）が含まれないこと
- セッションリデューサーの遷移表（§7.1）、特に input-b から input-a へ戻れないこと
