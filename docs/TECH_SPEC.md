# TECH_SPEC.md

# 言葉の温度差：技術設計

Phase 0 で構築した React 19 + TypeScript 6（strict）+ Vite 8 + Vitest 5 の構成を前提とする。
**新しい依存パッケージは追加しない**（§11）。アプリはブラウザ内で完結する。

関連文書：[DOMAIN_SPEC.md](DOMAIN_SPEC.md) / [UX_SPEC.md](UX_SPEC.md) / [PRD.md](PRD.md)

---

## 1. ディレクトリ構成

Phase 0 の構成（`src/app` `src/components` `src/features` `src/domain` `src/data` `src/hooks` `src/styles` `tests`）をそのまま使う。
✅ は Phase 2 で実装済み。

```
src/
├── main.tsx                     # エントリーポイント
├── app/
│   ├── App.tsx                  # Phase 0 の仮画面。Phase 3 で useReducer と画面切り替えに置き換え
│   ├── appInfo.ts               # 作品名・副題
│   └── ErrorBoundary.tsx        # （Phase 3）予期しないエラー時の表示
├── domain/                      # React 非依存の純粋関数
│   ├── types.ts             ✅  # 型定義
│   ├── range.ts             ✅  # 検証・区間計算・6分類・compareRanges
│   ├── format.ts            ✅  # formatDuration, formatRange, formatSampleLabel
│   ├── describe.ts          ✅  # describeComparison（説明文）
│   ├── agreement.ts         ✅  # 具体化の候補・文型・実行可能性の問い
│   ├── scale.ts             ✅  # 線形時間軸の座標計算・目盛り
│   ├── session.ts           ✅  # SessionState / SessionEvent / transition / createSessionReducer
│   └── views.ts             ✅  # 画面に渡す情報の選択（selectInputView など）
├── data/
│   ├── scenarios.ts         ✅  # 3シナリオ
│   ├── samples.ts           ✅  # 架空のサンプル回答（冒頭コメントで架空と明記）
│   └── catalog.ts           ✅  # defaultCatalog（scenarios + samples）
├── components/                  # （Phase 3）画面をまたいで使う部品
│   ├── AppHeader.tsx            # 作品名・「最初から」
│   ├── ProgressSteps.tsx        # えらぶ → こたえる → くらべる → ことばにする
│   ├── ConfirmDialog.tsx        # ネイティブ <dialog> による確認
│   ├── TimeRangeInput.tsx       # スライダー＋数値入力（入力画面・具体化画面で共用）
│   └── timeline/
│       ├── TimelineChart.tsx    # 比較の SVG 図（入力プレビューと共用）
│       └── layout.ts            # 図の座標計算（scale.ts を使う純粋関数）
├── features/                    # （Phase 3）画面単位
│   ├── home/HomeScreen.tsx
│   ├── scenario-select/ScenarioSelectScreen.tsx
│   ├── input/InputScreen.tsx
│   ├── handoff/HandoffScreen.tsx      # HANDOFF と READY_TO_REVEAL（文言を props で切替）
│   ├── comparison/ComparisonScreen.tsx
│   ├── agreement/AgreementScreen.tsx
│   └── complete/CompleteScreen.tsx
├── hooks/                       # （Phase 3）
│   ├── useFocusHeading.ts       # 画面表示時に見出しへフォーカス
│   └── useElementWidth.ts       # ResizeObserver でコンテナ幅を取得（SVG 用）
└── styles/
    └── index.css                # グローバル CSS（Phase 3 は基本スタイルのみ）

tests/
├── appInfo.test.ts
├── domain/                  ✅  # range / format / describe / agreement / scale / session / views
├── data/                    ✅  # catalog（scenarios・samples の整合性）
└── components/                  # （Phase 3）timelineLayout.test.ts
```

- 依存の向き：`features` → `components` → `domain`、`app` → `data` → `domain`。`domain` は React にも `data` にも依存しない（データは `SessionCatalog` として引数で受け取る）。
- 画面ごとの CSS が必要になった場合は、各 feature フォルダに `*.css` を置く（CSS Modules やライブラリは使わない）。

## 2. コンポーネント設計（Phase 3）

| コンポーネント | 受け取るもの | 役割 |
|---|---|---|
| `App` | — | `useReducer(createSessionReducer(defaultCatalog), initialSessionState)` を持ち、`state.step` に応じて画面を1つ描画する |
| `InputScreen` | `selectInputView` の結果、`dispatch` | 範囲の入力。値の変更ごとに `SET_DRAFT`、決定で `SUBMIT_ANSWER` |
| `ComparisonScreen` 等 | `selectComparisonView`・`selectAgreementView` の結果、`dispatch` | 表示と操作。計算はしない |
| `TimeRangeInput` | 刻み・上限・現在値（未入力を含む）、`onChange` | ネイティブ range と数値入力。未入力を表現できる |
| `TimelineChart` | scenario、ラベル付きの範囲（1〜2件）、comparison（任意）、表示範囲（既定は `[0, maxSeconds]`） | SVG の描画のみ。座標は `layout.ts` |
| `AppHeader` | `onReset` | 「最初から」と確認ダイアログ |

- **秘匿のための props 制限**：入力画面には `selectInputView` の結果だけを渡す。この結果はもう一方の回答を含まない（テスト済み）。`HandoffScreen` には回答を一切渡さない。
- 入力中の範囲はセッションの `draft` に置く（未入力の確定をセッションが拒否できるようにするため）。

## 3. 状態管理方針

- アプリ全体の状態は `SessionState`（DOMAIN_SPEC §8）1つ。`App` の `useReducer` で持つ。
- 状態遷移は `src/domain/session.ts` の純粋関数 `transition` で行う。不正な遷移は拒否され、state は変わらない。
- `useReducer` には `createSessionReducer(catalog)` を使う。拒否時は同じ state オブジェクトが返るため再描画されない。開発時に拒否理由を確認したい場合は `transition` を直接呼ぶ。
- 比較結果・説明文・候補は state に保存せず、`views.ts` の関数で描画時に計算する（派生値）。
- 状態管理ライブラリ、ルーターは使わない。
  - ルーターを使わない理由：URL で画面を直接開けると、ふたりモードで相手の回答が見える経路ができるため。

## 4. ドメインロジックの配置

- 計算・検証・文生成・状態遷移はすべて `src/domain/` に置き、テストする。
- `src/data/` は定数データだけを持つ。
- 計算結果に依存する文（見出し・説明文・具体化の文・実行可能性の問い）は domain で生成する。固定の UI 文言（ボタン名など）は各コンポーネントに書く。

## 5. SVG 可視化の設計

- 時間軸は **線形**（DOMAIN_SPEC §6）。`createLinearScale({ start: viewStart, end: viewEnd }, { start: marginLeft, end: width - marginRight })` で scale を作る。
- 表示範囲の既定値は `[0, maxSeconds]`。将来の拡大表示は、表示範囲を変えて scale を作り直すだけで対応できる。はみ出した範囲は `projectRange` が切り取り、`clippedAtStart`／`clippedAtEnd` で「続きがある」ことを描ける。
- 目盛りは `generateTicks(view, maxTicks)`。`maxTicks` は描画幅から決める（例：おおむね 80px に1本）。
- `TimelineChart` は `useElementWidth` で実際の幅（px）を取得し、px 単位の座標で描く（`viewBox` の拡大縮小に任せると、スマートフォンで文字が小さくなりすぎるため）。
- 座標計算は `components/timeline/layout.ts` の純粋関数 `buildTimelineLayout(input, width)` に分離し、テストする。返すもの：目盛り、各範囲の帯、共通範囲の強調帯／接点の縦線／空白の矢印。
- 短い範囲・長さ0の範囲は最小の描画幅（またはひし形のマーカー）で描く。これは見た目の補正であり、正確な値は文章で示す。
- 色は CSS 変数で定義し、SVG は `fill="var(--color-a)"` のように参照する。模様（斜線）は `<pattern>` で定義する。
- アニメーションは Phase 5。

## 6. テスト戦略

| 対象 | 方法 | Phase | 状態 |
|---|---|---|---|
| domain の全関数 | Vitest 単体テスト（DOMAIN_SPEC §11） | 2 | ✅ |
| セッションの状態遷移 | 両モードの流れ、不正な遷移、未入力の確定拒否、リセット | 2 | ✅ |
| 画面に渡す情報 | B の入力画面に A の回答が含まれないこと | 2 | ✅ |
| data の整合性 | 最大値・刻み・サンプルの件数と有効性・架空フラグ | 2 | ✅ |
| `buildTimelineLayout` | 座標が描画範囲に収まる、各 relation で強調要素が正しく出る | 3 | |
| 画面・操作 | 手動テストチェックリスト（UX_SPEC の各画面、PRD §12） | 3 | |
| コンポーネントの自動テスト | `@testing-library/react` + `jsdom` が必要。依存追加のため **Phase 7 で承認を得て** 検討 | 7 | |

- テストの環境は Vitest 既定の `node`。テストファイルは `tests/` 以下（既存の `vite.config.ts` の設定のまま）。

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

Phase 2 の追加依存はゼロ。Phase 3 もゼロの予定。

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

### Phase 3：MVP（`src/app`・`src/features`・`src/components`・`src/hooks`）

1. `App` を `useReducer` 化し、全画面を仮表示で切り替えられるようにする（骨組み）
2. スタート画面・シナリオ選択画面
3. `TimeRangeInput`（未入力の表現を含む）・入力画面（A／B）
4. 交代画面・公開前画面
5. `layout.ts`（＋テスト）・`TimelineChart`
6. 比較結果画面（ひとりモードのサンプル切り替え含む）
7. 具体化画面（候補・実行可能性の確認・承認）
8. 完了画面
9. `AppHeader`（最初から）・`ProgressSteps`・`ErrorBoundary`
10. 基本スタイル・レスポンシブ確認・アクセシビリティ確認
11. 手動テストチェックリストの実施と記録

完了条件：PRD §14 の完成の定義を満たす。
