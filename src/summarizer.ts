import Anthropic from "@anthropic-ai/sdk";
import type { FinConversation, ConversationSummary } from "./types.js";

const anthropic = new Anthropic();

/**
 * Claude APIで個別のFIN会話を要約する。
 * ユーザーの問い合わせ内容とFINの回答を簡潔にまとめる。
 */
export async function summarizeConversation(
  conversation: FinConversation,
): Promise<ConversationSummary> {
  const userMsgs = conversation.userMessages
    .map((m) => m.substring(0, 500))
    .join("\n");
  const finMsgs = conversation.finResponses
    .map((m) => m.substring(0, 500))
    .join("\n");
  const sources = conversation.contentSources.map((s) => s.title).join(", ");

  const prompt = `あなたはIntercom FIN（AIチャットボット）の会話を要約する専門家です。
以下のFIN会話を分析し、JSON形式で要約してください。

会話ID: ${conversation.id}
滞在ステータス: ${conversation.stayStatus || "不明"}
プラン: ${conversation.plan || "不明"}
解決状態: ${conversation.resolutionState ?? "不明"}

ユーザーの問い合わせ:
${userMsgs || "(なし)"}

FINの応答:
${finMsgs || "(なし)"}

${sources ? `参照ソース: ${sources}` : ""}

以下のJSON形式で出力してください：
{
  "inquiry": "ユーザーの問い合わせ内容を1-2文で簡潔に要約（滞在ステータスやプランの選択は含めず、実際の質問内容のみ）",
  "responseSummary": "FINの回答内容と対応結果を1-3文で簡潔に要約"
}

注意事項：
- 日本語で要約
- 簡潔かつ正確に
- JSONのみを出力`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((block) => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    return {
      inquiry: conversation.userMessages[0]?.substring(0, 200) ?? "不明",
      responseSummary: "要約の生成に失敗しました",
    };
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSON not found");

    const parsed = JSON.parse(jsonMatch[0]) as ConversationSummary;
    return {
      inquiry:
        parsed.inquiry ||
        conversation.userMessages[0]?.substring(0, 200) ||
        "不明",
      responseSummary: parsed.responseSummary || "要約の生成に失敗しました",
    };
  } catch {
    return {
      inquiry: conversation.userMessages[0]?.substring(0, 200) ?? "不明",
      responseSummary: textContent.text.substring(0, 300),
    };
  }
}
