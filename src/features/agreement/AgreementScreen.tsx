import { useState } from 'react'
import { DurationInput } from '../../components/duration-input/DurationInput'
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
        value={value}
        onChange={setValue}
        maxSeconds={scenario.maxSeconds}
        sliderMin={scenario.inputStepSeconds}
        stepSeconds={scenario.inputStepSeconds}
      />
      {showError && (
        <p className="error" role="alert">
          1秒以上、{formatDuration(scenario.maxSeconds)}以下の時間を、数字だけで入力してください。
        </p>
      )}
      <button type="button" className="button button--secondary" disabled={!valid} onClick={() => valid && onChoose(value)}>
        この時間にする
      </button>
    </div>
  )
}

/** 実行できるかの確認と承認。時間が変わると作り直される（key）ので、チェックも消える */
function ApprovalPanel({ agreement, mode, onApprove }: Pick<AgreementScreenProps, 'agreement' | 'mode' | 'onApprove'>) {
  const [checked, setChecked] = useState<Partial<Record<ParticipantId, boolean>>>({})
  return (
    <div className="approval">
      <h2>{agreement.feasibilityQuestion}</h2>
      <p className="note">
        「当てはまると感じる時間」と「実際にできる時間」は別です。この時間で本当にできるか、確かめてから承認してください。
      </p>
      {mode === 'solo' && <p className="note">今回の相手は架空のサンプルなので、確認するのはあなただけです。</p>}
      {agreement.requiredApprovers.map((participant) => {
        const name = approverLabel(participant, mode)
        if (agreement.approvedBy.includes(participant)) {
          return (
            <p key={participant} className="approved">
              ✓ {name}：承認しました
            </p>
          )
        }
        const id = `feasible-${participant}`
        return (
          <div key={participant} className="approver">
            <label htmlFor={id} className="checkbox">
              <input
                id={id}
                type="checkbox"
                checked={checked[participant] ?? false}
                onChange={(event) => setChecked({ ...checked, [participant]: event.target.checked })}
              />
              {name}：この時間で、実際にできる（待てる）
            </label>
            <button
              type="button"
              className="button button--primary"
              disabled={!checked[participant]}
              onClick={() => onApprove(participant, checked[participant] ?? false)}
            >
              {mode === 'solo' ? 'この言葉にする' : `${name} OK`}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function AgreementScreen(props: AgreementScreenProps) {
  const { comparison, agreement, mode, onChooseTime, onRevise, onBack, onRestartSameMode } = props
  const headingRef = useFocusHeading()
  const { scenario } = comparison

  return (
    <section className="screen">
      <h1 ref={headingRef} tabIndex={-1}>
        「{scenario.phrase}」を、具体的な言葉にしよう
      </h1>

      <ComparisonChart
        scenario={scenario}
        a={comparison.a}
        b={comparison.b}
        result={comparison.result}
        description={comparison.description}
      />

      <div className="candidates">
        <h2>2人の感じ方からの手がかり</h2>
        <p className="note">
          手がかりは、2人が「当てはまる」と感じた時間から出したものです。その時間で本当にできるかは、別に確かめてください。どれにするかは自分たちで決めてください。
        </p>
        {comparison.candidates.length > 0 ? (
          <div className="toggle toggle--stack" role="group" aria-label="時間の手がかり">
            {comparison.candidates.map((candidate) => (
              <button
                key={candidate.seconds}
                type="button"
                className="toggle__button"
                aria-pressed={agreement.seconds === candidate.seconds}
                onClick={() => onChooseTime(candidate.seconds)}
              >
                {candidateLabel(candidate, comparison)}：{formatDuration(candidate.seconds)}
              </button>
            ))}
          </div>
        ) : (
          <p>手がかりになる時間がありません。下の「ほかの時間」から選んでください。</p>
        )}
        <CustomTime key={agreement.seconds ?? 'none'} comparison={comparison} onChoose={onChooseTime} />
      </div>

      <div className="preview" aria-live="polite">
        {agreement.text === null ? (
          <p className="note">時間を選ぶと、ここに言葉ができます。</p>
        ) : (
          <p>
            <span className="preview__from">「{scenario.phrase}」→</span>
            <strong className="preview__text">「{agreement.text}」</strong>
          </p>
        )}
      </div>

      {agreement.seconds !== null && (
        <>
          <ApprovalPanel key={agreement.seconds} agreement={agreement} mode={mode} onApprove={props.onApprove} />
          <button type="button" className="button button--secondary" onClick={onRevise}>
            時間を選びなおす
          </button>
        </>
      )}

      <div className="button-row">
        <button type="button" className="button button--secondary" onClick={onBack}>
          比較に戻る
        </button>
        <button type="button" className="button button--secondary" onClick={onRestartSameMode}>
          ほかの言葉でくらべる
        </button>
      </div>
    </section>
  )
}
