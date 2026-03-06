import "dotenv/config";
import { WebClient } from "@slack/web-api";

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const channelId = process.env.SLACK_CHANNEL_ID as string;

interface SlackBlock {
  type: string;
  elements?: Array<{ type: string; text?: string }>;
}

interface SlackMessage {
  blocks?: SlackBlock[];
}

// 全メッセージを取得（ページング対応）
const allMessages: SlackMessage[] = [];
let cursor: string | undefined;

do {
  const result = await client.conversations.history({
    channel: channelId,
    limit: 200,
    cursor,
  });
  allMessages.push(...((result.messages as SlackMessage[]) ?? []));
  cursor = result.response_metadata?.next_cursor || undefined;
} while (cursor);

console.log(`総メッセージ数: ${allMessages.length}`);

// contextブロックから会話IDを抽出
const idPattern = /会話ID: (\d+)/;
const conversationIds: string[] = [];

for (const msg of allMessages) {
  for (const block of msg.blocks ?? []) {
    if (block.type === "context" && block.elements) {
      for (const el of block.elements) {
        const match = el.text?.match(idPattern);
        if (match) {
          conversationIds.push(match[1]);
        }
      }
    }
  }
}

console.log(`\n会話ID検出数: ${conversationIds.length}`);

// 重複チェック
const countMap = new Map<string, number>();
for (const id of conversationIds) {
  countMap.set(id, (countMap.get(id) ?? 0) + 1);
}

const duplicates = [...countMap.entries()].filter(([, count]) => count > 1);

if (duplicates.length === 0) {
  console.log("重複なし");
} else {
  console.log(`\n重複あり (${duplicates.length}件):`);
  for (const [id, count] of duplicates.sort((a, b) => b[1] - a[1])) {
    console.log(`  会話ID: ${id} → ${count}回投稿`);
  }
}
