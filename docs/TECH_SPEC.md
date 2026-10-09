# TECH_SPEC.md

# 言葉の温度差：技術設計

Phase 0 で構築した React 19 + TypeScript 6（strict）+ Vite 8 + Vitest 5 の構成を前提とする。
**新しい依存パッケージは追加しない**（§10）。アプリはブラウザ内で完結する。

関連文書：[DOMAIN_SPEC.md](DOMAIN_SPEC.md) / [UX_SPEC.md](UX_SPEC.md) / [PRD.md](PRD.md)

---

## 1. ディレクトリ構成

Phase 0 の構成（`src/app` `src/components` `src/features` `src/domain` `src/data` `src/hooks` `src/styles` `tests`）をそのまま使う。

```
src/
├── main.tsx                     # 既存。エントリーポイント
├── app/
│   ├── App.tsx                  # 既存（Phase 0 の仮画面を Phase 3 で置き換え）。useReducer と画面切り替え
│   ├── appInfo.ts               # 既存。作品名・副題
│   └── ErrorBoundary.tsx        # 予期しないエラー時の表示
├── domain/                      # React 非依存の純粋関数（Phase 2）
│   ├── types.ts                 # DOMAIN_SPEC §3 の型
│   ├── range.ts                 # validateRange, intersectRanges, gapBetween, midpoint, classifyRelation, compareRanges
│   ├── format.ts                # formatDuration, formatRange, formatSampleLabel
│   ├── describe.ts              # describeComparison
│   ├── clarify.ts               # clarifyCandidates, buildClarificationText
│   ├── scale.ts                 # positionOnScale
│   └── session.ts               # SessionState, SessionAction, sessionReducer, initialSessionState
├── data/
│   ├── expressions.ts           # 3語の Expression 定義
│   └── samples.ts               # 架空のサンプル回答（冒頭コメントで架空と明記）
├── components/                  # 画面をまたいで使う部品
│   ├── AppHeader.tsx            # 作品名・「最初から」
│   ├── ProgressSteps.tsx        # えらぶ → こたえる → くらべる → ことばにする
│   ├── ConfirmDialog.tsx        # ネイティブ <dialog> による確認
│   └── timeline/
│       ├── TimelineChart.tsx    # 比較の SVG 図（入力プレビューと共用）
│       └── layout.ts            # 図の座標計算（純粋関数）
├── features/                    # 画面単位
│   ├── start/StartScreen.tsx
│   ├── select/SelectScreen.tsx
│   ├── input/InputScreen.tsx
│   ├── input/RangeInput.tsx     # 「早くて」「遅くて」のスライダー＋−／＋
│   ├── handoff/HandoffScreen.tsx  # 交代画面・公開前画面（文言を props で切替）
│   ├── compare/CompareScreen.tsx
│   ├── clarify/ClarifyScreen.tsx
│   └── done/DoneScreen.tsx
├── hooks/
│   ├── useFocusHeading.ts       # 画面表示時に見出しへフォーカス
│   └── useElementWidth.ts       # ResizeObserver でコンテナ幅を取得（SVG 用）
└── styles/
    └── index.css                # 既存。グローバル CSS（Phase 3 は基本スタイルのみ）

tests/
├── appInfo.test.ts              # 既存
├── domain/                      # range / format / describe / clarify / scale / session
├── data/                        # expressions・samples の整合性
└── components/
    └── timelineLayout.test.ts   # layout.ts の座標計算
```

- 依存の向き：`features` → `components` → `domain`、`features` → `data` → `domain`。`domain` は他のどこにも依存しない（React も import しない）。
- 画面ごとの CSS が必要になった場合は、各 feature フォルダに `*.css` を置く（CSS Modules やライブラリは使わない）。

## 2. コンポーネント設計

| コンポーネント | 受け取るもの | 役割 |
|---|---|---|
| `App` | — | `useReducer(sessionReducer)` を持ち、`state.step` に応じて画面を1つ描画する。`dispatch` を各画面へ渡す |
| `*Screen` | 表示に必要な state の一部、`dispatch`（または意味のあるコールバック） | 画面の表示と操作。計算は domain 関数を呼ぶだけ |
| `RangeInput` | `stops`, `value`（インデックスの組）, `onChange` | 2つのネイティブ range 入力と −／＋ ボタン。早くて ≤ 遅くて を保つ |
| `TimelineChart` | `expression`, 表示する範囲（1〜2件、ラベル付き）, `comparison?`, `compact?` | SVG の描画のみ。座標は `layout.ts` が計算 |
| `AppHeader` | `onReset` | 「最初から」と確認ダイアログ |

- **秘匿のための props 制限**：`HandoffScreen` と `InputScreen`（B の番）には `rangeA` を渡さない。見えてはいけない情報を、コンポーネントがそもそも受け取らない設計にする。
- 入力中の範囲（スライダーの位置）は `InputScreen` のローカル state とし、「これで決定」で初めて `submit-range` を dispatch する。

## 3. 状態管理方針

- アプリ全体の状態は `SessionState`（DOMAIN_SPEC §7）1つ。`App` の `useReducer` で持つ。
- `sessionReducer` は `src/domain/session.ts` の純粋関数とし、遷移表を単体テストで検証する。
- 比較結果・説明文・候補は state に保存せず、描画時に `rangeA`・`rangeB`（またはサンプル）から計算する（派生値）。計算は軽量なため `useMemo` は必須ではない。
- 状態管理ライブラリ（Redux、Zustand 等）、ルーター（React Router 等）は使わない。
  - ルーターを使わない理由：URL で画面を直接開けると、ふたりモードで相手の回答が見える経路ができるため。ブラウザの戻るボタンはアプリ外へ戻るだけになり、画面遷移の秘匿が保たれる。

## 4. ドメインロジックの配置

- DOMAIN_SPEC §5.6 の関数はすべて `src/domain/` に置く。
- `src/data/` は定数データだけを持ち、関数を持たない（型は `domain/types.ts` から import）。
- 表示文言のうち、計算結果に依存する文（見出し・説明文・具体化の文）は `domain/describe.ts`・`domain/clarify.ts` で生成し、テストする。固定の UI 文言（ボタン名など）は各コンポーネントに直接書く。

## 5. SVG 可視化の設計

- `TimelineChart` は `useElementWidth` でコンテナの実際の幅（px）を取得し、**px 単位の座標** で SVG を描く。
  - 理由：`viewBox` の拡大縮小に任せると、スマートフォンで目盛りの文字が読めないほど小さくなるため。
- 座標計算は `components/timeline/layout.ts` の純粋関数 `buildTimelineLayout(input, width)` に分離する。返すもの：
  - 目盛り（x 座標・ラベル・表示するかどうか。狭い幅では間引く）
  - 各範囲の帯（x, 幅, y, 幅0かどうか）
  - 共通範囲の強調帯 / 接点の縦線 / 空白の矢印（それぞれ有無と座標）
- x 座標は `positionOnScale`（DOMAIN_SPEC §8）× 描画幅。
- 幅0の範囲は最小の描画幅（例：ひし形のマーカー）で描く。
- 色の定義は CSS 変数で行い、SVG は `fill="var(--color-a)"` のように参照する（Phase 5 のデザイン差し替えを容易にする）。模様（斜線）は `<pattern>` で定義する。
- アニメーションは Phase 5。Phase 3 では静止画として正しく描けることを優先する。

## 6. テスト戦略

| 対象 | 方法 | Phase |
|---|---|---|
| domain の全関数 | Vitest 単体テスト（DOMAIN_SPEC §11） | 2 |
| `sessionReducer` | 遷移表の全行、input-b → input-a へ戻れないこと | 2 |
| data の整合性 | stops が昇順・先頭0・末尾 max・11点、サンプル範囲が有効で stops 上にある、各言葉に3件、`fictional: true`、`formatSampleLabel` の結果に「（架空）」が含まれる | 2 |
| `buildTimelineLayout` | 座標が 0〜幅に収まる、各 relation で強調要素が正しく出る | 3 |
| 画面・操作 | 手動テストチェックリスト（UX_SPEC の各画面、PRD §12 の受け入れ基準）を Phase 3 完了時に実施 | 3 |
| コンポーネントの自動テスト | `@testing-library/react` + `jsdom` が必要。依存追加のため **Phase 7 で承認を得て** 導入を検討 | 7 |

- テストの環境は Vitest 既定の `node`（DOM 不要）。
- テストファイルは `tests/` 以下に置く（既存の `vite.config.ts` の `include` 設定のまま動く）。

## 7. エラー処理

| 種類 | 対応 |
|---|---|
| ユーザーの入力ミス | UI で不正値を作れないようにする（UX_SPEC §3）。エラー表示は原則不要 |
| 不正な state（プログラムの誤り） | reducer は未定義の遷移を無視する。描画時に必要なデータが null なら `ErrorBoundary` に送る |
| domain 関数の例外（検証済み前提が破られた） | `ErrorBoundary` が「うまく表示できませんでした」と「最初から」ボタンを表示し、state をリセットできるようにする |
| `ResizeObserver` 非対応 | 幅を固定値（例：320px）として描画する |

- エラー内容をどこにも送信しない（ログ収集サービスは使わない）。開発時は `console.error` のみ。

## 8. レスポンシブ対応

- モバイルファーストの CSS。基準幅 360px、ブレークポイントは 600px（タブレット・PC で中央寄せ＋最大幅）の1つから始める。
- 確認する幅：320px / 375px / 768px / 1280px。
- タップ領域 44×44px 以上。`<meta name="viewport">` は既存の `index.html` の設定を使う。
- SVG は §5 の方法で幅に追従する。

## 9. アクセシビリティ

- 目標：WCAG 2.1 AA 相当（コントラスト 4.5:1、キーボード操作、フォーカス表示）。
- 画面遷移時は `useFocusHeading` で `h1` にフォーカス。
- スライダーはネイティブ `<input type="range">` ＋ `aria-valuetext`（UX_SPEC §3）。
- 図は `role="img"` ＋ 文章による同等情報（UX_SPEC §4.8）。
- 確認ダイアログはネイティブ `<dialog>`（`showModal()`）を使い、フォーカス管理をブラウザに任せる。
- `lang="ja"` は既存の `index.html` で設定済み。

## 10. データ保存方針・プライバシー

- **回答は保存しない**。state はメモリ上にのみ存在し、再読み込み・「最初から」・タブを閉じると消える。
- localStorage / sessionStorage / Cookie / IndexedDB は使わない。
- サーバー送信なし。アクセス解析なし。外部フォント・外部スクリプトの読み込みなし。
- 収集する個人情報：なし（名前の入力も MVP では求めない）。
- 将来、結果の保存・共有（拡張機能）を検討する場合は、必要性・保存範囲・保存期間・削除方法を事前に文書化し、承認を得る。

## 11. 外部依存の必要性

| 候補 | 判断 | 理由 |
|---|---|---|
| ルーター | 使わない | §3。画面は state で切り替える |
| 状態管理ライブラリ | 使わない | state は1つで、`useReducer` で十分 |
| グラフ・可視化ライブラリ（D3 等） | 使わない | 描く図は帯2本と目盛りだけで、SVG を直接書ける |
| UI ライブラリ・CSS フレームワーク | 使わない | 最終デザインは Phase 5。素の CSS で足りる |
| スライダー部品 | 使わない | ネイティブ range 入力の方がアクセシビリティが高い |
| `@testing-library/react`・`jsdom` | Phase 7 で要承認 | コンポーネント自動テストを行う場合のみ |
| 外部 API・DB・認証 | 使わない | CLAUDE.md の方針 |

Phase 2・3 の追加依存はゼロとする。

## 12. Phase 2 と Phase 3 の実装順序

### Phase 2：コアロジック（`src/domain`・`src/data`・`tests`）

1. `domain/types.ts`：型定義
2. `domain/range.ts`：`validateRange` → `intersectRanges` → `gapBetween` → `midpoint` → `classifyRelation` → `compareRanges`（境界値テスト込み）
3. `domain/format.ts`：`formatDuration`・`formatRange`・`formatSampleLabel`
4. `domain/scale.ts`：`positionOnScale`
5. `domain/describe.ts`：`describeComparison`（禁止語テスト込み）
6. `domain/clarify.ts`：`clarifyCandidates`・`buildClarificationText`
7. `data/expressions.ts`・`data/samples.ts` と整合性テスト
8. `domain/session.ts`：`sessionReducer` と遷移テスト

完了条件：`npm run typecheck`・`npm run test`・`npm run build` が成功する。

### Phase 3：MVP（`src/app`・`src/features`・`src/components`・`src/hooks`）

1. `App` を `useReducer` 化し、全画面を仮表示で切り替えられるようにする（骨組み）
2. スタート画面・選択画面
3. `RangeInput`・入力画面（A／B）
4. 交代画面・公開前画面
5. `layout.ts`（＋テスト）・`TimelineChart`
6. 比較結果画面（ひとりモードのサンプル切り替え含む）
7. 具体化画面（候補・確認）
8. 完了画面
9. `AppHeader`（最初から）・`ProgressSteps`・`ErrorBoundary`
10. 基本スタイル・レスポンシブ確認・アクセシビリティ確認
11. 手動テストチェックリストの実施と記録

完了条件：PRD §14 の完成の定義を満たす。
