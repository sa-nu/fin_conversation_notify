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

/**
 * 指定チャンネルの直近メッセージから会話IDが既に通知済みかを確認する。
 * contextブロック内の「会話ID: xxx」テキストを検索する。
 */
export async function isAlreadyNotified(
  channelId: string,
  conversationId: string,
): Promise<boolean> {
  const result = await client.conversations.history({
    channel: channelId,
    limit: 100,
  });

  const needle = `会話ID: ${conversationId}`;
  return (result.messages ?? []).some((msg) =>
    msg.blocks?.some(
      (block) =>
        block.type === "context" &&
        "elements" in block &&
        (block.elements as Array<{ type: string; text?: string }>)?.some(
          (el) => el.text?.includes(needle),
        ),
    ),
  );
}
