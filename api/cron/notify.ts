import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { runNotifyJob } from "../../src/cronJob.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Vercel Cronからの呼び出しのみ許可（GETメソッド）
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // オプション: CRON_SECRETによる認証
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
  }

  try {
    const result = await runNotifyJob();
    res.status(200).json(result);
  } catch (error) {
    console.error("[Cron] ハンドラーエラー:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
