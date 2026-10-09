import { useState } from 'react'
import { DurationInput } from '../../components/duration-input/DurationInput'
import { Icon } from '../../components/Icon'
import { ComparisonChart } from '../../components/timeline/ComparisonChart'
import { isValidAgreementSeconds } from '../../domain/agreement'
import { formatDuration } from '../../domain/format'
import type { AgreementCandidate, Mode, ParticipantId, Seconds } from '../../domain/types'
import type { AgreementView, ComparisonView } from '../../domain/views'
import { useFocusHeading } from '../../hooks/useFocusHeading'

interface AgreementScreenProps {
  readonly comparison: ComparisonView
  readonly agreement: AgreementView
  readonly mode: Mode
  readonly onChooseTime: (seconds: Seconds) => void
  readonly onApprove: (participant: ParticipantId, feasibilityConfirmed: boolean) => void
  readonly onRevise: () => void
  readonly onBack: () => void
  readonly onRestartSameMode: () => void
}

/** 候補の根拠。agreementCandidates が返した basis をそのまま言葉にする */
function candidateLabel(candidate: AgreementCandidate, comparison: ComparisonView): string {
  switch (candidate.basis) {
    case 'end-of-intersection':
      return '共通範囲の終わり'
    case 'end-of-a':
      return `${comparison.a.label}の範囲の終わり`
    case 'end-of-b':
      return `${comparison.b.label}の範囲の終わり`
  }
}

function candidateNote(candidate: AgreementCandidate, comparison: ComparisonView): string {
  switch (candidate.basis) {
    case 'end-of-intersection':
      return comparison.result.relation === 'touch'
        ? '2人の範囲が1点だけ接している時間'
        : '2人とも当てはまると感じた範囲の、いちばん遅い時間'
    case 'end-of-a':
      return `${comparison.a.label}が当てはまると感じた、いちばん遅い時間`
    case 'end-of-b':
      return `${comparison.b.label}が当てはまると感じた、いちばん遅い時間`
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
        hint="手がかり以外の時間にする"
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

/** 実行できるかの確認と承認。時間が変わると作り直される（key）ので、チェックも消える */
function ApprovalPanel({ agreement, mode, onApprove }: Pick<AgreementScreenProps, 'agreement' | 'mode' | 'onApprove'>) {
  const [checked, setChecked] = useState<Partial<Record<ParticipantId, boolean>>>({})
  return (
    <div className="card approval">
      <p className="section-label">{mode === 'solo' ? '実行できるかの確認' : '2人の確認'}</p>
      <h2>{agreement.feasibilityQuestion}</h2>
      <p className="note">
        「当てはまると感じる時間」と「実際にできる時間」は別です。この時間で本当にできるか、確かめてから承認してください。
      </p>
      {mode === 'solo' && <p className="note">今回の相手は架空のサンプルなので、確認するのはあなただけです。</p>}
      <div className="approvers">
        {agreement.requiredApprovers.map((participant) => {
          const name = approverLabel(participant, mode)
          const tone = participant === 'A' ? 'a' : 'b'
          if (agreement.approvedBy.includes(participant)) {
            return (
              <p key={participant} className={`approver approver--${tone} approver--done`}>
                <Icon name="check" size={20} />
                {name}：承認しました
              </p>
            )
          }
          const id = `feasible-${participant}`
          return (
            <div key={participant} className={`approver approver--${tone}`}>
              <label htmlFor={id} className="checkbox">
                <input
                  id={id}
                  type="checkbox"
                  checked={checked[participant] ?? false}
                  onChange={(event) => setChecked({ ...checked, [participant]: event.target.checked })}
                />
                <span>{name}：この時間で、実際にできる（待てる）</span>
              </label>
              <button
                type="button"
                className="button button--primary button--block"
                disabled={!checked[participant]}
                onClick={() => onApprove(participant, checked[participant] ?? false)}
              >
                {mode === 'solo' ? 'この言葉にする' : `${name} OK`}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AgreementScreen(props: AgreementScreenProps) {
  const { comparison, agreement, mode, onChooseTime, onRevise, onBack, onRestartSameMode } = props
  const headingRef = useFocusHeading()
  const { scenario } = comparison

  return (
    <section className="screen screen--agreement">
      <h1 ref={headingRef} tabIndex={-1}>
        「{scenario.phrase}」を、具体的な言葉にしよう
      </h1>

      <div className="card card--chart card--compact">
        <ComparisonChart
          scenario={scenario}
          a={comparison.a}
          b={comparison.b}
          result={comparison.result}
          description={comparison.description}
        />
      </div>

      <div className="card candidates">
        <h2>2人の感じ方からの手がかり</h2>
        <p className="note">
          手がかりは、2人が「当てはまる」と感じた時間から出したものです。その時間で本当にできるかは、別に確かめてください。どれにするかは自分たちで決めてください。
        </p>
        {comparison.result.intersection === null && (
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

      <div className={agreement.text === null ? 'sentence-card' : 'sentence-card sentence-card--ready'} aria-live="polite">
        {agreement.text === null ? (
          <p className="note">時間を選ぶと、ここに言葉ができます。</p>
        ) : (
          <>
            <p className="sentence-card__from">「{scenario.phrase}」を言いかえると</p>
            <p className="sentence-card__text">「{agreement.text}」</p>
          </>
        )}
      </div>

      {agreement.seconds !== null && (
        <>
          <ApprovalPanel key={agreement.seconds} agreement={agreement} mode={mode} onApprove={props.onApprove} />
          <button type="button" className="button button--secondary button--block" onClick={onRevise}>
            時間を選びなおす
          </button>
        </>
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
