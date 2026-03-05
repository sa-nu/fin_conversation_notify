import { fetchRecentClosedFinConversations } from "./intercomClient.js";
import { summarizeConversation } from "./summarizer.js";
import { formatNotificationBlocks } from "./formatBlocks.js";
import { postNotification } from "./slackClient.js";

/** ポーリング間隔（秒）: 5分 + 余裕30秒 */
const POLLING_WINDOW_SECONDS = 330;

/**
 * 直近のクローズ済みFIN会話をチェックしてSlackに通知する。
 * Vercel cronから5分ごとに呼び出される。
 */
export async function runNotifyJob(): Promise<{
  success: boolean;
  notifiedCount: number;
  error?: string;
}> {
  const targetChannelId = process.env.SLACK_CHANNEL_ID!;

  console.log("[Cron] FIN会話通知ジョブを開始...");

  try {
    const conversations =
      await fetchRecentClosedFinConversations(POLLING_WINDOW_SECONDS);
    console.log(`[Cron] 対象会話数: ${conversations.length}`);

    if (conversations.length === 0) {
      return { success: true, notifiedCount: 0 };
    }

    let notifiedCount = 0;

    for (const conversation of conversations) {
      try {
        const summary = await summarizeConversation(conversation);
        const blocks = formatNotificationBlocks(conversation, summary);
        const fallbackText = `FIN会話通知: ${summary.inquiry}`;

        await postNotification(targetChannelId, blocks, fallbackText);
        notifiedCount++;
        console.log(`[Cron] 会話 ${conversation.id} の通知を投稿完了`);
      } catch (error) {
        console.error(
          `[Cron] 会話 ${conversation.id} の通知に失敗:`,
          error,
        );
      }
    }

    return { success: true, notifiedCount };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error(`[Cron] エラー: ${errorMessage}`);
    return { success: false, notifiedCount: 0, error: errorMessage };
  }
}
