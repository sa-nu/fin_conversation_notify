import { WebClient } from "@slack/web-api";
import type { KnownBlock } from "@slack/types";

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * 指定チャンネルにBlock Kit形式のメッセージを投稿する。
 */
export async function postNotification(
  targetChannelId: string,
  blocks: KnownBlock[],
  fallbackText: string,
): Promise<void> {
  await client.chat.postMessage({
    channel: targetChannelId,
    blocks,
    text: fallbackText,
  });
}
