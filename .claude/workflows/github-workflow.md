# GitHub Issue-Based Development Workflow

このプロジェクトでは、Issue駆動開発を採用しています。
以下のワークフローに従って作業を進めてください。

## Branch Strategy

```
feature/issue-{N}-* ──PR──> dev ──PR──> main (release only)
                                          │
                                          └──> dev (auto-synced by GitHub Actions)
```

## ワークフロー

### Phase 1: Issue確認・作成
1. 作業内容に関連するissueが既に存在するか `gh issue list` で確認
2. 該当issueがない場合:
   - `gh issue create` でissueを作成
   - タイトルと説明を簡潔に記載
   - 適切なラベルを付与
3. 該当issueがある場合: そのissue番号を記録

### Phase 2: ブランチ作成
- 最新のdevブランチからフィーチャーブランチを作成
- `git checkout -b {type}/issue-{番号}-{簡潔な説明} dev`
- ブランチ名例: `feat/issue-42-add-login-form`, `fix/issue-58-emoji-size`

### Phase 3: 実装
- issueの要件に基づいてコードを実装
- 小さな単位で進捗を確認しながら作業

### Phase 4: コミット
- 意味のある単位でコミット
- コミットメッセージ形式: `{type}: 説明 (refs #{issue番号})`
- 例: `feat: ログインフォームを追加 (refs #42)`

### Phase 5: ユーザー確認待機
- 実装完了を報告し、動作確認を依頼
- 修正が必要な場合はPhase 3に戻る

### Phase 6: 品質チェック
動作確認完了後、以下を実行:
- `bun run typecheck`
- `bun run lint`
- `bun test` (該当するテストがある場合)
- エラーがあれば修正し、再度チェック

### Phase 7: プッシュとPR作成
```bash
git push origin {type}/issue-{番号}-{説明}
gh pr create --base dev --title "{type}: {説明}" --body "Closes #{issue番号}"
```
- PRは**必ず `dev` ブランチ**をターゲットにする
- PRボディに `Closes #{issue番号}` を含めてissueを自動クローズする

### Phase 8: CI確認とマージ
- `gh pr checks` でCI状態を確認
- 失敗している場合は原因を特定し、Phase 6に戻る
- すべてのチェックが通過したら:
  ```bash
  gh pr merge --merge --delete-branch
  git checkout dev && git pull && git branch -d {branch}
  ```

## リリースフロー (dev → main)

安定版リリース時のみ `dev` → `main` のPRを作成する。

### 手順
1. `dev` ブランチ上でバージョンをバンプ (フィーチャーブランチ経由)
2. `dev` → `main` のPRを作成
   - タイトル: `Release vX.X.X`
   - ボディ: 前回の安定版リリースからの変更サマリー
3. CI通過後にマージ
4. 以下は自動で実行される:
   - `auto-tag.yml`: Gitタグ + GitHubリリース作成 (安定版は前回安定版からの差分でリリースノート生成)
   - `sync-dev.yml`: `dev` を `main` にfast-forward同期

## コミットメッセージ規約
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他の変更
- `perf`: パフォーマンス改善

## 注意事項
- `dev` / `main` ブランチへの直接コミットは禁止
- PRは必ずCIを通過してからマージ
- issueとPRは必ずリンクさせる
- マージ後はフィーチャーブランチを必ず削除 (リモート + ローカル)

## 自動化
| イベント | ワークフロー |
|---------|------------|
| mainへのpush時にタグ + リリース作成 | `auto-tag.yml` |
| mainマージ後にdevを同期 | `sync-dev.yml` |
| PR/push時のCI実行 | `ci.yml` |
