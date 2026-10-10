# 言葉の温度差（kotoba-ondosa）

> 同じ言葉なのに、同じ意味じゃない。

「すぐ」「ちょっと待って」「あとで」のような曖昧な言葉を、人によってどう受け取っているかの違いに気づくためのインタラクティブWebアプリケーションです。
NIJIN教育万博2026 プログラミングコンテストへの応募作品です。

このアプリは、どちらの解釈が正しいかを判定しません。違いを見える形にし、具体的でお互いに確認できる言葉へ言い換えることを手助けします。

1. 曖昧な言葉に対する自分の解釈を入力する
2. 相手の解釈と比べる
3. 共通点と違いを可視化する
4. 曖昧な表現を、お互いに確認した具体的な表現へ変換する

> **現在の状態：Phase 8B（応募資料の準備）**
> ひとりモード・ふたりモードに加えて、同じ「すぐ」を3つの場面で答えて自分の中の違いを見る「場面を変えて比べる」を体験できます（[docs/PRD.md](docs/PRD.md) §16）。比較のあとは「いつ・何をする」が伝わる具体的な文に言い換え、ふたりモードでは2人が同じ文を確認したときだけ「約束」になります（§15b）。Gemini Canvas の試作（Phase 4）を参考にしたデザインと比較結果の公開演出を実装し、スマートフォンでの操作性を調整しています。デザインの方針は [docs/UI_DESIGN_SPEC.md](docs/UI_DESIGN_SPEC.md) を参照してください。
> 仕様は [docs/PRD.md](docs/PRD.md) ほか docs/ 内の文書、開発の進め方は [docs/ROADMAP.md](docs/ROADMAP.md) を参照してください。

## すぐに動かす（審査・確認用）

作品データ（ZIP）には、ビルド済みのアプリ `dist/` が入っています。**`dist/index.html` をダブルクリックして直接開くと動きません**（ブラウザが file:// からのモジュール読み込みを止めるため）。次のどちらかの方法で、Web サーバーから開いてください。

**方法1：Node.js を使う（おすすめ）** — Node.js（v20.19 以上）が必要です。

```powershell
cd <ZIPを展開したフォルダ>   # README.md がある場所
npm ci                # 依存をインストール（初回のみ。インターネット接続が必要）
npm run build         # ビルドしなおす（dist/ は同梱済みなので省略可）
npm run preview       # http://localhost:4173/ で dist/ を配信
```

ブラウザで http://localhost:4173/ を開きます。PowerShell で「スクリプトの実行が無効」と表示される場合は、`npm` を `npm.cmd` に置きかえてください（例：`npm.cmd ci`）。

**方法2：Python がある場合** — `dist` フォルダで `python -m http.server 8000` を実行し、http://localhost:8000/ を開きます。

対応ブラウザ：最新の Microsoft Edge・Google Chrome で動作を確認しています（Safari・Firefox、スマートフォン実機は未確認）。

## 操作方法（3つの体験）

スタート画面で体験を選びます。どの画面でも右上の「最初から」でスタートに戻れます。

- **ひとりで体験する**：言葉（すぐ行く／ちょっと待って／あとでやる）を選ぶ →「早くて」「遅くて」の時間をスライダーか数字で入力（0分は「0分にする」）→「これで決定」→ 架空のサンプルと同じ時間軸でくらべる（全体表示／拡大表示、サンプルの切り替え）→「具体的な言葉にする」→ 時間を選び、チェックして「この言い方にする」→ 完成した文をコピーできます。
- **ふたりで比べる**：A さんが入力 → 交代画面で端末を B さんに渡す（A の答えはかくれる）→ B さんが入力 →「2人の感覚を公開する」→「具体的な言葉にする」で時間を選び、A さんと B さんがそれぞれ確認して OK → 2人とも確認すると「ことばが、約束になった。」。時間を変えると確認はやり直しになります。
- **場面を変えて比べる**：同じ「すぐ」を「すぐ行く」「すぐ返信する」「すぐ始める」の3つの場面で順に入力 → 3つの範囲と、3つすべてに共通する時間が同じ時間軸に表示されます。

キーボードだけでも操作できます（Tab で移動、Enter で決定、矢印キーでスライダー）。

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
npm ci        # package-lock.json のとおりに依存をインストール（初回・提出物の確認用）
```

### Windows（PowerShell）での手順

```powershell
cd <このフォルダ>
npm ci
npm run build
npm run preview
```

表示された URL（通常は http://localhost:4173/ ）をブラウザで開きます。

- 「このシステムではスクリプトの実行が無効になっているため…」と表示される場合は、`npm` の代わりに `npm.cmd` を使ってください（例：`npm.cmd ci`）。
- `dist/index.html` をダブルクリックして直接開く（file://）方法では動きません。`npm run preview` などの Web サーバーで開いてください。
- ビルド結果は相対パスで出力されるので、`dist/` フォルダの中身をそのまま任意の Web サーバー（サブフォルダでも可）に置けます。

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

## 公開（Vercel）

このアプリは静的なファイル（`dist/`）だけで動くので、Vercel にそのまま公開できます。設定は `vercel.json` にあります（`npm ci` → `npm run build` → `dist` を公開。セキュリティ用のヘッダー付き）。

1. GitHub に空のリポジトリを作り、このリポジトリを push する（公開・非公開は応募条件に合わせて選ぶ）。
2. https://vercel.com に GitHub アカウントでログインし、「Add New… → Project」でそのリポジトリを選ぶ。
3. Framework Preset が「Vite」になっていることを確認して「Deploy」。
4. 表示された `https://…vercel.app` の URL を開き、[docs/DEVICE_TEST_GUIDE.md](docs/DEVICE_TEST_GUIDE.md) の手順でスマートフォンから確認する。

GitHub を使わない場合は、Vercel CLI（`npm i -g vercel` のあと `vercel` → `vercel --prod`）でも公開できます。

## 提出用 ZIP

応募用の作品データは、次のコマンドで作ります（Windows。ビルドしなおしてから作成します）。

```powershell
npm run build
node scripts/make-submission-zip.mjs
```

`release/kotoba-ondosa-submission.zip` ができます。中身は Git で管理しているファイル（ソース・テスト・文書・設定）と、ビルド済みの `dist/` です。`node_modules/`・`.git/`（履歴）・`.env`・`docs/references/` は含みません。

リリース前の確認項目は [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md)、提出物の整理は [docs/SUBMISSION_INVENTORY.md](docs/SUBMISSION_INVENTORY.md) を参照してください。

## プライバシー

回答はブラウザのメモリ上だけで扱い、保存（localStorage・Cookie など）も送信もしません。外部のフォント・スクリプト・解析サービスも読み込みません（Phase 7 で、操作中の通信がすべて配信元のサーバーだけであることを確認）。

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
