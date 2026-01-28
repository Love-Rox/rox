# GitHub Issue-Based Development Workflow

このプロジェクトでは、Issue駆動開発を採用しています。
以下のワークフローに従って作業を進めてください。

## ワークフロー

### Phase 1: Issue確認・作成
1. 作業内容に関連するissueが既に存在するか gh issue list で確認
2. 該当issueがない場合:
   - gh issue create でissueを作成
   - タイトルと説明を簡潔に記載
   - 適切なラベルを付与
3. 該当issueがある場合: そのissue番号を記録

### Phase 2: ブランチ作成
- 最新のdevブランチからフィーチャーブランチを作成
- git checkout -b feature/issue-{番号}-{簡潔な説明} でfeatureブランチを作成
- ブランチ名例: feature/issue-42-add-login-form

### Phase 3: 実装
- issueの要件に基づいてコードを実装
- 小さな単位で進捗を確認しながら作業

### Phase 4: コミット
- 意味のある単位でコミット
- コミットメッセージ形式: feat: 機能の説明 (refs #issue番号)
- 例: feat: ログインフォームを追加 (refs #42)

### Phase 5: ユーザー確認待機
- 実装完了を報告し、動作確認を依頼
- 修正が必要な場合はPhase 3に戻る

### Phase 6: 品質チェック
動作確認完了後、以下を実行:
- npm run type-check または tsc --noEmit
- npm test または該当するテストコマンド
- npm run lint (設定されている場合)
- エラーがあれば修正し、再度チェック

### Phase 7: プッシュとPR作成
以下のコマンドを実行:
  git push origin feature/issue-{番号}-{説明}
  gh pr create --base dev --title "feat: {説明}" --body "Closes #issue番号"

### Phase 8: CI確認
- gh pr checks でCI状態を確認
- 失敗している場合は原因を特定し、Phase 6に戻る
- すべてのチェックが通過したら報告

## コミットメッセージ規約
- feat: 新機能
- fix: バグ修正
- docs: ドキュメント
- refactor: リファクタリング
- test: テスト追加・修正
- chore: その他の変更

## 注意事項
- devブランチへの直接コミットは禁止
- PRは必ずレビューを経てマージ
- issueとPRは必ずリンクさせる
