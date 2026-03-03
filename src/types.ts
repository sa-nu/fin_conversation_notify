/** FINの解決状態 */
export type ResolutionState =
  | "confirmed_resolution"
  | "assumed_resolution"
  | "routed_to_team"
  | "abandoned"
  | null;

/** FINの最終回答タイプ */
export type LastAnswerType = "ai_answer" | "custom_answer" | null;

/** FINが使用したコンテンツソース */
export interface ContentSource {
  title: string;
  url: string;
  locale: string;
}

/** Intercomから取得した個別のFIN会話 */
export interface FinConversation {
  id: string;
  createdAt: string;
  updatedAt: string;
  resolutionState: ResolutionState;
  lastAnswerType: LastAnswerType;
  contentSources: ContentSource[];
  userMessages: string[];
  finResponses: string[];
  conversationUrl: string;
  totalParts: number;
  contactName: string;
}

/** Intercom Webhookペイロード */
export interface IntercomWebhookPayload {
  type: string;
  topic: string;
  id: string;
  app_id: string;
  data: {
    type: string;
    item: {
      type: string;
      id: string;
      created_at: number;
      updated_at: number;
    };
  };
}

/** 個別会話のAI要約結果 */
export interface ConversationSummary {
  inquiry: string;
  responseSummary: string;
}
