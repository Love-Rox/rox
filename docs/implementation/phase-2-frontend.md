# Phase 2: Frontend (Waku Client)

**期間:** 3-4週間
**ステータス:** ⏳ 未着手
**前提条件:** Phase 1 (Misskey API)完了
**並行可能:** Phase 3と並行可能

## 目的

Waku + React Server Components + Jotai を活用した、高速で使いやすいWebクライアントを構築する。

## 実装順序

1. **Waku + Jotai環境構築** (Week 1)
2. **UIコンポーネントライブラリ** (Week 1-2)
3. **認証フロー** (Week 2)
4. **タイムライン実装** (Week 2-3)
5. **投稿機能** (Week 3)
6. **ユーザーインタラクション** (Week 3-4)
7. **パフォーマンス最適化** (Week 4)

---

## 1. Waku + Jotai環境構築（Week 1）

**優先度:** 🔴 最高（全フロントエンド開発の前提）

### 1.1 プロジェクト初期化

```bash
cd packages/frontend
bun add waku react react-dom
bun add -D @types/react @types/react-dom
```

### 1.2 ディレクトリ構造

```
packages/frontend/src/
├── app/                    # Waku App Routes
│   ├── layout.tsx         # Root Layout
│   ├── page.tsx           # Home (Timeline)
│   ├── login/
│   │   └── page.tsx       # Login Page
│   ├── signup/
│   │   └── page.tsx       # Signup Page
│   ├── notes/
│   │   └── [id]/
│   │       └── page.tsx   # Note Detail
│   └── users/
│       └── [username]/
│           └── page.tsx   # User Profile
├── components/
│   ├── ui/                # Base UI Components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   ├── note/              # Note Components
│   │   ├── NoteCard.tsx
│   │   ├── NoteComposer.tsx
│   │   └── ...
│   ├── timeline/          # Timeline Components
│   │   ├── Timeline.tsx
│   │   └── ...
│   └── user/              # User Components
│       ├── UserCard.tsx
│       └── ...
├── lib/
│   ├── api/               # API Client
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── notes.ts
│   │   └── ...
│   ├── atoms/             # Jotai Atoms
│   │   ├── auth.ts
│   │   ├── timeline.ts
│   │   └── ...
│   └── utils/             # Utility Functions
│       ├── format.ts
│       └── ...
└── styles/
    └── globals.css        # Global Styles
```

### 1.3 Tailwind CSS設定

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
        // ... カスタムカラー
      },
    },
  },
  plugins: [],
};
```

### 1.4 APIクライアント

```typescript
// src/lib/api/client.ts
export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, data?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ... その他のメソッド
}

export const apiClient = new ApiClient(
  process.env.API_URL || 'http://localhost:3000'
);
```

**完了条件:**
- [ ] Waku開発サーバー起動
- [ ] Tailwind CSS動作確認
- [ ] APIクライアント実装
- [ ] 基本的なルーティング設定

---

## 2. UIコンポーネントライブラリ（Week 1-2）

**優先度:** 🟡 高（全UI実装の前提）

### 2.1 基本コンポーネント

```typescript
// src/components/ui/Button.tsx
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  ...props
}: ButtonProps) {
  // Tailwind CSS classes with variants
  return <button className={/* ... */} {...props}>{children}</button>;
}
```

**実装予定コンポーネント:**
- Button
- Input / Textarea
- Modal / Dialog
- Avatar
- Card
- Loading Spinner
- Toast / Alert
- Dropdown
- Tabs

### 2.2 フォームコンポーネント

```typescript
// src/components/ui/Form.tsx
import { useForm } from 'react-hook-form';

interface FormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
}

export function Form({ onSubmit, children }: FormProps) {
  const { handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {children}
    </form>
  );
}
```

### 2.3 レイアウトコンポーネント

```typescript
// src/app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="container mx-auto">
            <div className="flex gap-4">
              <Sidebar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**完了条件:**
- [ ] 全基本コンポーネント実装
- [ ] レスポンシブ対応
- [ ] アクセシビリティ対応（ARIA）
- [ ] ダークモード対応（オプション）

---

## 3. 認証フロー（Week 2）

**優先度:** 🔴 最高（全認証機能の前提）

### 3.1 認証状態管理（Jotai）

```typescript
// src/lib/atoms/auth.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const tokenAtom = atomWithStorage<string | null>('token', null);

export const currentUserAtom = atom<User | null>(null);

export const isAuthenticatedAtom = atom((get) => {
  return get(tokenAtom) !== null && get(currentUserAtom) !== null;
});
```

### 3.2 ログインページ

```typescript
// src/app/login/page.tsx
'use client';

import { useAtom } from 'jotai';
import { useState } from 'react';
import { useRouter } from 'waku/router';
import { tokenAtom, currentUserAtom } from '@/lib/atoms/auth';
import { apiClient } from '@/lib/api/client';

export default function LoginPage() {
  const router = useRouter();
  const [, setToken] = useAtom(tokenAtom);
  const [, setCurrentUser] = useAtom(currentUserAtom);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await apiClient.post('/api/signin', {
        username,
        password,
      });

      setToken(response.token);
      setCurrentUser(response.user);
      apiClient.setToken(response.token);

      router.push('/');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">ログイン</h1>
        <Input
          type="text"
          placeholder="ユーザー名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="パスワード"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit">ログイン</Button>
      </form>
    </div>
  );
}
```

### 3.3 Protected Routes

```typescript
// src/components/auth/ProtectedRoute.tsx
'use client';

import { useAtom } from 'jotai';
import { useRouter } from 'waku/router';
import { useEffect } from 'react';
import { isAuthenticatedAtom } from '@/lib/atoms/auth';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated] = useAtom(isAuthenticatedAtom);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

**完了条件:**
- [ ] ログインページ実装
- [ ] サインアップページ実装
- [ ] 認証状態管理（Jotai）
- [ ] トークン永続化（localStorage）
- [ ] Protected Route実装
- [ ] 自動ログイン（トークン検証）

---

## 4. タイムライン実装（Week 2-3）

**優先度:** 🔴 最高（コア機能）

### 4.1 タイムライン（Server Component）

```typescript
// src/app/page.tsx (Server Component)
import { Timeline } from '@/components/timeline/Timeline';

export default async function HomePage() {
  // Server Componentで初期データ取得
  const initialNotes = await fetchLocalTimeline();

  return (
    <div>
      <h1>タイムライン</h1>
      <Timeline initialData={initialNotes} />
    </div>
  );
}

async function fetchLocalTimeline() {
  const response = await fetch('http://localhost:3000/api/notes/local-timeline', {
    cache: 'no-store',
  });
  return response.json();
}
```

### 4.2 タイムラインコンポーネント（Client Component）

```typescript
// src/components/timeline/Timeline.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAtom } from 'jotai';
import { NoteCard } from '@/components/note/NoteCard';
import { timelineAtom } from '@/lib/atoms/timeline';

interface TimelineProps {
  initialData: Note[];
}

export function Timeline({ initialData }: TimelineProps) {
  const [notes, setNotes] = useAtom(timelineAtom);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNotes(initialData);
  }, [initialData, setNotes]);

  const loadMore = async () => {
    if (loading || notes.length === 0) return;

    setLoading(true);
    const lastNote = notes[notes.length - 1];

    try {
      const moreNotes = await apiClient.get(
        `/api/notes/local-timeline?untilId=${lastNote.id}`
      );
      setNotes([...notes, ...moreNotes]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
      <button onClick={loadMore} disabled={loading}>
        {loading ? '読み込み中...' : 'もっと見る'}
      </button>
    </div>
  );
}
```

### 4.3 ノートカード

```typescript
// src/components/note/NoteCard.tsx
'use client';

export function NoteCard({ note }: { note: Note }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      {/* ユーザー情報 */}
      <div className="flex items-center gap-2">
        <Avatar src={note.user.avatarUrl} />
        <div>
          <div className="font-bold">{note.user.displayName}</div>
          <div className="text-sm text-gray-500">@{note.user.username}</div>
        </div>
      </div>

      {/* CW */}
      {note.cw && (
        <div className="mt-2 text-sm text-gray-600">
          CW: {note.cw}
        </div>
      )}

      {/* 本文 */}
      {note.text && (
        <div className="mt-2 whitespace-pre-wrap">{note.text}</div>
      )}

      {/* 画像 */}
      {note.files && note.files.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {note.files.map((file) => (
            <img
              key={file.id}
              src={file.thumbnailUrl || file.url}
              alt=""
              className="rounded"
            />
          ))}
        </div>
      )}

      {/* アクション */}
      <div className="mt-4 flex gap-4">
        <button>💬 リプライ</button>
        <button>🔁 Renote</button>
        <button>❤️ リアクション</button>
      </div>
    </div>
  );
}
```

### 4.4 無限スクロール

```typescript
// src/hooks/useInfiniteScroll.ts
import { useEffect, useRef } from 'react';

export function useInfiniteScroll(callback: () => void) {
  const observer = useRef<IntersectionObserver>();
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    observer.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          callback();
        }
      },
      { threshold: 1.0 }
    );

    if (targetRef.current) {
      observer.current.observe(targetRef.current);
    }

    return () => {
      observer.current?.disconnect();
    };
  }, [callback]);

  return targetRef;
}
```

**完了条件:**
- [ ] タイムライン表示（RSC活用）
- [ ] 無限スクロールページネーション
- [ ] Pull-to-refresh（モバイル）
- [ ] ノートカード実装
- [ ] 画像ギャラリー
- [ ] リアルタイム更新（ポーリング or WebSocket）

---

## 5. 投稿機能（Week 3）

**優先度:** 🔴 最高

### 5.1 ノート投稿コンポーザー

```typescript
// src/components/note/NoteComposer.tsx
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

export function NoteComposer() {
  const [text, setText] = useState('');
  const [cw, setCw] = useState('');
  const [showCw, setShowCw] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('public');

  const handlePost = async () => {
    // ファイルアップロード
    const fileIds = await Promise.all(
      files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const uploaded = await apiClient.post('/api/drive/files/create', formData);
        return uploaded.id;
      })
    );

    // ノート作成
    await apiClient.post('/api/notes/create', {
      text,
      cw: showCw ? cw : undefined,
      visibility,
      fileIds,
    });

    // リセット
    setText('');
    setCw('');
    setFiles([]);
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      {showCw && (
        <Input
          placeholder="注意書き（CW）"
          value={cw}
          onChange={(e) => setCw(e.target.value)}
        />
      )}
      <Textarea
        placeholder="いまどうしてる？"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setShowCw(!showCw)}>CW</button>
          <FileUploadButton onSelect={setFiles} />
          <EmojiPicker />
        </div>
        <div className="flex items-center gap-2">
          <VisibilitySelector value={visibility} onChange={setVisibility} />
          <Button onClick={handlePost}>投稿</Button>
        </div>
      </div>
    </div>
  );
}
```

**完了条件:**
- [ ] テキスト入力
- [ ] ファイル添付（ドラッグ&ドロップ）
- [ ] 絵文字ピッカー
- [ ] CW設定
- [ ] 公開範囲選択
- [ ] 文字数カウンター
- [ ] 下書き保存（localStorage）
- [ ] Optimistic Update

---

## 6. ユーザーインタラクション（Week 3-4）

**完了条件:**
- [ ] リプライ機能
- [ ] Renote機能
- [ ] リアクションピッカー
- [ ] フォロー/アンフォローボタン
- [ ] ユーザープロフィールページ
- [ ] ノート詳細ページ

---

## 7. パフォーマンス最適化（Week 4）

**実施項目:**
- [ ] 画像遅延読み込み
- [ ] コンポーネント分割・Code Splitting
- [ ] Bundle Size最適化
- [ ] Lighthouse Performance > 90
- [ ] Core Web Vitals改善

---

## 完了条件（Phase 2全体）

- [ ] 全ユーザーフロー動作
- [ ] レスポンシブ対応
- [ ] Lighthouse Performance > 90
- [ ] Accessibility > 90
- [ ] クロスブラウザ動作確認

## 次フェーズ

Phase 2完了後、必要に応じてUI/UX改善を継続しつつ、Phase 3（連合）またはその他の機能拡張に進む。
