/**
 * 「場面を変えて比べる」の画面の描画テスト（react-dom/server。追加の依存なし）
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../../src/app/App'
import { ContextScreens } from '../../src/app/ContextScreens'
import { SessionScreens } from '../../src/app/SessionScreens'
import { defaultCatalog } from '../../src/data/catalog'
import { CONTEXT_SCENES, CONTEXT_SETTINGS } from '../../src/data/contextScenes'
import {
  contextTransition,
  createInitialContextState,
  type ContextEvent,
  type ContextState,
} from '../../src/domain/contextSession'
import { initialSessionState } from '../../src/domain/session'

const CONFIG = { sceneCount: CONTEXT_SCENES.length, maxSeconds: CONTEXT_SETTINGS.maxSeconds }

function run(events: ContextEvent[]): ContextState {
  return events.reduce((state, event) => {
    const result = contextTransition(state, event, CONFIG)
    if (!result.ok) throw new Error(`${event.type} rejected: ${result.error}`)
    return result.state
  }, createInitialContextState(CONTEXT_SCENES.length))
}

function render(state: ContextState): string {
  return renderToStaticMarkup(
    <ContextScreens state={state} dispatch={() => {}} scenes={CONTEXT_SCENES} settings={CONTEXT_SETTINGS} onExit={() => {}} />,
  )
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

const answer = (start: number, end: number): ContextEvent[] => [
  { type: 'SET_DRAFT', draft: { start, end } },
  { type: 'SUBMIT_ANSWER' },
]

describe('home screen', () => {
  it('offers the new experience next to the existing modes', () => {
    const text = textOf(renderToStaticMarkup(<App />))
    expect(text).toContain('ひとりで体験する')
    expect(text).toContain('ふたりで比べる')
    expect(text).toContain('場面を変えて比べる')
    expect(text).toContain('あなたの「すぐ」は、いつも同じ？')
  })

  it('does not show the card when the session screens are used without it', () => {
    const text = textOf(
      renderToStaticMarkup(<SessionScreens state={initialSessionState} dispatch={() => {}} catalog={defaultCatalog} />),
    )
    expect(text).not.toContain('場面を変えて比べる')
  })
})

describe('context input', () => {
  it('starts unanswered on scene 1 and cannot be submitted', () => {
    const html = render(run([]))
    const text = textOf(html)
    expect(text).toContain('「すぐ行く」')
    expect(text).toContain('未選択')
    expect(text).toContain('0分にする')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>これで決定して次へ<\/button>/)
  })

  it('shows validation errors from the shared input panel', () => {
    const text = textOf(render(run([{ type: 'SET_DRAFT', draft: { start: 600, end: 300 } }])))
    expect(text).toContain('「早くて」が「遅くて」より後になっています')
    const over = textOf(render(run([{ type: 'SET_DRAFT', draft: { start: 0, end: 1860 } }])))
    expect(over).toContain('このアプリでは30分までで答えます')
  })

  it('moves to the next scene without showing the previous answer', () => {
    const text = textOf(render(run(answer(420, 780))))
    expect(text).toContain('「すぐ返信する」')
    expect(text).not.toContain('7分')
    expect(text).not.toContain('13分')
  })

  it('labels the last scene button as going to the comparison', () => {
    const html = render(run([...answer(0, 300), ...answer(0, 300), { type: 'SET_DRAFT', draft: { start: 0, end: 60 } }]))
    expect(textOf(html)).toContain('「すぐ始める」')
    expect(html).toMatch(/<button[^>]*>これで決定してくらべる<\/button>/)
  })
})

describe('context result', () => {
  const result = (ranges: [number, number][]) => textOf(render(run(ranges.flatMap(([s, e]) => answer(s * 60, e * 60)))))

  it('draws three rows on the same axis with scene names and ranges', () => {
    const html = render(run([...answer(0, 300), ...answer(60, 600), ...answer(300, 1800)]))
    expect(html.match(/timeline__row timeline__row--s/g)).toHaveLength(3)
    const text = textOf(html)
    expect(text).toContain('① すぐ行く')
    expect(text).toContain('② すぐ返信する')
    expect(text).toContain('③ すぐ始める')
    expect(text).toContain('もう一度試す')
    expect(text).toContain('スタートに戻る')
    // Phase 6B：具体化への橋渡しの一文（3場面の比較・図は変えない）
    expect(text).toContain('場面が変われば、具体的に伝える内容（何分以内に、何をするか）も変わります。')
    // 「場面を変えて比べる」には具体化・確認・約束の表示はない
    expect(text).not.toContain('約束')
    expect(text).not.toContain('確認しました')
  })

  it('identical answers: says they were the same, not different', () => {
    const text = result([[0, 5], [0, 5], [0, 5]])
    expect(text).toContain('3つの場面で、あなたの「すぐ」は同じでした')
    expect(text).not.toContain('範囲が違いました')
  })

  it('partial overlap: shows the common range', () => {
    const text = result([[0, 10], [5, 15], [8, 20]])
    expect(text).toContain('場面によって、あなたの「すぐ」の範囲が違いました')
    expect(text).toContain('3つすべてに共通する時間：8分〜10分')
  })

  it('no common time', () => {
    const text = result([[0, 5], [3, 8], [10, 20]])
    expect(text).toContain('3つすべてに共通する時間はありません。')
    expect(text).toContain('3つすべてに共通する時間：なし')
  })

  it('one common point is drawn as a point (line), not a band', () => {
    const html = render(run([...answer(0, 300), ...answer(300, 600), ...answer(120, 300)]))
    expect(textOf(html)).toContain('ちょうど5分（1点）')
    expect(html).toContain('timeline__point')
    expect(html).not.toContain('timeline__common-band')
  })

  it('zero-length answers are drawn as markers and labeled ちょうど', () => {
    const html = render(run([...answer(0, 0), ...answer(0, 0), ...answer(0, 300)]))
    expect(html.match(/timeline__point-marker/g)).toHaveLength(2)
    expect(textOf(html)).toContain('ちょうど0分')
  })
})
