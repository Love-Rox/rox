import type { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * グローバルエラーハンドラー
 */
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    // HTTPExceptionはそのままスロー
    if (error instanceof HTTPException) {
      throw error;
    }

    // その他のエラーはログに記録して500エラーを返す
    console.error('Unhandled error:', error);

    return c.json(
      {
        error: {
          message:
            process.env.NODE_ENV === 'production'
              ? 'Internal server error'
              : (error as Error).message,
          stack:
            process.env.NODE_ENV === 'development'
              ? (error as Error).stack
              : undefined,
        },
      },
      500
    );
  }
}
