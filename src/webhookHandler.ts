import type { IntercomWebhookPayload } from "./types.js";
import { fetchConversationById } from "./intercomClient.js";
import { summarizeConversation } from "./summarizer.js";
import { formatNotificationBlocks } from "./formatBlocks.js";
import { postNotification } from "./slackClient.js";

/**
 * Webhook処理のメイン関数。
 * 1. ペイロードから会話IDを取得
 * 2. Intercom APIから完全な会話データを取得
 * 3. FIN会話かチェック（FIN以外は無視）
 * 4. Claude AIで要約を生成
 * 5. Slackに通知を投稿
 */
export async function handleWebhookEvent(
  payload: IntercomWebhookPayload,
): Promise<{ processed: boolean; reason?: string }> {
  const topic = payload.topic;
  const conversationId = payload.data?.item?.id;

  console.log(`[Webhook] topic=${topic}, conversationId=${conversationId}`);

  if (!conversationId) {
    return { processed: false, reason: "No conversation ID in payload" };
  }

  if (topic !== "conversation.admin.closed") {
    return { processed: false, reason: `Unsupported topic: ${topic}` };
  }

  const conversation = await fetchConversationById(conversationId);

  if (!conversation) {
    console.log(
      `[Webhook] 会話 ${conversationId} はFIN会話ではないためスキップ`,
    );
    return { processed: false, reason: "Not a FIN conversation" };
  }

  console.log(`[Webhook] 会話 ${conversationId} の要約を生成中...`);
  const summary = await summarizeConversation(conversation);

  const targetChannelId = process.env.SLACK_CHANNEL_ID!;
  const blocks = formatNotificationBlocks(conversation, summary);
  const fallbackText = `FIN会話通知: ${conversation.contactName} - ${summary.inquiry}`;

  await postNotification(targetChannelId, blocks, fallbackText);
  console.log(`[Webhook] 会話 ${conversationId} の通知を投稿完了`);

  return { processed: true };
}
