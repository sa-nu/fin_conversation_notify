import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { verifyWebhookSignature } from "../../src/verifySignature.js";
import { handleWebhookEvent } from "../../src/webhookHandler.js";
import type { IntercomWebhookPayload } from "../../src/types.js";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const webhookSecret = process.env.INTERCOM_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = req.headers["x-hub-signature"] as string | undefined;
    const rawBody =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("[Webhook] 署名検証失敗");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const payload = req.body as IntercomWebhookPayload;

  // Intercomのping（Webhook設定時のテスト）に対応
  if (!payload.topic) {
    console.log("[Webhook] Ping received");
    res.status(200).json({ ok: true, message: "Pong" });
    return;
  }

  try {
    const result = await handleWebhookEvent(payload);

    res.status(200).json({
      ok: true,
      processed: result.processed,
      reason: result.reason,
    });
  } catch (error) {
    console.error("[Webhook] 処理エラー:", error);
    // エラー時も200を返してIntercomの再送を防止
    res.status(200).json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
