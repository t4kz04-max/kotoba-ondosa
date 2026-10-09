import type { Scenario } from '../domain/types'

/**
 * MVP の3シナリオ。
 * maxSeconds はアプリで扱う比較範囲の上限であり、言葉の意味の客観的な上限ではない。
 */
export const SCENARIOS: readonly Scenario[] = [
  {
    id: 'sugu-iku',
    phrase: 'すぐ行く',
    scene: '友だちと待ち合わせ中。先に着いたあなたに、友だちから「すぐ行く」とメッセージが来た。',
    question: 'メッセージが来てから友だちが着くまで、どのくらいなら『すぐ行く』だと思う？',
    originLabel: 'メッセージが届いた',
    endpointLabel: '友だちが着く',
    maxSeconds: 60 * 60,
    inputStepSeconds: 60,
    agreementTemplate: '{time}以内に行くね',
    feasibilityTemplate: '{time}以内に、本当に着けそう？',
  },
  {
    id: 'chotto-matte',
    phrase: 'ちょっと待って',
    scene: '家の人に「ちょっと来て」と呼ばれて、「ちょっと待って」と返事をした。',
    question: '『ちょっと待って』と言ってから行くまで、どのくらいなら『ちょっと』だと思う？',
    originLabel: '「ちょっと待って」と言った',
    endpointLabel: '呼んだ人のところへ行く',
    maxSeconds: 30 * 60,
    inputStepSeconds: 10,
    agreementTemplate: '{time}だけ待ってて',
    feasibilityTemplate: '{time}で、本当に行けそう？',
  },
  {
    id: 'atode-yaru',
    phrase: 'あとでやる',
    scene: '家の人に「宿題やったの？」と聞かれて、「あとでやる」と答えた。',
    question: '『あとでやる』と答えてから宿題を始めるまで、どのくらいなら『あとで』だと思う？',
    originLabel: '「あとでやる」と答えた',
    endpointLabel: '宿題を始める',
    maxSeconds: 12 * 60 * 60,
    inputStepSeconds: 5 * 60,
    agreementTemplate: '{time}以内に始めるね',
    feasibilityTemplate: '{time}以内に、本当に始められそう？',
  },
]
