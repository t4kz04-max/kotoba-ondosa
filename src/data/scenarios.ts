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
    // 終点は「友だちが着く」なので、文も到着を表す（「行く」は出発とも読めるため Phase 6B で修正）
    // 起点（メッセージが届いた＝送った瞬間）を「今から」で文に入れる。コピーした文だけでも伝わるように（Phase 7）
    agreementTemplate: '今から{time}以内に着くね',
    agreementWhen: '今から{time}以内',
    agreementAction: '着く',
    feasibilityTemplate: '今から{time}以内に、本当に着けそう？',
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
    // 終点は「呼んだ人のところへ行く」。文に何をするかを入れる（Phase 6B）
    agreementTemplate: '今から{time}以内にそっちへ行くね',
    agreementWhen: '今から{time}以内',
    agreementAction: 'そっちへ行く',
    feasibilityTemplate: '今から{time}以内に、本当に行けそう？',
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
    // 終点は「宿題を始める」。何を始めるかを文に入れる（Phase 6B）
    agreementTemplate: '今から{time}以内に宿題を始めるね',
    agreementWhen: '今から{time}以内',
    agreementAction: '宿題を始める',
    feasibilityTemplate: '今から{time}以内に、本当に宿題を始められそう？',
  },
]
