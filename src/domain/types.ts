/** 0 以上の整数秒 */
export type Seconds = number

/** 両端を含む閉区間 [start, end]。start === end（長さ0）も有効 */
export interface TimeRange {
  readonly start: Seconds
  readonly end: Seconds
}

/** 入力途中の範囲。null は未入力 */
export interface RangeDraft {
  readonly start: Seconds | null
  readonly end: Seconds | null
}

export type ScenarioId = 'sugu-iku' | 'chotto-matte' | 'atode-yaru'

/** 言葉と使用場面 */
export interface Scenario {
  readonly id: ScenarioId
  /** 例：「すぐ行く」 */
  readonly phrase: string
  readonly scene: string
  readonly question: string
  /** 起点（0秒）の説明 */
  readonly originLabel: string
  /** 終点（測る時点）の説明 */
  readonly endpointLabel: string
  /** アプリで扱う比較範囲の上限。言葉の意味の客観的な上限ではない */
  readonly maxSeconds: Seconds
  /** スライダー・数値入力の刻み */
  readonly inputStepSeconds: Seconds
  /** 具体化の文型。{time} を時間表現で置換する */
  readonly agreementTemplate: string
  /** 実行できるかを確認する問い。{time} を時間表現で置換する */
  readonly feasibilityTemplate: string
}

export type ParticipantId = 'A' | 'B'

export type Mode = 'solo' | 'duo'

/** 架空のサンプル回答（ひとりモード用）。実在の人物・調査・統計ではない */
export interface SampleAnswer {
  readonly sampleId: string
  /** 名前のみ。表示時は formatSampleLabel で「（架空）」を付ける */
  readonly name: string
  readonly scenarioId: ScenarioId
  readonly range: TimeRange
  readonly note: string
  readonly fictional: true
}

/** 2区間の関係。判定の優先順位は classifyRelation を参照 */
export type RangeRelation =
  | 'identical'
  | 'a-contains-b'
  | 'b-contains-a'
  | 'overlap'
  | 'touch'
  | 'gap'

export interface ComparisonResult {
  readonly relation: RangeRelation
  /** 共通点が1点以上あるか（touch も true） */
  readonly hasIntersection: boolean
  /** 共通範囲。共通点がなければ null */
  readonly intersection: TimeRange | null
  /** 共通範囲の長さ（秒）。共通点なし・1点のみは 0 */
  readonly intersectionLength: Seconds
  /** 2区間のあいだの空白（秒）。共通点があれば 0 */
  readonly gapLength: Seconds
  /** 範囲の中心値（0.5秒単位になりうる） */
  readonly midpointA: number
  readonly midpointB: number
  /** 中心値の差の絶対値（0.5秒単位になりうる） */
  readonly midpointDifference: number
  readonly laterMidpoint: ParticipantId | 'same'
}

/** 比較結果の説明文。事実だけを述べる */
export interface ComparisonDescription {
  readonly headline: string
  readonly details: readonly string[]
  readonly prompt: string
}

/** 具体化の候補。解釈から出した手がかりであり、実行できる約束ではない */
export interface AgreementCandidate {
  readonly seconds: Seconds
  readonly basis: 'end-of-intersection' | 'end-of-a' | 'end-of-b'
}
