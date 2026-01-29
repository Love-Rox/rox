# Claude Code Instructions

## 基本方針

- `.claude/workflows/github-workflow.md` に記載されたワークフローに従う
- 作業開始時は必ずワークフローを確認
- 各フェーズ完了時にユーザーに報告

## ルールファイル

`.claude/rules/` に詳細なガイドラインを分割:

| ファイル | 内容 |
|---------|------|
| `tsdoc.md` | TSDocドキュメント規約（英語で記述） |
| `react-aria.md` | React Aria Componentsの使い方 |
| `architecture.md` | コアアーキテクチャパターン |
| `release.md` | リリース手順とバージョニング |
| `devcontainer.md` | DevContainer開発環境 |
| `mcp-servers.md` | MCPサーバーの使い方 |
| `discord-logger.md` | Discord会話ログ記録 |

## GitHub CLI利用

このプロジェクトでは gh コマンドを積極的に活用:

```bash
# Issue管理
gh issue list --state open
gh issue create --title "タイトル" --body "説明"
gh issue view <番号>

# PR管理
gh pr create --base main --title "feat: 説明" --body "Closes #番号"
gh pr checks
gh pr view
```

## プロジェクト固有設定

- デフォルトブランチ: main
- PRターゲット: main
- featureブランチプレフィックス: `feature/issue-{番号}-`

## ブランチ命名規則

```
feature/issue-42-add-login-form
fix/issue-123-broken-pagination
refactor/frontend-useapi-migration
```

## コミットメッセージ規約

```
feat: 新機能
fix: バグ修正
docs: ドキュメント
refactor: リファクタリング
test: テスト追加・修正
chore: その他の変更
```

形式: `{type}({scope}): {description}`

例:
- `feat(frontend): add user profile page`
- `fix(backend): resolve authentication timeout`
- `refactor(frontend): migrate to useApi hook`
