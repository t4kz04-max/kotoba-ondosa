import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  readonly children: ReactNode
  readonly onReset: () => void
}

interface ErrorBoundaryState {
  readonly hasError: boolean
}

/** 予期しないエラーのとき、最初に戻れる画面を出す。エラー内容はどこにも送信しない */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <section className="screen screen--center" role="alert">
        <h1>うまく表示できませんでした</h1>
        <p>お手数ですが、最初からやり直してください。</p>
        <button
          type="button"
          className="button button--primary"
          onClick={() => {
            this.props.onReset()
            this.setState({ hasError: false })
          }}
        >
          最初から
        </button>
      </section>
    )
  }
}
