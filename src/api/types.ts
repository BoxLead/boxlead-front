export type PlatformType =
  | "META"
  | "INSTAGRAM"
  | "TIKTOK"
  | "WHATSAPP"
  | "GOOGLE_ADS"
  | "MELI";

export type ConversationStatus = "OPEN" | "CLOSED";

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
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
};

export type MessageResponse = {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  externalMessageId: string | null;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMessageRequest = {
  direction: MessageDirection;
  content?: string;
  externalMessageId?: string;
};

export type LeadResponse = {
  id: string;
  platform: PlatformType;
  campaignId: string | null;
  externalLeadId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccountConnectionResponse = {
  id: string;
  platform: PlatformType;
  externalAccountId: string;
  displayName: string | null;
  connectedAt: string;
};

export type OAuthCallbackRequest = {
  code: string;
  redirectUri: string;
  phoneNumberId?: string;
  wabaId?: string;
  codeVerifier?: string;
};

export type WhatsAppConfig = {
  appId: string;
  configId: string;
};

export type CommentThreadResponse = {
  id: string;
  leadId: string;
  platform: PlatformType;
  externalMediaId: string;
  mediaProductType: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommentResponse = {
  id: string;
  commentThreadId: string;
  parentCommentId: string | null;
  platform: PlatformType;
  externalCommentId: string;
  authorExternalId: string | null;
  authorUsername: string | null;
  text: string | null;
  createdAt: string;
  updatedAt: string;
};
