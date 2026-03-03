import type { KnownBlock } from "@slack/types";
import type { FinConversation, ConversationSummary } from "./types.js";

/**
 * 解決状態を表示用ラベルと絵文字に変換する。
 */
function getResolutionDisplay(state: string | null): {
  emoji: string;
  label: string;
} {
  switch (state) {
    case "confirmed_resolution":
      return { emoji: ":white_check_mark:", label: "解決済み（確認）" };
    case "assumed_resolution":
      return { emoji: ":large_blue_circle:", label: "解決済み（推定）" };
    case "routed_to_team":
      return { emoji: ":arrow_right:", label: "チームへルーティング" };
    case "abandoned":
      return { emoji: ":no_entry_sign:", label: "離脱" };
    default:
      return { emoji: ":grey_question:", label: "不明" };
  }
}

/**
 * 個別のFIN会話通知をSlack Block Kit形式にフォーマットする。
 */
export function formatNotificationBlocks(
  conversation: FinConversation,
  summary: ConversationSummary,
): KnownBlock[] {
  const resolution = getResolutionDisplay(conversation.resolutionState);

  const blocks: KnownBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "FIN会話通知",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${resolution.emoji} ${resolution.label}｜${conversation.stayStatus || "不明"}｜${conversation.plan || "不明"}`,
      },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*問い合わせ内容*\n${summary.inquiry}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*FINの回答*\n${summary.responseSummary}`,
      },
    },
  ];

  if (conversation.contentSources.length > 0) {
    const sourcesList = conversation.contentSources
      .slice(0, 5)
      .filter((src) => src.title)
      .map((src) => `- ${src.title}`)
      .join("\n");

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*:books: 参照ソース*\n${sourcesList}`,
      },
    });
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Intercomで会話を開く",
          emoji: true,
        },
        url: conversation.conversationUrl,
        action_id: "open_intercom",
      },
    ],
  });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `会話ID: ${conversation.id} | ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
      },
    ],
  });

  return blocks;
}
