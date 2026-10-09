import type { ContextScene, ContextSettings } from '../domain/types'

/**
 * 「場面を変えて比べる」の3場面（Phase 6A）。
 * 既存のシナリオ「すぐ行く」（終点＝友だちが着く・上限60分）とは測るものが違うため、混ぜずに専用に定義する。
 * 3場面とも、起点は「その言葉を伝えた瞬間」、終点は「その行動を始める瞬間」。上限も共通の30分。
 */
export const CONTEXT_SETTINGS: ContextSettings = {
  word: 'すぐ',
  originLabel: '言葉を伝えた',
  endpointLabel: 'その行動を始める',
  maxSeconds: 30 * 60,
  inputStepSeconds: 60,
}

export const CONTEXT_SCENES: readonly ContextScene[] = [
  {
    id: 'tell-friend',
    phrase: 'すぐ行く',
    scene: '待ち合わせをしている友だちに、「すぐ行く」と伝えた。',
    actionLabel: '行くために動き出す',
    question: '「すぐ行く」と伝えてから動き出すまで、何分後から何分後までが自然だと思う？',
  },
  {
    id: 'reply-message',
    phrase: 'すぐ返信する',
    scene: '友だちからのメッセージに、「すぐ返信する」と伝えた。',
    actionLabel: '返信を書き始める',
    question: '「すぐ返信する」と伝えてから返信を書き始めるまで、何分後から何分後までが自然だと思う？',
  },
  {
    id: 'start-homework',
    phrase: 'すぐ始める',
    scene: '家の人に、宿題を「すぐ始める」と伝えた。',
    actionLabel: '宿題を始める',
    question: '「すぐ始める」と伝えてから宿題を始めるまで、何分後から何分後までが自然だと思う？',
  },
]
