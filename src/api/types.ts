export type PlatformType =
  | "META"
  | "INSTAGRAM"
  | "TIKTOK"
  | "WHATSAPP"
  | "GOOGLE_ADS"
  | "MELI";

export type ConversationStatus = "OPEN" | "CLOSED";

export type SalesStage = "PRE_SALE" | "POST_SALE";

export type MessageDirection = "INBOUND" | "OUTBOUND";

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "LOST" | "CLOSED";

export type AuthUser = {
  userId: string;
  email: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name?: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type ConversationResponse = {
  id: string;
  leadId: string;
  platform: PlatformType;
  externalThreadId: string | null;
  salesStage: SalesStage;
  status: ConversationStatus;
  leadName?: string | null;
  lastMessagePreview?: string | null;
  lastMessageDirection?: MessageDirection | null;
  lastMessageAt?: string | null;
  lastReadAt?: string | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type MessageKind = "TEXT" | "COMMENT";

export type MessageResponse = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  externalMessageId: string | null;
  kind: MessageKind;
  content: string | null;
  contextRef?: string | null;
  replyToExternalId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMessageRequest = {
  direction: MessageDirection;
  content?: string;
  externalMessageId?: string;
  kind?: MessageKind;
  replyToMessageId?: string;
};

export type LeadResponse = {
  id: string;
  platform: PlatformType;
  externalLeadId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  postSaleOnly: boolean;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UpdateLeadRequest = {
  status?: LeadStatus;
  name?: string;
  email?: string;
  phone?: string;
};

export type AccountConnectionResponse = {
  id: string;
  platform: PlatformType;
  externalAccountId: string;
  displayName: string | null;
  connectedAt: string;
  needsReconnection: boolean;
  lastEventAt?: string | null;
  failedEventCount?: number;
};

export type OAuthCallbackRequest = {
  code: string;
  redirectUri?: string;
  phoneNumberId?: string;
  wabaId?: string;
  codeVerifier?: string;
};

export type WhatsAppConfig = {
  appId: string;
  configId: string;
};

export type ContextItemKind = "LISTING" | "ORDER" | "POST";

export type ContextLine = {
  externalItemId: string | null;
  title: string | null;
  quantity: number | null;
  unitPrice: number | null;
  currency: string | null;
};

export type ContextItem = {
  kind: ContextItemKind;
  externalId: string;
  title: string | null;
  imageUrl: string | null;
  url: string | null;
  price: number | null;
  currency: string | null;
  status: string | null;
  quantity: number | null;
  createdAt: string | null;
  lines: ContextLine[];
};

export type ConversationContextResponse = {
  items: ContextItem[];
};

export type AuthUrlResponse = {
  url: string;
  codeVerifier?: string;
};

export type CategoryColor =
  | "BLUE"
  | "GREEN"
  | "YELLOW"
  | "ORANGE"
  | "RED"
  | "PURPLE"
  | "PINK"
  | "GRAY";

export type CategoryResponse = {
  id: string;
  name: string;
  description: string | null;
  color: CategoryColor;
  position: number;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryRequest = {
  name: string;
  description?: string;
  color: CategoryColor;
};

export type UpdateCategoryRequest = {
  name?: string;
  description?: string;
  color?: CategoryColor;
};

export type HandoffReason = "ASKED_FOR_HUMAN" | "AGENT_UNSURE" | "TAKEN_OVER";

export type MetricsDay = {
  date: string;
  leads: number;
  conversations: number;
  inboundMessages: number;
  agentReplies: number;
  humanReplies: number;
  qualified: number;
  closed: number;
  firstResponses: number;
  fastResponses: number;
};

export type FirstResponseMetrics = {
  agent: number[];
  human: number[];
  converted: number[];
  unanswered: number;
};

export type OutsideHoursMetrics = {
  conversations: number;
  answeredUnder5m: number;
};

export type AgentMetrics = {
  resolved: number;
  handoffs: Record<HandoffReason, number>;
};

export type MetricsSegment = {
  platform: PlatformType;
  categoryId: string | null;
  days: MetricsDay[];
  leadStatuses: Record<LeadStatus, number>;
  firstResponse: FirstResponseMetrics;
  inboundByHour: number[];
  outsideHours: OutsideHoursMetrics | null;
  agent: AgentMetrics | null;
};

export type MetricsReport = {
  from: string;
  to: string;
  timezone: string;
  generatedAt: string;
  segments: MetricsSegment[];
};

export type BusinessHours = {
  weekdays: number[];
  from: number;
  to: number;
};

export type MetricsSettings = {
  averageTicket: number | null;
  currency: string;
  manualReplyMinutes: number;
  businessHours: BusinessHours | null;
};
