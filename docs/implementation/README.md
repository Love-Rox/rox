# Rox Implementation Plan

このディレクトリには、Roxプロジェクトの実装計画と進捗管理に関するドキュメントが含まれています。

## ドキュメント構成

- [overview.md](./overview.md) - プロジェクト全体の概要と実装アプローチ
- [phase-0-foundation.md](./phase-0-foundation.md) - フェーズ0: 基盤構築
- [phase-1-api.md](./phase-1-api.md) - フェーズ1: Misskey互換API実装
- [phase-2-frontend.md](./phase-2-frontend.md) - フェーズ2: フロントエンド実装
- [phase-3-federation.md](./phase-3-federation.md) - フェーズ3: ActivityPub連合
- [decisions.md](./decisions.md) - 重要な技術的決定事項
- [timeline.md](./timeline.md) - 実装タイムラインとマイルストーン

## 実装状況

| フェーズ | ステータス | 完了率 | 備考 |
|---------|----------|--------|------|
| Phase 0: Foundation | ✅ 完了 | 100% | 全ての基盤コンポーネント実装・テスト完了 |
| Phase 1: Misskey API | 🔄 進行中 | 85% | 認証・ファイル・ノート・リアクション機能完了 |
| Phase 2: Frontend | ⏳ 未着手 | 0% | Phase 1完了後に開始 |
| Phase 3: Federation | ⏳ 未着手 | 0% | Phase 1完了後に開始可能 |

## 直近の実装内容

### Phase 0 (完了)
- ✅ Bunワークスペース・モノレポ構造
- ✅ TypeScript strict mode設定
- ✅ oxc設定（リント・フォーマット）
- ✅ Docker Compose（PostgreSQL/Redis）
- ✅ Drizzle ORMスキーマ定義（6テーブル）
- ✅ Repository Pattern実装（6リポジトリ）
- ✅ Storage Adapter Pattern実装（Local/S3）
- ✅ DIコンテナとミドルウェア
- ✅ データベースマイグレーション

### Phase 1 (進行中)
- ✅ パスワードハッシュユーティリティ（Argon2id）
- ✅ セッション管理ユーティリティ
- ✅ 認証サービス（登録・ログイン・ログアウト）
- ✅ 認証ミドルウェア（optionalAuth/requireAuth）
- ✅ ユーザーAPIルート（登録・取得・更新）
- ✅ 認証APIルート（ログイン・ログアウト・セッション検証）
- ✅ ファイル管理サービス（アップロード・削除・更新）
- ✅ ドライブAPIルート（/api/drive/files/*）
- ✅ ストレージ使用量計算機能
- ✅ ノート投稿機能（作成・取得・削除）
- ✅ タイムライン機能（ローカル・ホーム・ユーザー）
- ✅ ファイル添付機能（最大4ファイル/ノート）
- ✅ メンション・ハッシュタグ・絵文字の抽出（簡易実装）
- ✅ リプライ・Renote機能
- ✅ リアクション機能（作成・削除・集計）

## クイックリンク

- [プロジェクト仕様書](../project/v1.md)
- [開発者ガイド](../../CLAUDE.md)
- [セットアップ手順](../../README.md)

## 進捗更新

このドキュメントは実装の進行に合わせて更新されます。

**最終更新:** 2025-11-19
**現在のフェーズ:** Phase 1 (Misskey API - コア機能ほぼ完成)
**次のマイルストーン:** フォロー機能の実装 または Phase 2/3への移行
