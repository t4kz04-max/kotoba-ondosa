# 言葉の温度差（kotoba-ondosa）

> 同じ言葉なのに、同じ意味じゃない。

「すぐ」「ちょっと待って」「あとで」のような曖昧な言葉を、人によってどう受け取っているかの違いに気づくためのインタラクティブWebアプリケーションです。
中学生向けプログラミングコンテスト（NIJIN教育万博2026）への応募作品として開発しています。

このアプリは、どちらの解釈が正しいかを判定しません。違いを見える形にし、具体的でお互いに確認できる言葉へ言い換えることを手助けします。

1. 曖昧な言葉に対する自分の解釈を入力する
2. 相手の解釈と比べる
3. 共通点と違いを可視化する
4. 曖昧な表現を、お互いに確認した具体的な表現へ変換する

> **現在の状態：Phase 5B（UI/UX の最終調整）**
> ひとりモード・ふたりモードで、最初から最後まで操作できます。Gemini Canvas の試作（Phase 4）を参考にしたデザインと比較結果の公開演出を実装し、スマートフォンでの操作性を調整しました。デザインの方針は [docs/UI_DESIGN_SPEC.md](docs/UI_DESIGN_SPEC.md) を参照してください。
> 仕様は [docs/PRD.md](docs/PRD.md) ほか docs/ 内の文書、開発の進め方は [docs/ROADMAP.md](docs/ROADMAP.md) を参照してください。

## 使用技術

- React 19
- TypeScript 6（strictモード）
- Vite 8
- Vitest 5
- CSS / SVG
- oxlint（Viteテンプレート標準のリンター）
- Git

## セットアップ

Node.js（v20.19以上、または v22.12以上を推奨。開発時は v24 で確認）と npm が必要です。

```bash
npm install
```

## 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:5173/ を開きます。

## ビルド

```bash
npm run build     # 型チェック + 本番ビルド（dist/ に出力）
npm run preview   # ビルド結果をローカルで確認
```

## テスト・チェック

```bash
npm run test       # Vitest でテストを1回実行
npm run test:watch # ファイル変更を監視してテストを実行
npm run typecheck  # TypeScript の型チェック
npm run lint       # oxlint による静的チェック
```

## ディレクトリ構成

```
kotoba-ondosa/
├── docs/              # 企画・ロードマップ・各Phaseのタスク資料
├── public/            # そのまま配信される静的ファイル
├── src/
│   ├── app/           # アプリのルートコンポーネントと全体設定
│   ├── components/    # 再利用できるUIコンポーネント
│   ├── features/      # 機能ごとの画面・ロジックのまとまり
│   ├── domain/        # Reactに依存しない計算ロジック（純粋関数）
│   ├── data/          # 言葉・場面の定義や、架空のサンプルデータ
│   ├── hooks/         # カスタムフック
│   ├── styles/        # グローバルCSS
│   └── main.tsx       # エントリーポイント
├── tests/             # Vitest のテスト
├── CLAUDE.md          # 開発エージェント向けの方針
├── index.html
├── package.json
├── tsconfig*.json
└── vite.config.ts     # Vite と Vitest の設定
```

## データについて

アプリ内で使用するサンプル回答は、架空のデモ用データであることを明示します。実際の調査結果や統計として扱うことはありません。
