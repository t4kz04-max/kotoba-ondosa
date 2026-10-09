import { useRef, useState } from 'react'
import { DurationInput } from '../../components/duration-input/DurationInput'
import { Icon } from '../../components/Icon'
import { ComparisonChart } from '../../components/timeline/ComparisonChart'
import { isValidAgreementSeconds } from '../../domain/agreement'
import { formatDuration, formatRange } from '../../domain/format'
import type { AgreementCandidate, Mode, ParticipantId, Scenario, Seconds } from '../../domain/types'
import type { AgreementView, ComparisonView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface AgreementScreenProps {
  readonly comparison: ComparisonView
  readonly agreement: AgreementView
  readonly mode: Mode
  readonly onChooseTime: (seconds: Seconds) => void
  readonly onApprove: (participant: ParticipantId, feasibilityConfirmed: boolean) => void
  readonly onWithdraw: (participant: ParticipantId) => void
  readonly onRevise: () => void
  readonly onBack: () => void
  readonly onRestartSameMode: () => void
}

/** 候補の根拠。agreementCandidates が返した basis をそのまま言葉にする */
function candidateLabel(candidate: AgreementCandidate, comparison: ComparisonView): string {
  switch (candidate.basis) {
    case 'end-of-intersection':
      return '2人に共通する範囲の終わり'
    case 'end-of-a':
      return `${comparison.a.label}が選んだ範囲の終わり`
    case 'end-of-b':
      return `${comparison.b.label}が選んだ範囲の終わり`
  }
}

/** 候補の説明。比較の計算結果（範囲・共通範囲）だけを使う */
function candidateNote(candidate: AgreementCandidate, comparison: ComparisonView): string {
  const { result, a, b } = comparison
  switch (candidate.basis) {
    case 'end-of-intersection':
      if (result.intersection === null) return ''
      return result.relation === 'touch'
        ? `2人の範囲が1点だけ接している時間（${formatDuration(result.intersection.start)}）`
        : `2人とも当てはまると感じた ${formatRange(result.intersection)} の、いちばん遅い時間`
    case 'end-of-a':
      return `${a.label}の ${formatRange(a.range)} の、いちばん遅い時間`
    case 'end-of-b':
      return `${b.label}の ${formatRange(b.range)} の、いちばん遅い時間`
  }
}

function approverLabel(participant: ParticipantId, mode: Mode): string {
  if (mode === 'solo') return 'あなた'
  return `${participant}さん`
}

/** 候補以外の時間を選ぶ入力。確定ボタンを押すまでセッションには送らない */
function CustomTime({ comparison, onChoose }: { readonly comparison: ComparisonView; readonly onChoose: (s: Seconds) => void }) {
  const { scenario } = comparison
  const [value, setValue] = useState<Seconds | null>(null)
  const valid = value !== null && isValidAgreementSeconds(value, scenario.maxSeconds)
  const showError = value !== null && !valid
  return (
    <div className="custom-time">
      <DurationInput
        label="ほかの時間"
        hint="手がかり以外の時間を選ぶ"
        value={value}
        onChange={setValue}
        maxSeconds={scenario.maxSeconds}
        sliderMin={scenario.inputStepSeconds}
        stepSeconds={scenario.inputStepSeconds}
        invalid={showError}
      />
      {showError && (
        <p className="error" role="alert">
          1秒以上、{formatDuration(scenario.maxSeconds)}以下の時間を、数字だけで入力してください。
        </p>
      )}
      <button type="button" className="button button--secondary button--block" disabled={!valid} onClick={() => valid && onChoose(value)}>
        この時間にする
      </button>
    </div>
  )
}

/**
 * 完成した文と、その「いつ」「何をする」。表示するのは文にそのまま含まれる部分だけ。
 * 時間の数えはじめ（起点）は文に含まれないため、部品とは分けて注記する。
 */
function SentencePreview({ scenario, agreement }: { readonly scenario: Scenario; readonly agreement: AgreementView }) {
  if (agreement.text === null || agreement.parts === null) {
    return (
      <div className="sentence-card" aria-live="polite">
        <p className="note">時間を選ぶと、ここに言葉ができます。</p>
      </div>
    )
  }
  return (
    <div className="sentence-card sentence-card--ready" aria-live="polite">
      <p className="sentence-card__from">「{scenario.phrase}」を具体的に言うと</p>
      <p className="sentence-card__text">「{agreement.text}」</p>
      <dl className="sentence-parts">
        <div className="sentence-parts__item">
          <dt>いつ</dt>
          <dd>{agreement.parts.when}</dd>
        </div>
        <div className="sentence-parts__item">
          <dt>何をする</dt>
          <dd>{agreement.parts.action}</dd>
        </div>
      </dl>
      <p className="note sentence-card__origin">「今から」は、{scenario.originLabel}ときのことです。</p>
    </div>
  )
}

interface ApprovalPanelProps {
  readonly agreement: AgreementView
  readonly mode: Mode
  readonly onApprove: (participant: ParticipantId, feasibilityConfirmed: boolean) => void
  readonly onWithdraw: (participant: ParticipantId) => void
  readonly onRevise: () => void
}

/**
 * 完成した文の確認。ふたりモードでは A・B が同じ文をそれぞれ確認し、2人そろうまで完了しない。
 * 時間が変わると作り直される（key）ので、チェックも消える（セッション側でも確認はリセットされる）。
 */
function ApprovalPanel({ agreement, mode, onApprove, onWithdraw, onRevise }: ApprovalPanelProps) {
  const [checked, setChecked] = useState<Partial<Record<ParticipantId, boolean>>>({})
  const waiting = agreement.requiredApprovers.filter((p) => !agreement.approvedBy.includes(p))
  return (
    <div className="card approval">
      <p className="section-label">{mode === 'solo' ? '本当にできるか確かめよう' : '2人で同じ言葉を確かめよう'}</p>
      <p className="approval__sentence">
        <span className="approval__sentence-label">確かめる言葉</span>
        <span className="approval__sentence-text">「{agreement.text}」</span>
      </p>
      <h2>{agreement.feasibilityQuestion}</h2>
      <p className="note">
        {mode === 'solo'
          ? '「そう感じる時間」と「本当にできる時間」は別です。この言葉のとおりにできると思えたら、チェックしてください。'
          : '「そう感じる時間」と「本当にできる時間」は別です。言う人は「できるか」、聞く人は「待てるか」を考えて、2人ともチェックしてください。'}
      </p>
      {mode === 'solo' && (
        <p className="note">今回の相手は架空のサンプルなので、確認するのはあなただけです。相手が了承したことにはなりません。</p>
      )}
      <div className="approvers">
        {agreement.requiredApprovers.map((participant) => {
          const name = approverLabel(participant, mode)
          const tone = participant === 'A' ? 'a' : 'b'
          if (agreement.approvedBy.includes(participant)) {
            return (
              <div key={participant} className={`approver approver--${tone} approver--done`}>
                <p className="approver__done">
                  <Icon name="check" size={20} />
                  {name}：確認しました
                </p>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  aria-label={`${name}の確認を取り消す`}
                  onClick={() => {
                    // 取り消したら、チェックも外した状態から確認しなおす
                    setChecked({ ...checked, [participant]: false })
                    onWithdraw(participant)
                  }}
                >
                  取り消す
                </button>
              </div>
            )
          }
          const id = `feasible-${participant}`
          return (
            <div key={participant} className={`approver approver--${tone}`}>
              <p className="approver__status">{name}：まだ確認していません</p>
              <label htmlFor={id} className="checkbox">
                <input
                  id={id}
                  type="checkbox"
                  checked={checked[participant] ?? false}
                  onChange={(event) => setChecked({ ...checked, [participant]: event.target.checked })}
                />
                <span>{name}：この言葉のとおりに、実際にできる（待てる）</span>
              </label>
              <button
                type="button"
                className="button button--primary button--block"
                disabled={!checked[participant]}
                onClick={() => onApprove(participant, checked[participant] ?? false)}
              >
                {mode === 'solo' ? 'この言い方にする' : `${name} OK`}
              </button>
            </div>
          )
        })}
      </div>
      {mode === 'duo' && waiting.length > 0 && agreement.approvedBy.length > 0 && (
        <p className="approval__waiting" aria-live="polite">
          {waiting.map((p) => `${p}さん`).join('・')}の確認を待っています。2人がそろうと完成します。
        </p>
      )}
      <div className="approval__rethink">
        <p>この時間ではむずかしいときは、別の時間を話し合って選びなおせます。</p>
        <button type="button" className="button button--secondary button--block" onClick={onRevise}>
          時間を選びなおす
        </button>
      </div>
    </div>
  )
}

export function AgreementScreen(props: AgreementScreenProps) {
  const { comparison, agreement, mode, onChooseTime, onRevise, onBack, onRestartSameMode } = props
  const headingRef = useFocusHeading()
  const candidatesHeadingRef = useRef<HTMLHeadingElement>(null)
  const { scenario, result } = comparison

  // 確認済みの人がいる状態で時間を変えたら、確認がリセットされたことを知らせる
  const [tracked, setTracked] = useState({ seconds: agreement.seconds, approvals: agreement.approvedBy.length })
  const [approvalsReset, setApprovalsReset] = useState(false)
  if (tracked.seconds !== agreement.seconds || tracked.approvals !== agreement.approvedBy.length) {
    setApprovalsReset(tracked.seconds !== agreement.seconds && tracked.approvals > 0 && agreement.seconds !== null)
    setTracked({ seconds: agreement.seconds, approvals: agreement.approvedBy.length })
  }

  const revise = () => {
    onRevise()
    candidatesHeadingRef.current?.focus()
  }

  return (
    <section className="screen screen--agreement">
      <h1 ref={headingRef} tabIndex={-1}>
        「{scenario.phrase}」を、具体的な言葉にしよう
      </h1>
      <p className="lead">感じ方が違っていても、実際にできる時間を話し合って決められます。</p>

      <div className="card card--chart card--compact">
        <ComparisonChart scenario={scenario} a={comparison.a} b={comparison.b} result={result} description={comparison.description} />
      </div>

      <div className="card candidates">
        <h2 ref={candidatesHeadingRef} tabIndex={-1}>
          時間を選ぶ
        </h2>
        <p className="note">
          下の手がかりは、2人の答えから出した時間です。約束ではないので、どれにするかは自分たちで決めよう。
          {result.intersection === null
            ? '範囲が重なっていなくても、話し合えば決められます。'
            : '範囲が重なっていても、それだけで約束になるわけではありません。'}
        </p>
        {result.intersection === null && (
          <p className="note">2人の範囲は重なっていないため、共通範囲からの手がかりはありません。</p>
        )}
        {comparison.candidates.length > 0 ? (
          <div className="candidate-list" role="group" aria-label="時間の手がかり">
            {comparison.candidates.map((candidate) => (
              <button
                key={candidate.seconds}
                type="button"
                className={`candidate candidate--${candidate.basis}`}
                aria-pressed={agreement.seconds === candidate.seconds}
                onClick={() => onChooseTime(candidate.seconds)}
              >
                <span className="candidate__basis">{candidateLabel(candidate, comparison)}</span>
                <span className="candidate__time">{formatDuration(candidate.seconds)}</span>
                <span className="candidate__note">{candidateNote(candidate, comparison)}</span>
              </button>
            ))}
          </div>
        ) : (
          <p>手がかりになる時間がありません。下の「ほかの時間」から選んでください。</p>
        )}
        <CustomTime key={agreement.seconds ?? 'none'} comparison={comparison} onChoose={onChooseTime} />
      </div>

      <SentencePreview scenario={scenario} agreement={agreement} />

      <p className="notice" aria-live="polite">
        {approvalsReset && '時間が変わったので、確認はリセットされました。新しい言葉で、もう一度確かめてください。'}
      </p>

      {agreement.seconds !== null && (
        <ApprovalPanel
          key={agreement.seconds}
          agreement={agreement}
          mode={mode}
          onApprove={props.onApprove}
          onWithdraw={props.onWithdraw}
          onRevise={revise}
        />
      )}

      <div className="button-row">
        <button type="button" className="button button--secondary" onClick={onBack}>
          <Icon name="arrowLeft" size={18} />
          比較に戻る
        </button>
        <button type="button" className="button button--secondary" onClick={onRestartSameMode}>
          ほかの言葉でくらべる
        </button>
      </div>
    </section>
  )
}
