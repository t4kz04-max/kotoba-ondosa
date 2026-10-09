# TECH_SPEC.md

# 言葉の温度差：技術設計

Phase 0 で構築した React 19 + TypeScript 6（strict）+ Vite 8 + Vitest 5 の構成を前提とする。
**新しい依存パッケージは追加しない**（§11）。アプリはブラウザ内で完結する。

関連文書：[DOMAIN_SPEC.md](DOMAIN_SPEC.md) / [UX_SPEC.md](UX_SPEC.md) / [PRD.md](PRD.md)

---

## 1. ディレクトリ構成

Phase 0 の構成（`src/app` `src/components` `src/features` `src/domain` `src/data` `src/hooks` `src/styles` `tests`）をそのまま使う。
②は Phase 2、③は Phase 3 で実装。

```
src/
├── main.tsx                         # エントリーポイント
├── app/
│   ├── App.tsx                  ③  # useReducer・ヘッダー・進行表示・ErrorBoundary
│   ├── SessionScreens.tsx       ③  # state.step に応じて画面を1つ描画。views.ts の結果だけを各画面へ渡す
│   ├── ContextScreens.tsx       6A  # 「場面を変えて比べる」の画面の切り替え
│   ├── ErrorBoundary.tsx        ③  # 予期しないエラー時の表示
│   └── appInfo.ts                   # 作品名・副題
├── domain/                          # React 非依存の純粋関数
│   ├── types.ts                 ②  # 型定義
│   ├── range.ts                 ②  # 検証・区間計算・6分類・compareRanges
│   ├── format.ts                ②  # formatDuration, formatRange, formatSampleLabel
│   ├── describe.ts              ②  # describeComparison（説明文）
│   ├── agreement.ts             ②  # 具体化の候補・文型・実行可能性の問い
│   ├── scale.ts                 ②③ # 線形時間軸の座標計算・目盛り・拡大表示の範囲（computeZoomView は ③）
│   ├── session.ts               ②  # SessionState / SessionEvent / transition / createSessionReducer
│   ├── views.ts                 ②  # 画面に渡す情報の選択（selectInputView など）
│   ├── contextSession.ts        6A  # 「場面を変えて比べる」の状態と遷移（既存セッションとは独立）
│   └── contextCompare.ts        6A  # 3区間の共通部分・一致・説明文
├── data/
│   ├── scenarios.ts             ②  # 3シナリオ
│   ├── samples.ts               ②  # 架空のサンプル回答（冒頭コメントで架空と明記）
│   ├── catalog.ts               ②  # defaultCatalog（scenarios + samples）
│   └── contextScenes.ts         6A  # 「場面を変えて比べる」の3場面と共通設定
├── components/                      # 画面をまたいで使う部品（③）
│   ├── AppHeader.tsx                # 作品名・「最初から」
│   ├── ProgressSteps.tsx            # えらぶ → こたえる → くらべる → ことばにする
│   ├── ConfirmDialog.tsx            # ネイティブ <dialog> による確認
│   ├── Icon.tsx                 5A  # 装飾用のインライン SVG アイコン（外部ライブラリなし）
│   ├── duration-input/
│   │   ├── DurationInput.tsx        # スライダー＋数値入力（入力画面・具体化画面で共用）
│   │   └── durationFields.ts        # 数値欄 ⇔ 秒の変換（純粋関数）
│   └── timeline/
│       ├── TimelineChart.tsx        # SVG の描画のみ（入力プレビューと比較で共用）。5A で重ね合わせの段・公開演出
│       ├── ComparisonChart.tsx      # 全体表示／拡大表示の切り替えと表示範囲の明記
│       ├── ContextChart.tsx     6A  # 3場面の図（全体表示／拡大表示、共通部分）
│       ├── sceneStyle.ts        6A  # 場面の線種（s1〜s3）と丸数字
│       └── layout.ts                # 図の座標計算（scale.ts を使う純粋関数）
├── features/                        # 画面単位（③）
│   ├── home/HomeScreen.tsx
│   ├── scenario-select/ScenarioSelectScreen.tsx
│   ├── input/InputScreen.tsx
│   ├── input/inputMessages.ts       # validateDraft のエラー → 表示文
│   ├── input/RangeInputPanel.tsx 6A # 早くて／遅くて・エラー・プレビュー（入力画面と場面の入力で共用）
│   ├── context/ContextInputScreen.tsx  6A
│   ├── context/ContextResultScreen.tsx 6A
│   ├── handoff/HandoffScreen.tsx    # HANDOFF と READY_TO_REVEAL（回答を受け取らない）
│   ├── comparison/ComparisonScreen.tsx
│   ├── agreement/AgreementScreen.tsx
│   └── complete/CompleteScreen.tsx
├── hooks/                           # ③
│   ├── useFocusHeading.ts           # 画面表示時に見出しへフォーカス
│   ├── useElementWidth.ts           # ResizeObserver でコンテナ幅を取得（SVG 用）
│   └── useRevealOnce.ts         5A  # 比較結果の公開演出を同じ回答につき1回だけ行う
└── styles/
    └── index.css                    # デザインシステム（トークン・部品・画面・図・演出）。仕様は UI_DESIGN_SPEC.md

tests/
├── appInfo.test.ts
├── domain/                      ②③ # range / format / describe / agreement / scale / session / views
├── data/                        ②  # catalog（scenarios・samples の整合性）
├── components/                  ③  # timelineLayout / durationFields
└── app/screens.test.tsx         ③  # 画面の描画内容（react-dom/server）
```

- 依存の向き：`features` → `components` → `domain`、`app` → `data` → `domain`。`domain` は React にも `data` にも依存しない（データは `SessionCatalog` として引数で受け取る）。
- 画面ごとの CSS が必要になった場合は、各 feature フォルダに `*.css` を置く（CSS Modules やライブラリは使わない）。

## 2. コンポーネント設計

| コンポーネント | 受け取るもの | 役割 |
|---|---|---|
| `App` | — | `useReducer(createSessionReducer(defaultCatalog), initialSessionState)` を持つ |
| `SessionScreens` | state, dispatch, catalog | `views.ts` で画面用の情報を選び、各画面にコールバックとともに渡す |
| `InputScreen` | `selectInputView` の結果、コールバック | 範囲の入力。値の変更ごとに `SET_DRAFT`、決定で `SUBMIT_ANSWER`。エラーは `validateDraft` の結果を表示 |
| `HandoffScreen` | variant、`onContinue` のみ | 回答を受け取らないため、表示しようがない |
| `ComparisonScreen` / `AgreementScreen` / `CompleteScreen` | `selectComparisonView`・`selectAgreementView` の結果、コールバック | 表示と操作。計算はしない |
| `DurationInput` | 値（null＝未入力、NaN＝数字以外）、上限、刻み、`onChange` | ネイティブ range（大まかな調整）と数値欄（正確な調整）。単位は上限1時間以下なら「分・秒」、それ以上なら「時間・分」 |
| `ComparisonChart` | scenario、a・b、result、description | 全体表示／拡大表示の切り替えと、現在の表示範囲の文章表示 |
| `TimelineChart` | 表示範囲、ラベル付きの範囲（1〜2件）、comparison（任意） | SVG の描画のみ。座標は `layout.ts` |
| `AppHeader` | `showReset`、`onReset` | 「最初から」と確認ダイアログ |

- **秘匿のための props 制限**：入力画面には `selectInputView` の結果だけを渡す。この結果はもう一方の回答を含まない（テスト済み）。`HandoffScreen` には回答を一切渡さない。
- 入力中の範囲はセッションの `draft` に置く（未入力の確定をセッションが拒否できるようにするため）。

## 3. 状態管理方針

- アプリ全体の状態は `SessionState`（DOMAIN_SPEC §8）1つ。`App` の `useReducer` で持つ。
- 状態遷移は `src/domain/session.ts` の純粋関数 `transition` で行う。不正な遷移は拒否され、state は変わらない。
- `useReducer` には `createSessionReducer(catalog)` を使う。拒否時は同じ state オブジェクトが返るため再描画されない。開発時に拒否理由を確認したい場合は `transition` を直接呼ぶ。
- 比較結果・説明文・候補は state に保存せず、`views.ts` の関数で描画時に計算する（派生値）。
- 「場面を変えて比べる」（Phase 6A）は別の `ContextState`（`src/domain/contextSession.ts`）を `App` のもう1つの `useReducer` で持つ。どちらの体験を表示するかは `App` の `experience`（'compare' | 'context'）で切り替え、既存の `SessionState` と遷移は変更しない。「最初から」は両方をリセットする。
- 状態管理ライブラリ、ルーターは使わない。
  - ルーターを使わない理由：URL で画面を直接開けると、ふたりモードで相手の回答が見える経路ができるため。

## 4. ドメインロジックの配置

- 計算・検証・文生成・状態遷移はすべて `src/domain/` に置き、テストする。
- `src/data/` は定数データだけを持つ。
- 計算結果に依存する文（見出し・説明文・具体化の文・実行可能性の問い）は domain で生成する。固定の UI 文言（ボタン名など）は各コンポーネントに書く。

## 5. SVG 可視化の設計

- 時間軸は **線形**（DOMAIN_SPEC §6）。`createLinearScale({ start: viewStart, end: viewEnd }, { start: marginLeft, end: width - marginRight })` で scale を作る。
- **全体表示**：表示範囲 `[0, maxSeconds]`。**拡大表示**：`computeZoomView([a, b], maxSeconds)` の表示範囲。どちらも scale を作り直すだけなので線形性は保たれる。`ComparisonChart` が切り替えを持ち、現在の表示範囲を文章で明記する。
- はみ出した範囲は `projectRange` が切り取り、`clippedAtStart`／`clippedAtEnd` で「続きがある」こと（◀ ▶）を描く（拡大表示は A・B が必ず収まるので通常は発生しない）。
- 目盛りは `generateTicks(view, maxTicks)`。`maxTicks` は描画幅から決める（例：おおむね 80px に1本）。
- `TimelineChart` は `useElementWidth` で実際の幅（px）を取得し、px 単位の座標で描く（`viewBox` の拡大縮小に任せると、スマートフォンで文字が小さくなりすぎるため）。
- 座標計算は `components/timeline/layout.ts` の純粋関数 `buildTimelineLayout(input, width)` に分離し、テストする。返すもの：目盛り、各範囲の帯、共通範囲の強調帯／接点の縦線／空白の矢印。
- **最小描画幅は使わない**。短い範囲は実際の幅のまま描き、全体表示で 4px 未満の帯があれば（`hasTinyBar`）拡大表示を案内する。長さ0の範囲は幅を持たないひし形のマーカー、1点接触の共通点は縦線と丸で示す。
- 色は CSS 変数で定義し、SVG は `fill="var(--color-a)"` のように参照する。模様（斜線）は `<pattern>` で定義する。
- 比較画面では A・B の段の下に「重ね合わせ」の段を加える（`buildTimelineLayout` の `overlay: true`。x 座標は上の段と同じ scale）。
- 公開演出（Phase 5A）は CSS の `@keyframes` だけで行い、`useRevealOnce` で同じ回答につき1回に限る。`prefers-reduced-motion` では止める。詳細は [UI_DESIGN_SPEC.md](UI_DESIGN_SPEC.md) §7。

## 6. テスト戦略

| 対象 | 方法 | Phase | 状態 |
|---|---|---|---|
| domain の全関数 | Vitest 単体テスト（DOMAIN_SPEC §11） | 2・3 | ✅ |
| セッションの状態遷移 | 両モードの流れ、不正な遷移、未入力の確定拒否、リセット | 2 | ✅ |
| 画面に渡す情報 | B の入力画面に A の回答が含まれないこと | 2 | ✅ |
| data の整合性 | 最大値・刻み・サンプルの件数と有効性・架空フラグ | 2 | ✅ |
| `buildTimelineLayout` | 線形の座標、最小描画幅なし、全体・拡大表示、空白・1点接触・点の描画 | 3 | ✅ |
| 数値欄の変換 | 未入力・全角数字・数字以外（NaN）・往復変換 | 3 | ✅ |
| 画面の描画内容 | `react-dom/server` の `renderToStaticMarkup` で各状態の画面を HTML にして確認（未入力の確定不可、エラー表示、公開前の非表示、承認リセット、完了・再スタート）。追加依存なし | 3 | ✅ |
| ブラウザでの操作 | 開発中にヘッドレス Edge（DevTools Protocol）で両モードを通し操作し、320/375/1280px の横はみ出しとコンソールエラーを確認。スクリプトはリポジトリに含めない | 3 | ✅ |
| コンポーネントの操作の自動テスト | クリック等の操作を含むテストは `@testing-library/react` + `jsdom` が必要。依存追加のため **Phase 7 で承認を得て** 検討 | 7 | |

- テストの環境は Vitest 既定の `node`。テストファイルは `tests/` 以下の `*.test.ts`・`*.test.tsx`。

## 7. エラー処理

| 種類 | 対応 |
|---|---|
| ユーザーの入力ミス | 未入力・逆転・上限超過は確定できない。入力欄の近くにエラー文を表示（UX_SPEC §3） |
| 不正な遷移 | `transition` が拒否し、state を変えない |
| domain 関数の例外（検証済み前提が破られた） | `ErrorBoundary` が「うまく表示できませんでした」と「最初から」ボタンを表示 |
| `ResizeObserver` 非対応 | 幅を固定値（例：320px）として描画する |

- エラー内容をどこにも送信しない。開発時は `console.error` のみ。

## 8. レスポンシブ対応

- モバイルファーストの CSS。基準幅 360px、ブレークポイントは 600px の1つから始める。
- 確認する幅：320px / 375px / 768px / 1280px。
- タップ領域 44×44px 以上。数値入力は `inputmode="numeric"`。
- SVG は §5 の方法で幅に追従する。

## 9. アクセシビリティ

- 目標：WCAG 2.1 AA 相当（コントラスト 4.5:1、キーボード操作、フォーカス表示）。
- 画面遷移時は `useFocusHeading` で `h1` にフォーカス。
- 入力はネイティブの `<input type="range">`・数値入力・チェックボックスを使う（UX_SPEC §3・§5）。
- 図は `role="img"` ＋ 文章による同等情報（UX_SPEC §4.8）。
- 確認ダイアログはネイティブ `<dialog>`（`showModal()`）。
- `lang="ja"` は既存の `index.html` で設定済み。

## 10. データ保存方針・プライバシー

- **回答は保存しない**。state はメモリ上にのみ存在し、再読み込み・「最初から」・タブを閉じると消える。
- localStorage / sessionStorage / Cookie / IndexedDB は使わない。
- サーバー送信なし。アクセス解析なし。外部フォント・外部スクリプトの読み込みなし。
- 収集する個人情報：なし（名前の入力も求めない）。
- 将来、結果の保存・共有を検討する場合は、必要性・保存範囲・保存期間・削除方法を事前に文書化し、承認を得る。

## 11. 外部依存の必要性

| 候補 | 判断 | 理由 |
|---|---|---|
| ルーター | 使わない | §3 |
| 状態管理ライブラリ | 使わない | state は1つで、`useReducer` で十分 |
| グラフ・可視化ライブラリ（D3 等） | 使わない | 線形スケールと目盛りは `scale.ts` で実装済み |
| UI ライブラリ・CSS フレームワーク | 使わない | 最終デザインは Phase 5。素の CSS で足りる |
| スライダー部品 | 使わない | ネイティブ入力の方がアクセシビリティが高い |
| `@testing-library/react`・`jsdom` | Phase 7 で要承認 | コンポーネント自動テストを行う場合のみ |
| 外部 API・DB・認証 | 使わない | CLAUDE.md の方針 |

Phase 2・3 の追加依存はゼロ。

## 12. 実装順序

### Phase 2：コアロジック ✅ 完了

1. `domain/types.ts`
2. `domain/range.ts`（検証・区間計算・6分類・比較）
3. `domain/format.ts`
4. `domain/scale.ts`（線形スケール・目盛り）
5. `domain/describe.ts`
6. `domain/agreement.ts`
7. `data/scenarios.ts`・`data/samples.ts`・`data/catalog.ts`
8. `domain/session.ts`・`domain/views.ts`
9. 各テスト

### Phase 3：MVP ✅ 完了

1. `domain/scale.ts` に `computeZoomView`（拡大表示の範囲）を追加
2. `components/timeline/layout.ts`・`TimelineChart`・`ComparisonChart`（全体／拡大）
3. `DurationInput`（スライダー＋数値入力、未入力の表現）
4. 各画面（スタート・シナリオ選択・入力・交代・公開前・比較・具体化・完了）
5. `SessionScreens`・`App`（useReducer）・`AppHeader`・`ProgressSteps`・`ErrorBoundary`
6. 基本スタイル（レスポンシブ・フォーカス表示）
7. テスト追加とブラウザでの通し操作の確認

完了条件：PRD §14 の完成の定義を満たす。
