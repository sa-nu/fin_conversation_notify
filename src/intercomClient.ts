import { IntercomClient } from "intercom-client";
import type { Intercom } from "intercom-client";
import type {
  FinConversation,
  ResolutionState,
  LastAnswerType,
  ContentSource,
} from "./types.js";

const client = new IntercomClient({
  token: process.env.INTERCOM_ACCESS_TOKEN!,
});

/**
 * 会話IDから完全な会話データを取得してパースする。
 * FIN会話でない場合はnullを返す。
 */
export async function fetchConversationById(
  conversationId: string,
): Promise<FinConversation | null> {
  const fullConv = await client.conversations.find({
    conversation_id: conversationId,
  });
  return parseConversation(fullConv);
}

/**
 * 指定秒数以内に更新されたクローズ済みFIN会話を検索・取得する。
 */
export async function fetchRecentClosedFinConversations(
  sinceSeconds: number,
): Promise<FinConversation[]> {
  const now = Math.floor(Date.now() / 1000);
  const since = now - sinceSeconds;

  const conversations: FinConversation[] = [];

  let page = await client.conversations.search({
    query: {
      operator: "AND",
      value: [
        { field: "ai_agent_participated", operator: "=", value: "true" },
        { field: "updated_at", operator: ">", value: since },
        { field: "state", operator: "=", value: "closed" },
      ],
    },
    pagination: { per_page: 50 },
  });

  while (true) {
    for (const convSummary of page.data) {
      try {
        const fullConv = await client.conversations.find({
          conversation_id: convSummary.id,
        });
        const parsed = parseConversation(fullConv);
        if (parsed) {
          conversations.push(parsed);
        }
      } catch (error) {
        console.warn(`会話 ${convSummary.id} の取得に失敗: ${error}`);
      }
    }

    if (!page.hasNextPage()) break;
    page = await page.getNextPage();
  }

  return conversations;
}

/**
 * Intercom APIのレスポンスをFinConversation型にパースする。
 * FIN会話でない場合（ai_agentが無い場合）はnullを返す。
 */
function parseConversation(
  conv: Intercom.Conversation,
): FinConversation | null {
  if (!conv || !conv.id) return null;

  const aiAgent = conv.ai_agent;
  if (!aiAgent) return null;

  const parts = conv.conversation_parts?.conversation_parts ?? [];

  // ワークフロー選択: source.bodyが滞在ステータス
  const stayStatus = conv.source?.body ? stripHtml(conv.source.body) : "";

  // ユーザーメッセージを収集（最初のユーザー返信=プラン、以降=問い合わせ）
  const allUserMessages: string[] = [];
  const finResponses: string[] = [];

  for (const part of parts) {
    const body = part.body ? stripHtml(part.body) : "";
    if (!body) continue;

    const author = part.author;
    if (author?.type === "bot" || author?.from_ai_agent) {
      finResponses.push(body);
    } else if (author?.type === "user" || author?.type === "lead") {
      allUserMessages.push(body);
    }
  }

  // 最初のユーザー返信=プラン選択、残り=実際の問い合わせ
  const plan = allUserMessages[0] ?? "";
  const userMessages = allUserMessages.slice(1);

  const contentSources: ContentSource[] = (
    aiAgent?.content_sources?.content_sources ?? []
  ).map((src) => ({
    title: src.title ?? "",
    url: src.url ?? "",
    locale: src.locale ?? "",
  }));

  const contacts = conv.contacts as
    | { contacts?: Array<{ name?: string; email?: string }> }
    | undefined;
  const contactName =
    contacts?.contacts?.[0]?.name ??
    contacts?.contacts?.[0]?.email ??
    "unknown";

  const appId = process.env.INTERCOM_APP_ID ?? "";

  return {
    id: conv.id,
    createdAt: new Date((conv.created_at ?? 0) * 1000).toISOString(),
    updatedAt: new Date((conv.updated_at ?? 0) * 1000).toISOString(),
    resolutionState: (aiAgent?.resolution_state ?? null) as ResolutionState,
    lastAnswerType: (aiAgent?.last_answer_type ?? null) as LastAnswerType,
    contentSources,
    stayStatus,
    plan,
    userMessages,
    finResponses,
    conversationUrl: `https://app.intercom.com/a/apps/${appId}/inbox/inbox/all/conversations/${conv.id}`,
    totalParts: parts.length,
    contactName,
  };
}

/**
 * 簡易HTMLタグ除去
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}
