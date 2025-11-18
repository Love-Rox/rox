export interface FileMetadata {
  name: string;
  type: string;
  size: number;
  userId: string;
}

export interface IFileStorage {
  /**
   * ファイルを保存
   * @param file ファイルのBuffer
   * @param metadata ファイルメタデータ
   * @returns 保存されたファイルのパス（相対パスまたはキー）
   */
  save(file: Buffer, metadata: FileMetadata): Promise<string>;

  /**
   * ファイルを削除
   * @param filePath ファイルパス
   */
  delete(filePath: string): Promise<void>;

  /**
   * ファイルの公開URLを取得
   * @param filePath ファイルパス
   * @returns 公開アクセス可能なURL
   */
  getUrl(filePath: string): string;
}
