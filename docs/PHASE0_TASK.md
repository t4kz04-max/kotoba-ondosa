\# PHASE0\_TASK.md



\# Phase 0：プロジェクト初期化



\## Objective



「言葉の温度差」の開発基盤を構築する。



このPhaseではアプリ本体の機能を実装しない。



React + TypeScript + Viteを使用した、シンプルで保守しやすい開発環境を完成させる。



\## Required Tasks



\### 1. 現状確認



\- 現在の作業ディレクトリを確認する。

\- 既存ファイルを確認する。

\- CLAUDE.mdを読む。

\- docs/PROJECT\_OVERVIEW.mdを読む。

\- docs/ROADMAP.mdを読む。

\- このファイルを読む。

\- Node.js、npm、Gitの利用可否を確認する。



\### 2. React + TypeScript + Vite



現在のプロジェクトフォルダに、React + TypeScript + Viteの開発環境を構築する。



既存のMarkdownファイルを上書きしないこと。



必要に応じてViteの公式テンプレートを使用する。



\### 3. TypeScript



strictモードを有効にする。



型チェックが成功する状態にする。



\### 4. Vitest



Vitestを導入する。



テスト実行用のnpmスクリプトを設定する。



最小限のサンプルテストを1つ作成する。



\### 5. ディレクトリ



以下の構成を基本として用意する。



src/

\- app/

\- components/

\- features/

\- domain/

\- data/

\- hooks/

\- styles/



tests/



docs/



必要に応じて構成を微調整してよい。



\### 6. npm scripts



少なくとも以下を用意する。



\- npm run dev

\- npm run build

\- npm run test

\- npm run typecheck



\### 7. Git



Gitリポジトリが未初期化なら初期化する。



適切な.gitignoreを設定する。



node\_modules、dist、秘密情報などをコミットしない。



\### 8. README



README.mdを作成する。



以下を含める。



\- プロジェクト概要

\- 使用技術

\- セットアップ方法

\- 開発サーバー起動方法

\- ビルド方法

\- テスト方法

\- ディレクトリ構成



\### 9. 検証



以下を実行して結果を確認する。



\- npm run typecheck

\- npm run test

\- npm run build



開発サーバーが起動できることも確認する。



\### 10. Git commit



Phase 0の作業が成功した場合、初期コミットを作成する。



推奨コミットメッセージ：



chore: initialize kotoba-ondosa project



Gitのユーザー名やメールアドレスが未設定でコミットできない場合、勝手に架空の値を設定しない。



その場合は状況を報告する。



\## Restrictions



\- Phase 1以降の機能を実装しない。

\- 最終UIを作り込まない。

\- 不必要な依存パッケージを導入しない。

\- 外部APIを導入しない。

\- データベースを導入しない。

\- 認証機能を導入しない。

\- 既存のMarkdownファイルを削除・上書きしない。

\- GitHubへのpushを実行しない。



\## Completion Criteria



1\. React + TypeScript + Viteが正常に動作する。

2\. TypeScriptの型チェックが成功する。

3\. Vitestのテストが成功する。

4\. 本番ビルドが成功する。

5\. READMEが存在する。

6\. CLAUDE.mdとdocs内のファイルが保持されている。

7\. Gitで管理されている。

8\. 初期コミットが作成されているか、作成できない理由が明確になっている。



\## Final Report



完了後、以下を日本語で報告する。



1\. 実施内容

2\. 作成・変更したファイル

3\. 導入した技術とバージョン

4\. 実行したコマンド

5\. 型チェック結果

6\. テスト結果

7\. ビルド結果

8\. Gitコミット結果

9\. 未解決の問題

10\. Phase 1に進める状態かどうか



Phase 1は開始しないこと。

