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
| Phase 1: Misskey API | ✅ 完了 | 100% | 全コアエンドポイント実装・動作確認完了 |
| Phase 2: Frontend | ✅ 完了 | 100% | Waku Client完全実装（アクセシビリティ対応含む） |
| Phase 3: Federation | ⏳ 次 | 0% | Phase 2完了により開始可能 |

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

### Phase 1 (完了 - 2025-11-19)

**認証・セッション管理:**
- ✅ パスワードハッシュユーティリティ（Argon2id）
- ✅ セッション管理ユーティリティ（CSPRNG）
- ✅ 認証サービス（登録・ログイン・ログアウト・セッション検証）
- ✅ 認証ミドルウェア（optionalAuth/requireAuth）
- ✅ ユーザー登録・ログイン・ログアウトAPIエンドポイント

**ユーザー管理:**
- ✅ プロフィール取得・更新（/api/users/@me, PATCH /api/users/@me）
- ✅ ユーザー情報取得（/api/users/:id）
- ✅ Misskey互換エンドポイント（/api/users/show?userId/username）
- ✅ フォロー・アンフォロー機能
- ✅ フォロワー・フォロイング一覧（ページネーション対応）

**ファイル管理:**
- ✅ ファイルアップロード・削除・更新（/api/drive/files/*）
- ✅ ストレージ使用量計算（/api/drive/usage）
- ✅ メタデータ管理（isSensitive, comment）
- ✅ MD5ハッシュ計算

**ノート機能:**
- ✅ ノート作成・取得・削除
- ✅ タイムライン（ローカル・ホーム・ユーザー）
- ✅ ファイル添付（最大4ファイル/ノート）
- ✅ メンション・ハッシュタグ・絵文字抽出
- ✅ リプライ・Renote対応
- ✅ Visibility制御（public/home/followers/specified）

**リアクション:**
- ✅ リアクション作成・削除
- ✅ リアクション集計・一覧取得
- ✅ Unicode絵文字・カスタム絵文字対応

## クイックリンク

- [プロジェクト仕様書](../project/v1.md)
- [開発者ガイド](../../CLAUDE.md)
- [セットアップ手順](../../README.md)

## 進捗更新

このドキュメントは実装の進行に合わせて更新されます。

**最終更新:** 2025-11-25
**現在のフェーズ:** Phase 2 完了 ✅
**次のマイルストーン:** Phase 3 (ActivityPub Federation) の開始

## Phase 1 完了のお知らせ

**2025-11-19に Phase 1 (Misskey-Compatible API) が完了しました！**

- 全32エンドポイント実装・動作確認完了
- 認証、ユーザー管理、フォロー、ノート投稿、タイムライン、リアクション、ファイル管理すべて動作
- ローカルSNSとして完全に機能するバックエンドが完成

次のステップ:
- **Phase 2 (Frontend)**: Waku + Jotai でフロントエンド実装
- **Phase 3 (Federation)**: ActivityPub連合機能の実装
- または、両フェーズを並行して進行可能

## Phase 2 完了のお知らせ

**2025-11-25に Phase 2 (Frontend - Waku Client) が完了しました！**

### 実装完了機能

**環境構築:**
- ✅ Waku 0.27.1 + Jotai セットアップ
- ✅ Tailwind CSS v4 + OKLCH色空間カスタムカラー
- ✅ Lingui i18n対応（日本語・英語、127メッセージ）
- ✅ React Aria Components 導入
- ✅ Lucide React アイコンライブラリ統合

**認証フロー:**
- ✅ ログイン/サインアップページ
- ✅ Passkey認証対応（WebAuthn）
- ✅ パスワード認証対応
- ✅ セッション管理（localStorage永続化）

**タイムライン機能:**
- ✅ ローカル/ソーシャル/ホームタイムライン表示
- ✅ 無限スクロール（Intersection Observer + カスタムフック）
- ✅ スケルトンローディング、エラー表示
- ✅ タイムラインタブ切り替え

**投稿機能 (NoteComposer):**
- ✅ テキスト投稿、画像添付（複数対応）
- ✅ ドラッグ&ドロップでのファイルアップロード
- ✅ 画像プレビュー表示
- ✅ 返信、リノート機能
- ✅ CW（Content Warning）対応
- ✅ 公開範囲設定（React Aria Select使用、アイコン付き、多言語対応）
- ✅ ファイルアップロード進捗表示

**投稿表示 (NoteCard):**
- ✅ リアクション表示・追加・削除（ReactionPicker使用、アイコンボタン）
- ✅ リノート機能（Lucide Repeat2アイコン）
- ✅ 返信機能（Lucide MessageCircleアイコン）
- ✅ フォロー/アンフォローボタン
- ✅ 画像モーダル（ズーム、パン、ギャラリーナビゲーション）
- ✅ 投稿削除機能
- ✅ Content Warning 展開機能

**ユーザープロフィールページ:**
- ✅ プロフィール情報表示（アバター、バナー、自己紹介）
- ✅ 統計情報（投稿数、フォロワー数、フォロー中数）
- ✅ フォロー/アンフォローボタン
- ✅ ユーザーの投稿一覧
- ✅ 動的ルーティング（`/[username]`）

**UI/UXの改善:**
- ✅ ローディングインジケーター（Spinner, ProgressBar, Skeleton）
- ✅ エラー表示とリトライ機能
- ✅ 画像全画面表示モーダル（Lucide アイコン使用）
- ✅ レスポンシブデザイン
- ✅ アイコンシステム統一（Lucide React、Unicode絵文字から移行）
- ✅ カスタムコンポーネント（EmojiPicker, ImageModal, ReactionPicker）

**アクセシビリティ対応:**
- ✅ キーボードナビゲーション（j/k, 矢印キー, Home/End）
- ✅ フォーカス管理（モーダルのフォーカストラップ）
- ✅ ARIA属性の適切な設定（role, aria-label, aria-expanded等）
- ✅ スクリーンリーダー対応（sr-only クラス活用）

### 技術的成果

- 完全に機能するソーシャルネットワーククライアントの実装
- WCAG 2.1 Level AA準拠のアクセシビリティ実装
- カスタムフック（`useKeyboardNavigation`, `useFocusTrap`）による再利用可能なロジック
- React Server Components (RSC) を活用した高速な初期ロード
- Jotaiによる効率的な状態管理とグローバルステート（認証、トースト）

次のステップ:
- **Phase 3 (Federation)**: ActivityPub連合機能の実装開始可能
