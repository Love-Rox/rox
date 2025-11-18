# Rox Implementation Timeline

**プロジェクト開始:** 2025-11-19
**MVP目標:** 2025-03-25（17週間後）

## 全体スケジュール

```
Phase 0: Foundation         [████████░░] 60%  Week 1-2   (2025-11-19 〜 2025-12-03)
Phase 1: Misskey API        [░░░░░░░░░░]  0%  Week 3-6   (2025-12-04 〜 2025-12-31)
Phase 2: Frontend           [░░░░░░░░░░]  0%  Week 7-10  (2026-01-01 〜 2026-01-28)
Phase 3: Federation         [░░░░░░░░░░]  0%  Week 11-17 (2026-01-29 〜 2026-03-25)
```

---

## Sprint計画

### Sprint 0: Foundation Setup (Week 1-2)

**期間:** 2025-11-19 〜 2025-12-03
**目標:** 開発基盤の完成

#### Week 1 (2025-11-19 〜 2025-11-25) ✅ 60%完了

- [x] **Day 1-2: プロジェクト構造**
  - [x] Bunワークスペース初期化
  - [x] モノレポ構造作成
  - [x] TypeScript/oxc設定
  - [x] Docker Compose設定

- [x] **Day 3-4: 型定義**
  - [x] 共通型定義（User, Note, File, Session, Reaction）
  - [x] ID生成ユーティリティ

- [x] **Day 5-6: データベース層**
  - [x] Drizzle ORM設定
  - [x] PostgreSQLスキーマ定義
  - [x] データベース接続コード

- [ ] **Day 7: マイグレーション**
  - [ ] 初期マイグレーション生成
  - [ ] マイグレーション実行スクリプト

#### Week 2 (2025-11-26 〜 2025-12-03) ⏳ 予定

- [ ] **Day 8-9: Repository Interface**
  - [ ] IUserRepository
  - [ ] INoteRepository
  - [ ] IDriveFileRepository
  - [ ] ISessionRepository
  - [ ] IReactionRepository
  - [ ] IFollowRepository

- [ ] **Day 10-11: PostgreSQL Repository実装**
  - [ ] PostgresUserRepository
  - [ ] PostgresNoteRepository
  - [ ] その他Repository

- [ ] **Day 12-13: Storage Adapter**
  - [ ] IFileStorage interface
  - [ ] LocalStorageAdapter
  - [ ] S3StorageAdapter

- [ ] **Day 14: DI Container & Testing**
  - [ ] DIコンテナ実装
  - [ ] Honoミドルウェア
  - [ ] テストインフラ構築

**成果物:**
- 動作する開発環境
- DB/Storage切り替え機能
- テスト実行可能

---

### Sprint 1: Authentication (Week 3)

**期間:** 2025-12-04 〜 2025-12-10
**目標:** 認証システム完成

- [ ] **Day 15-16: MiAuth実装**
  - [ ] セッション生成・検証
  - [ ] サインアップ/サインイン

- [ ] **Day 17-18: 認証ミドルウェア**
  - [ ] トークン検証
  - [ ] ユーザーコンテキスト注入

- [ ] **Day 19-20: パスワード管理**
  - [ ] Argon2ハッシュ化
  - [ ] セッション管理

- [ ] **Day 21: テスト**
  - [ ] 認証フローテスト
  - [ ] セキュリティテスト

**成果物:**
- ユーザー登録・ログイン機能

---

### Sprint 2: Core Features (Week 4-5)

**期間:** 2025-12-11 〜 2025-12-24
**目標:** ファイル管理とノート機能

#### Week 4: File Management

- [ ] **Day 22-24: ドライブAPI**
  - [ ] ファイルアップロード
  - [ ] ファイル一覧・削除
  - [ ] サムネイル生成

- [ ] **Day 25-27: ファイル処理**
  - [ ] バリデーション
  - [ ] Blurhash生成
  - [ ] ストレージ統合

- [ ] **Day 28: テスト**

#### Week 5: Note System (Part 1)

- [ ] **Day 29-31: ノート作成**
  - [ ] ノート作成API
  - [ ] ファイル添付
  - [ ] CW/Visibility

- [ ] **Day 32-34: タイムライン**
  - [ ] ローカルタイムライン
  - [ ] ホームタイムライン
  - [ ] ページネーション

- [ ] **Day 35: テスト**

**成果物:**
- ファイルアップロード機能
- ノート投稿機能
- タイムライン表示

---

### Sprint 3: Advanced Features (Week 6)

**期間:** 2025-12-25 〜 2025-12-31
**目標:** ノート操作とリアクション

- [ ] **Day 36-38: ノート操作**
  - [ ] Renote
  - [ ] リプライ
  - [ ] 削除

- [ ] **Day 39-40: リアクション**
  - [ ] リアクション追加・削除
  - [ ] リアクション集計

- [ ] **Day 41: アカウント管理**
  - [ ] フォロー/アンフォロー
  - [ ] プロフィール更新

- [ ] **Day 42: テスト & ドキュメント**

**成果物:**
- 完全なローカルSNS機能

---

### Sprint 4: Frontend Foundation (Week 7-8)

**期間:** 2026-01-01 〜 2026-01-14
**目標:** フロントエンド基盤

#### Week 7: Setup & UI Components

- [ ] **Day 43-45: Waku環境構築**
  - [ ] プロジェクト初期化
  - [ ] Tailwind CSS設定
  - [ ] APIクライアント

- [ ] **Day 46-49: UIコンポーネント**
  - [ ] 基本コンポーネント
  - [ ] フォームコンポーネント
  - [ ] レイアウト

#### Week 8: Authentication Flow

- [ ] **Day 50-52: 認証UI**
  - [ ] ログインページ
  - [ ] サインアップページ
  - [ ] 認証状態管理（Jotai）

- [ ] **Day 53-55: Protected Routes**
  - [ ] ルートガード
  - [ ] トークン永続化

- [ ] **Day 56: テスト**

**成果物:**
- ログイン可能なフロントエンド

---

### Sprint 5: Frontend Features (Week 9-10)

**期間:** 2026-01-15 〜 2026-01-28
**目標:** タイムラインと投稿機能

#### Week 9: Timeline

- [ ] **Day 57-59: タイムライン表示**
  - [ ] Server Components実装
  - [ ] ノートカード
  - [ ] 無限スクロール

- [ ] **Day 60-62: 投稿機能**
  - [ ] ノートコンポーザー
  - [ ] ファイルアップロードUI
  - [ ] プレビュー

- [ ] **Day 63: リアルタイム更新**

#### Week 10: Interactions

- [ ] **Day 64-66: インタラクション**
  - [ ] リプライUI
  - [ ] RenoteUI
  - [ ] リアクションピッカー

- [ ] **Day 67-68: ユーザープロフィール**
  - [ ] プロフィールページ
  - [ ] フォローボタン

- [ ] **Day 69-70: 最適化**
  - [ ] パフォーマンス改善
  - [ ] Lighthouseテスト

**成果物:**
- 完全に動作するWebクライアント

---

### Sprint 6-7: Federation Core (Week 11-13)

**期間:** 2026-01-29 〜 2026-02-18
**目標:** ActivityPub基盤

#### Week 11: Actor & Signatures

- [ ] **Day 71-73: Actor実装**
  - [ ] Actor document
  - [ ] WebFinger
  - [ ] 鍵ペア生成

- [ ] **Day 74-77: HTTP Signatures**
  - [ ] 署名生成
  - [ ] 署名検証
  - [ ] 公開鍵キャッシュ

#### Week 12: Inbox

- [ ] **Day 78-81: Inboxエンドポイント**
  - [ ] Create handler
  - [ ] Follow handler
  - [ ] Update/Delete handler

- [ ] **Day 82-84: リモートオブジェクト**
  - [ ] リモートユーザー保存
  - [ ] リモートノート保存
  - [ ] オブジェクトフェッチ

#### Week 13: Outbox & Delivery

- [ ] **Day 85-87: Outboxエンドポイント**
  - [ ] Collection実装
  - [ ] アクティビティ生成

- [ ] **Day 88-91: 配送システム**
  - [ ] BullMQセットアップ
  - [ ] 配送ワーカー
  - [ ] リトライロジック

**成果物:**
- 基本的な連合機能

---

### Sprint 8-9: Federation Complete (Week 14-16)

**期間:** 2026-02-19 〜 2026-03-11
**目標:** 完全な連合機能

#### Week 14-15: Collections & Advanced

- [ ] **Day 92-96: Collections**
  - [ ] Followersコレクション
  - [ ] Followingコレクション
  - [ ] ページネーション

- [ ] **Day 97-101: 高度な機能**
  - [ ] Announce (Renote)
  - [ ] Like (Reaction)
  - [ ] Undo
  - [ ] Reject

- [ ] **Day 102-105: 配送最適化**
  - [ ] Shared Inbox
  - [ ] レート制限
  - [ ] デッドレターキュー

#### Week 16: Testing & Debug

- [ ] **Day 106-108: Mastodonテスト**
  - [ ] フォロー/フォロワー
  - [ ] 投稿配送・受信
  - [ ] Boost/Like

- [ ] **Day 109-111: Misskeyテスト**
  - [ ] 互換性確認
  - [ ] バグ修正

- [ ] **Day 112: ドキュメント**

**成果物:**
- Mastodon/Misskeyと完全連合

---

### Sprint 10: Polish & Launch (Week 17)

**期間:** 2026-03-12 〜 2026-03-25
**目標:** MVP完成

- [ ] **Day 113-115: バグ修正**
  - [ ] 既知の問題修正
  - [ ] パフォーマンス最適化

- [ ] **Day 116-117: ドキュメント**
  - [ ] デプロイメントガイド
  - [ ] API Documentation
  - [ ] ユーザーガイド

- [ ] **Day 118-119: セキュリティレビュー**
  - [ ] 脆弱性スキャン
  - [ ] ペネトレーションテスト

- [ ] **Day 120: リリース準備**
  - [ ] バージョン v0.1.0
  - [ ] リリースノート
  - [ ] Docker Image公開

**成果物:**
- MVP v0.1.0リリース

---

## マイルストーン

### M1: Development Environment Ready (Week 2完了時)
**日付:** 2025-12-03
**成果物:**
- 動作する開発環境
- DB/Storage切り替え機能
- Repository Pattern実装完了

### M2: Backend API Complete (Week 6完了時)
**日付:** 2025-12-31
**成果物:**
- 全Misskey互換API実装
- ローカルSNSとして完全動作

### M3: Frontend Complete (Week 10完了時)
**日付:** 2026-01-28
**成果物:**
- 完全に動作するWebクライアント
- モバイル対応完了

### M4: Federation Working (Week 16完了時)
**日付:** 2026-03-11
**成果物:**
- Mastodon/Misskeyと連合成功
- ActivityPub完全実装

### M5: MVP Release (Week 17完了時)
**日付:** 2026-03-25
**成果物:**
- Rox v0.1.0公開
- ドキュメント完備
- Docker Image提供

---

## リスク管理

### 高リスク項目

| リスク | 影響 | 対策 | 責任者 |
|--------|------|------|--------|
| ActivityPub互換性問題 | 高 | 早期テスト、既存実装参照 | Backend |
| Waku/RSCの未成熟 | 中 | Next.js移行プラン準備 | Frontend |
| パフォーマンス問題 | 中 | 継続的な最適化、監視 | Backend |

### 遅延時の対応

**2週間以上の遅延が発生した場合:**
1. スコープ削減を検討
2. Phase 3を次バージョンに延期
3. MVP定義を見直し

**優先順位:**
1. Phase 0-1（Backend API）: 必須
2. Phase 2（Frontend）: 必須
3. Phase 3（Federation）: v0.2.0に延期可能

---

## 進捗報告

**頻度:** 週次（毎週月曜日）

**報告内容:**
- 前週の達成項目
- 今週の予定
- ブロッカー
- 遅延リスク

**フォーマット:**
- このファイルを更新
- スプリントごとの完了率を記録

---

## 現在の状況

**現在のSprint:** Sprint 0 (Week 1)
**進捗:** 60%
**ステータス:** ✅ 順調

**完了項目:**
- プロジェクト構造作成
- 型定義完了
- データベーススキーマ定義
- Docker Compose設定

**次のタスク:**
- マイグレーション生成
- Repository Interface定義
- PostgreSQL Repository実装

**ブロッカー:** なし

---

## 変更履歴

| 日付 | 変更内容 | 理由 |
|------|---------|------|
| 2025-11-19 | タイムライン初版作成 | プロジェクト開始 |
