import type { SampleAnswer } from '../domain/types'

/**
 * ひとりモード用の【架空】サンプル回答。
 * 説明・デモのために作ったもので、実在の人物・アンケート・研究・統計には基づかない。
 * 比較の見え方が分かるよう、意図的に「短い・中くらい・長い」に分けている。
 * 集計（平均・多数決など）して表示してはいけない。
 * 各シナリオで先頭のサンプルが最初に表示される。
 */
const MIN = 60
const HOUR = 60 * MIN

export const SAMPLES: readonly SampleAnswer[] = [
  { sampleId: 'sugu-sora', name: 'ソラ', scenarioId: 'sugu-iku', range: { start: 15 * MIN, end: 30 * MIN }, note: '準備してから家を出るイメージ', fictional: true },
  { sampleId: 'sugu-minato', name: 'ミナト', scenarioId: 'sugu-iku', range: { start: 0, end: 5 * MIN }, note: 'もう向かっているイメージ', fictional: true },
  { sampleId: 'sugu-hikari', name: 'ヒカリ', scenarioId: 'sugu-iku', range: { start: 5 * MIN, end: 15 * MIN }, note: 'これから家を出るイメージ', fictional: true },

  { sampleId: 'chotto-sora', name: 'ソラ', scenarioId: 'chotto-matte', range: { start: 5 * MIN, end: 15 * MIN }, note: '今やっていることを区切りまで終わらせる', fictional: true },
  { sampleId: 'chotto-minato', name: 'ミナト', scenarioId: 'chotto-matte', range: { start: 10, end: 1 * MIN }, note: '手を止めてすぐ行く', fictional: true },
  { sampleId: 'chotto-hikari', name: 'ヒカリ', scenarioId: 'chotto-matte', range: { start: 1 * MIN, end: 3 * MIN }, note: 'キリのいいところまで', fictional: true },

  { sampleId: 'atode-sora', name: 'ソラ', scenarioId: 'atode-yaru', range: { start: 3 * HOUR, end: 6 * HOUR }, note: '夜、寝る前までにはやる', fictional: true },
  { sampleId: 'atode-minato', name: 'ミナト', scenarioId: 'atode-yaru', range: { start: 10 * MIN, end: 30 * MIN }, note: '今の動画が終わったら', fictional: true },
  { sampleId: 'atode-hikari', name: 'ヒカリ', scenarioId: 'atode-yaru', range: { start: 1 * HOUR, end: 2 * HOUR }, note: 'ごはんを食べてから', fictional: true },
]
