import type { Reaction } from 'shared';

export interface IReactionRepository {
  /**
   * リアクションを作成
   */
  create(reaction: Omit<Reaction, 'createdAt' | 'updatedAt'>): Promise<Reaction>;

  /**
   * IDでリアクションを取得
   */
  findById(id: string): Promise<Reaction | null>;

  /**
   * ユーザーとノートでリアクションを取得
   */
  findByUserAndNote(userId: string, noteId: string): Promise<Reaction | null>;

  /**
   * ノートの全リアクションを取得
   */
  findByNoteId(noteId: string, limit?: number): Promise<Reaction[]>;

  /**
   * ノートのリアクション数を集計
   * @returns { "👍": 5, "❤️": 3, ... }
   */
  countByNoteId(noteId: string): Promise<Record<string, number>>;

  /**
   * 複数ノートのリアクション数を一括取得
   */
  countByNoteIds(noteIds: string[]): Promise<Map<string, Record<string, number>>>;

  /**
   * リアクションを削除
   */
  delete(userId: string, noteId: string): Promise<void>;

  /**
   * ノートの全リアクションを削除（ノート削除時）
   */
  deleteByNoteId(noteId: string): Promise<void>;
}
