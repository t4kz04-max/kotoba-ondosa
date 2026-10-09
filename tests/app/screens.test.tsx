/**
 * 画面の描画テスト。追加の依存なしで行うため、react-dom/server で HTML 文字列に描画して内容を確認する。
 * （クリック操作は扱わない。操作の流れは session.test.ts で状態遷移として検証している）
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../../src/app/App'
import { SessionScreens } from '../../src/app/SessionScreens'
import { defaultCatalog as catalog } from '../../src/data/catalog'
import { initialSessionState, transition, type SessionEvent, type SessionState } from '../../src/domain/session'

function run(events: SessionEvent[]): SessionState {
  return events.reduce((state, event) => {
    const result = transition(state, event, catalog)
    if (!result.ok) throw new Error(`${event.type} rejected at ${state.step}: ${result.error}`)
    return result.state
  }, initialSessionState)
}

function render(state: SessionState): string {
  return renderToStaticMarkup(<SessionScreens state={state} dispatch={() => {}} catalog={catalog} />)
}

/** HTML からタグを除いた表示テキスト */
function textOf(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
}

// A の回答は「7分〜13分」。B 側の画面にこの値が出ないことを確認する
const DUO_A_DONE: SessionEvent[] = [
  { type: 'SELECT_MODE', mode: 'duo' },
  { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
  { type: 'SET_DRAFT', draft: { start: 420, end: 780 } },
  { type: 'SUBMIT_ANSWER' },
]
const DUO_B_DONE: SessionEvent[] = [
  ...DUO_A_DONE,
  { type: 'START_INPUT_B' },
  { type: 'SET_DRAFT', draft: { start: 1200, end: 2400 } },
  { type: 'SUBMIT_ANSWER' },
]
const SOLO_COMPARISON: SessionEvent[] = [
  { type: 'SELECT_MODE', mode: 'solo' },
  { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
  { type: 'SET_DRAFT', draft: { start: 0, end: 300 } },
  { type: 'SUBMIT_ANSWER' },
]

describe('App', () => {
  it('starts on the home screen with both modes', () => {
    const text = textOf(renderToStaticMarkup(<App />))
    expect(text).toContain('言葉の温度差')
    expect(text).toContain('同じ言葉なのに、同じ意味じゃない。')
    expect(text).toContain('ひとりで体験する')
    expect(text).toContain('ふたりで比べる')
  })
})

describe('scenario select', () => {
  it('shows the three scenarios with their context', () => {
    const text = textOf(render(run([{ type: 'SELECT_MODE', mode: 'solo' }])))
    for (const scenario of catalog.scenarios) {
      expect(text).toContain(scenario.phrase)
      expect(text).toContain(scenario.scene)
      expect(text).toContain(scenario.endpointLabel)
    }
  })
})

describe('input screen', () => {
  const atInput = run(SOLO_COMPARISON.slice(0, 2))

  it('starts unanswered and cannot be submitted', () => {
    const html = render(atInput)
    expect(textOf(html)).toContain('未選択')
    expect(textOf(html)).toContain('「早くて」と「遅くて」の両方を入力してください。')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>これで決定<\/button>/)
  })

  it('shows the reason for a reversed range and blocks submission', () => {
    const html = render(run([...SOLO_COMPARISON.slice(0, 2), { type: 'SET_DRAFT', draft: { start: 600, end: 300 } }]))
    expect(textOf(html)).toContain('「早くて」が「遅くて」より後になっています')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>これで決定<\/button>/)
  })

  it('shows the reason for invalid numbers', () => {
    const html = render(run([...SOLO_COMPARISON.slice(0, 2), { type: 'SET_DRAFT', draft: { start: Number.NaN, end: 300 } }]))
    expect(textOf(html)).toContain('数字（0〜9）だけで入力してください。')
  })

  it('enables submission for a valid range', () => {
    const html = render(run([...SOLO_COMPARISON.slice(0, 2), { type: 'SET_DRAFT', draft: { start: 0, end: 300 } }]))
    expect(textOf(html)).toContain('0分〜5分')
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>これで決定<\/button>/)
  })

  it('offers an explicit way to choose 0', () => {
    expect(textOf(render(atInput))).toContain('0分にする')
  })

  it('shows an empty preview before the range is chosen', () => {
    expect(textOf(render(atInput))).toContain('まだ範囲を選んでいません')
  })

  it('marks the reversed fields as invalid', () => {
    const html = render(run([...SOLO_COMPARISON.slice(0, 2), { type: 'SET_DRAFT', draft: { start: 600, end: 300 } }]))
    expect(html.match(/aria-invalid="true"/g)?.length).toBeGreaterThanOrEqual(2)
  })

  it('shows a single-field error right under that field', () => {
    const html = render(run([...SOLO_COMPARISON.slice(0, 2), { type: 'SET_DRAFT', draft: { start: 4000, end: 300 } }]))
    expect(html).toMatch(/<p id="[^"]*-error" class="duration__error"[^>]*>このアプリでは1時間までで答えます/)
  })

  it('states that the max is not the limit of the meaning', () => {
    expect(textOf(render(atInput))).toContain('より長いと感じる人もいます')
  })

  it('does not show fictional samples before the user answers', () => {
    const text = textOf(render(atInput))
    expect(text).not.toContain('ソラ')
    expect(text).not.toContain('架空')
  })
})

describe('duo mode hides answers before the reveal', () => {
  it.each([
    ['HANDOFF', DUO_A_DONE],
    ['INPUT_B', [...DUO_A_DONE, { type: 'START_INPUT_B' }] as SessionEvent[]],
    ['READY_TO_REVEAL', DUO_B_DONE],
  ])('%s does not show any answer', (step, events) => {
    const state = run(events)
    expect(state.step).toBe(step)
    const text = textOf(render(state))
    expect(text).not.toContain('7分')
    expect(text).not.toContain('13分')
    expect(text).not.toContain('20分')
    expect(text).not.toContain('40分')
    expect(text).not.toContain('共通')
  })

  it('READY_TO_REVEAL is the waiting state of the reveal', () => {
    const text = textOf(render(run(DUO_B_DONE)))
    expect(text).toContain('2人の答えがそろいました')
    expect(text).toContain('2人の感覚を公開する')
  })

  it.each([
    ['HANDOFF', DUO_A_DONE],
    ['INPUT_B', [...DUO_A_DONE, { type: 'START_INPUT_B' }] as SessionEvent[]],
    ['READY_TO_REVEAL', DUO_B_DONE],
  ])('%s does not leak A in attributes or hidden text either (raw HTML)', (_, events) => {
    // aria-label・aria-valuetext・value などの属性や、見えない読み上げ用の文も含めて確認する
    const html = render(run(events))
    for (const leak of ['7分', '13分', '20分', '40分', '420', '780', '1200', '2400']) {
      expect(html).not.toContain(leak)
    }
  })

  it('shows both answers after the reveal', () => {
    const text = textOf(render(run([...DUO_B_DONE, { type: 'REVEAL' }])))
    expect(text).toContain('Aさんの範囲')
    expect(text).toContain('7分〜13分')
    expect(text).toContain('20分〜40分')
    expect(text).toContain('7分のひらき')
  })
})

describe('comparison screen', () => {
  it('shows the fictional sample, facts, and description in solo mode', () => {
    const text = textOf(render(run(SOLO_COMPARISON)))
    expect(text).toContain('2人の「すぐ行く」は重なりませんでした')
    expect(text).toContain('ソラ（架空）')
    expect(text).toContain('架空の回答です。実際の調査結果ではありません。')
    expect(text).toContain('範囲のあいだの空白')
    expect(text).toContain('範囲のまんなかの差')
    expect(text).toContain('全体表示')
    expect(text).toContain('拡大表示')
    expect(text).not.toContain('平均')
    expect(text).not.toContain('多数')
  })

  it('shows the three layers: each answer and the overlay with the gap', () => {
    const html = render(run(SOLO_COMPARISON))
    const text = textOf(html)
    expect(text).toContain('重ねると')
    expect(text).toContain('10分のひらき')
    expect(html).toContain('timeline__row--a')
    expect(html).toContain('timeline__row--b')
    expect(html).toContain('timeline__overlay')
  })

  it('plays the reveal animation on first display', () => {
    // 新しい回答オブジェクトなので、初回表示として演出用のクラスが付く
    const html = render(run(SOLO_COMPARISON))
    expect(html).toContain('timeline--reveal')
    expect(html).toMatch(/class="screen screen--comparison reveal"/)
  })

  it('describes a one-point touch as a point', () => {
    const text = textOf(
      render(
        run([
          { type: 'SELECT_MODE', mode: 'solo' },
          { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
          { type: 'SET_DRAFT', draft: { start: 300, end: 900 } },
          { type: 'SUBMIT_ANSWER' },
        ]),
      ),
    )
    expect(text).toContain('1点だけで重なっています')
    expect(text).toContain('共通 15分（1点だけ）')
  })

  it('has exactly one primary action, kept in the bottom action bar', () => {
    const html = render(run(SOLO_COMPARISON))
    expect(html.match(/具体的な言葉にする/g)).toHaveLength(1)
    expect(html).toMatch(/<div class="action-bar action-bar--single"><button[^>]*>具体的な言葉にする<\/button><\/div>/)
  })

  it('shows the headline from the start of the reveal (not delayed to the end)', () => {
    const html = render(run(SOLO_COMPARISON))
    expect(html).toMatch(/<h1[^>]*class="result-headline reveal__step reveal__step--1"/)
  })

  it('renders an accessible SVG chart', () => {
    const html = render(run(SOLO_COMPARISON))
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="2人の「すぐ行く」は重なりませんでした/)
  })
})

describe('agreement screen', () => {
  const atAgreement = [...SOLO_COMPARISON, { type: 'START_AGREEMENT' }] as SessionEvent[]

  it('starts with no time selected and no approval controls', () => {
    const text = textOf(render(run(atAgreement)))
    expect(text).toContain('時間を選ぶと、ここに言葉ができます。')
    expect(text).toContain('あなたが選んだ範囲の終わり 5分 あなたの 0分〜5分 の、いちばん遅い時間')
    expect(text).toContain('ソラ（架空）が選んだ範囲の終わり 30分 ソラ（架空）の 15分〜30分 の、いちばん遅い時間')
    expect(text).toContain('感じ方が違っていても、実際にできる時間を話し合って決められます。')
    expect(text).toContain('範囲が重なっていなくても、話し合えば決められます。')
    expect(text).not.toContain('この言い方にする')
  })

  it('does not offer a common-range candidate when the ranges do not overlap', () => {
    const text = textOf(render(run(atAgreement)))
    expect(text).toContain('共通範囲からの手がかりはありません')
    expect(text).not.toContain('共通範囲の終わり')
  })

  it('offers the common-range candidate only when there is a common range', () => {
    // あなた 10分〜20分、ソラ（架空）15分〜30分 → 共通 15分〜20分
    const text = textOf(
      render(
        run([
          { type: 'SELECT_MODE', mode: 'solo' },
          { type: 'SELECT_SCENARIO', scenarioId: 'sugu-iku' },
          { type: 'SET_DRAFT', draft: { start: 600, end: 1200 } },
          { type: 'SUBMIT_ANSWER' },
          { type: 'START_AGREEMENT' },
        ]),
      ),
    )
    expect(text).toContain('2人に共通する範囲の終わり 20分 2人とも当てはまると感じた 15分〜20分 の、いちばん遅い時間')
    expect(text).not.toContain('共通範囲からの手がかりはありません')
    // 重なっていても、それだけで約束にはしない
    expect(text).toContain('範囲が重なっていても、それだけで約束になるわけではありません。')
  })

  it('shows the sentence and the feasibility check after a time is chosen', () => {
    const html = render(run([...atAgreement, { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 }]))
    const text = textOf(html)
    expect(text).toContain('「今から10分以内に着くね」')
    expect(text).toContain('いつ 今から10分以内')
    expect(text).toContain('何をする 着く')
    expect(text).toContain('「今から」は、メッセージが届いたときのことです。')
    expect(text).toContain('10分以内に、本当に着けそう？')
    expect(text).toContain('この言葉のとおりに、実際にできる（待てる）')
    expect(text).toContain('相手が了承したことにはなりません')
    expect(text).toContain('時間を選びなおす')
    // チェックするまで承認ボタンは押せない
    expect(html).toMatch(/<button[^>]*disabled[^>]*>この言い方にする<\/button>/)
  })

  it('accepts a free-input time that is not a candidate', () => {
    const text = textOf(render(run([...atAgreement, { type: 'CHOOSE_AGREEMENT_TIME', seconds: 7 * 60 }])))
    expect(text).toContain('7分以内に着くね')
    expect(text).toContain('7分以内に、本当に着けそう？')
  })

  it('requires both A and B in duo mode, and resets approval when the time changes', () => {
    const duoAgreement: SessionEvent[] = [
      ...DUO_B_DONE,
      { type: 'REVEAL' },
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 900 },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
    ]
    const approvedState = run(duoAgreement)
    expect(approvedState.step).toBe('AGREEMENT')
    const approvedA = textOf(render(approvedState))
    expect(approvedA).toContain('2人で同じ言葉を確かめよう')
    expect(approvedA).toContain('確かめる言葉 「今から15分以内に着くね」')
    expect(approvedA).toContain('Aさん：確認しました')
    expect(approvedA).toContain('取り消す')
    expect(approvedA).toContain('Bさん：まだ確認していません')
    expect(approvedA).toContain('Bさん OK')
    // 片方だけでは完了しない
    expect(approvedA).toContain('Bさんの確認を待っています。2人がそろうと完成します。')

    const changed = textOf(render(run([...duoAgreement, { type: 'CHOOSE_AGREEMENT_TIME', seconds: 1200 }])))
    expect(changed).not.toContain('確認しました')
    expect(changed).toContain('Aさん OK')
    expect(changed).toContain('20分以内に着くね')

    const withdrawn = textOf(render(run([...duoAgreement, { type: 'WITHDRAW_APPROVAL', participant: 'A' }])))
    expect(withdrawn).toContain('Aさん：まだ確認していません')
    expect(withdrawn).toContain('15分以内に着くね')
  })

  it('completes only when both A and B confirm the same sentence, and only then calls it a promise', () => {
    const both = run([
      ...DUO_B_DONE,
      { type: 'REVEAL' },
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 900 },
      { type: 'APPROVE_AGREEMENT', participant: 'B', feasibilityConfirmed: true },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
    ])
    expect(both.step).toBe('COMPLETE')
    const text = textOf(render(both))
    expect(text).toContain('ことばが、約束になった。')
    expect(text).toContain('2人で確かめた具体的な言葉')
    expect(text).toContain('Aさん・Bさんが、同じ言葉を確認しました。')
    expect(text).toContain('いつ 今から15分以内')
  })
})

describe('complete screen', () => {
  it('shows the promise and restart options', () => {
    const html = render(
      run([
        ...SOLO_COMPARISON,
        { type: 'START_AGREEMENT' },
        { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
        { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
      ]),
    )
    const text = textOf(html)
    // ひとりモードは架空の相手なので「約束」とは言わない
    expect(text).toContain('具体的な言い方を考えられた。')
    expect(text).not.toContain('約束になった')
    expect(text).toContain('あなたが考えた具体的な言い方')
    expect(text).toContain('「 今から10分以内に着くね 」')
    expect(text).toContain('いつ 今から10分以内')
    expect(text).toContain('何をする 着く')
    // コピーされる文（promise__sentence）は、かぎかっこを含まない画面上の文そのもの
    expect(html).toContain('<span class="promise__sentence">今から10分以内に着くね</span>')
    expect(text).toContain('最初から')
    expect(text).toContain('ほかの言葉でくらべる')
    expect(text).toContain('この言葉をコピー')
    expect(text).toContain('架空のサンプル')
    // ひとりモードでは、2人が確認したとは表示しない
    expect(text).not.toContain('Aさん・Bさんが')
    expect(text).toContain('曖昧だった言葉')
    expect(text).toContain('「すぐ行く」')
  })

  it('returns to scenario selection after restart', () => {
    const complete = run([
      ...SOLO_COMPARISON,
      { type: 'START_AGREEMENT' },
      { type: 'CHOOSE_AGREEMENT_TIME', seconds: 600 },
      { type: 'APPROVE_AGREEMENT', participant: 'A', feasibilityConfirmed: true },
    ])
    const restarted = transition(complete, { type: 'RESTART_SAME_MODE' }, catalog).state
    expect(textOf(render(restarted))).toContain('どの言葉でくらべる？')
    const reset = transition(complete, { type: 'RESET' }, catalog).state
    expect(textOf(render(reset))).toContain('ひとりで体験する')
  })
})
