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

export type LeadTemperature = "COLD" | "WARM" | "HOT";

export type Features = {
  billing: boolean;
  referrals: boolean;
  legal: boolean;
};

export type Access = "FULL" | "RESTRICTED";

export type LegalDocumentKind =
  | "TERMS"
  | "PRIVACY"
  | "ADHESION_CONTRACT"
  | "RESELLER_AGREEMENT"
  | "DATA_PROCESSING";

export type LegalVersion = {
  kind: LegalDocumentKind;
  version: string;
};

export type SessionFlags = {
  features: Features;
  access: Access;
  isReseller: boolean;
  pendingLegal: LegalVersion[];
};

export type AuthUser = SessionFlags & {
  userId: string;
  email: string;
  name: string | null;
};

export type RegisterRequest = {
  email: string;
  password: string;
  name?: string;
  acceptedLegal?: LegalVersion[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type SocialLoginRequest = {
  idToken: string;
  acceptedLegal?: LegalVersion[];
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
  needsAttention?: boolean;
  attentionReason?: string | null;
  workingAgentName?: string | null;
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
  agentName?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReplyDraft = {
  id: string;
  conversationId: string;
  content: string;
  agentName: string | null;
  basedOnMessageId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateMessageRequest = {
  direction: MessageDirection;
  content?: string;
  externalMessageId?: string;
  kind?: MessageKind;
  replyToMessageId?: string;
  template?: { id: string; parameters: string[] };
};

export type MessageTemplate = {
  id: string;
  name: string;
  language: string;
  body: string;
  parameterCount: number;
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
  temperature?: LeadTemperature | null;
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
  qualified: number;
  agentReplies: number;
  responseBuckets: number[];
  unanswered: number;
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
  segments: MetricsSegment[];
};

export type BusinessHours = {
  weekdays: number[];
  from: number;
  to: number;
};

export type MetricsSettings = {
  manualReplyMinutes: number;
  businessHours: BusinessHours | null;
};

export type ReplyMode = "AUTO" | "DRAFT";

export type AgentScope = {
  platform: PlatformType | null;
  categoryId: string | null;
  salesStage: SalesStage | null;
  replyMode: ReplyMode;
};

export type AgentScopeResponse = AgentScope & { id: string };

export type AgentRequest = {
  name: string;
  instructions: string;
  enabled: boolean;
  publicCommentReplies: boolean;
  scopes: AgentScope[];
};

export type AgentResponse = {
  id: string;
  name: string;
  instructions: string;
  enabled: boolean;
  publicCommentReplies: boolean;
  position: number;
  scopes: AgentScopeResponse[];
  overPlanLimit?: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type AgentRunOutcome = "SENT" | "DRAFTED" | "HANDOFF" | "SKIPPED" | "SUPERSEDED";

export type AgentActivityCounts = {
  agentId: string;
  labeled: number;
  sent: number;
  drafted: number;
  skipped: number;
  handedOff: number;
};

export type AgentActivitySummary = {
  days: number;
  unassigned: { skipped: number; labeled: number };
  agents: AgentActivityCounts[];
};

export type AgentActivityEvent = {
  id: string;
  conversationId: string | null;
  outcome: AgentRunOutcome;
  reason: string | null;
  labeledCategoryId: string | null;
  createdAt: string;
};

export type AgentActivityDetail = {
  days: number;
  labeled: number;
  sent: number;
  drafted: number;
  skipped: number;
  handedOff: number;
  events: AgentActivityEvent[];
};

export type BusinessProfile = {
  description: string;
  tone: string | null;
  autoCategorize: boolean;
  autoQualify: boolean;
};

export type ReplyAudience = "PUBLIC" | "PRIVATE";

export type ChannelRules = {
  channelName: string;
  maxLength: number | null;
  audience: ReplyAudience;
  singleReply: boolean;
  contactDetailsAllowed: boolean;
  guidelines: string[];
};

export type PlaygroundDecision = "REPLY" | "HANDOFF";

export type PlaygroundResult = {
  decision: PlaygroundDecision;
  reason: string | null;
  replyMode: ReplyMode | null;
  channelRules: ChannelRules;
  violations: string[];
};

export type ApiErrorCode =
  | "PLAN_REQUIRED"
  | "PLAN_LIMIT_REACHED"
  | "ENTITLEMENTS_UNAVAILABLE"
  | "SUBSCRIPTION_EXISTS"
  | "SAME_PLAN"
  | "SUBSCRIPTION_NOT_ACTIVE"
  | "SUBSCRIPTION_CANCELING"
  | "DEMO_ALREADY_USED"
  | "INVITATION_INVALID"
  | "INVITATION_EMAIL_MISMATCH"
  | "LEGAL_ACCEPTANCE_REQUIRED"
  | "ACCOUNT_EXISTS_WITH_PASSWORD"
  | "BILLING_PROFILE_REQUIRED"
  | "PROVIDER_UNAVAILABLE";

export type FieldError = {
  field: string;
  message: string;
};

export type ApiErrorBody = {
  error: string;
  message: string;
  code?: ApiErrorCode;
  fields?: FieldError[];
};

export type Money = {
  amountMinor: number;
  currency: string;
};

export type PlanCode = "DEMO" | "STARTER" | "BUSINESS";

export type PaidPlanCode = Exclude<PlanCode, "DEMO">;

export type EntitlementKey =
  | "AGENT_REPLIES_PER_PERIOD"
  | "AGENTS_MAX"
  | "PLAYGROUND_RUNS_PER_HOUR"
  | "METRICS_HISTORY_DAYS"
  | "PUBLIC_COMMENT_REPLIES"
  | "AUTO_CATEGORIZE"
  | "DEMO_DURATION_DAYS";

export type PlanLimits = Partial<Record<EntitlementKey, number | null>>;

export type BillingPlan = {
  code: PlanCode;
  name: string;
  versionId: string;
  inviteOnly: boolean;
  price: Money | null;
  frequencyMonths: number | null;
  priceIncludesVat: boolean | null;
  priceWithoutNationalTaxes?: Money | null;
  limits: PlanLimits;
};

export type SubscriptionStatus =
  | "INCOMPLETE"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "PAUSED"
  | "CANCELED";

export type CheckoutStatus = "WAITING" | "PENDING" | "REJECTED";

export type PlanSource = "SUBSCRIPTION" | "DEMO";

export type CurrentPlan = {
  code: PlanCode;
  name: string;
  source: PlanSource;
};

export type SubscriptionSummary = {
  status: SubscriptionStatus;
  price: Money;
  currentPeriodEnd: string;
  graceUntil: string | null;
  cancelAtPeriodEnd: boolean;
  pendingPlanCode: PaidPlanCode | null;
  updatePaymentUrl: string | null;
};

export type DemoSummary = {
  endsAt: string;
};

export type CheckoutSummary = {
  planCode: PaidPlanCode;
  status: CheckoutStatus;
};

export type UsageCounter = {
  used: number;
  limit: number | null;
};

export type BillingUsage = {
  agentReplies: UsageCounter;
  periodEnd: string;
};

export type BillingSummary = {
  access: Access;
  plan: CurrentPlan | null;
  subscription: SubscriptionSummary | null;
  demo: DemoSummary | null;
  checkout: CheckoutSummary | null;
  usage: BillingUsage;
  limits: PlanLimits;
  billingProfileComplete: boolean;
};

export type CheckoutRequest = {
  planCode: PaidPlanCode;
  payerEmail: string;
  acceptedLegal?: LegalVersion[];
};

export type CheckoutResponse = {
  checkoutUrl: string;
};

export type ChangePlanRequest = {
  planCode: PaidPlanCode;
};

export type PaymentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED"
  | "CHARGED_BACK"
  | "IN_MEDIATION"
  | "CANCELLED";

export type BillingPayment = {
  date: string;
  amount: Money;
  status: PaymentStatus;
  invoiceNumber: string | null;
};

export type BillingProfile = {
  country: string;
  taxIdType: string;
  taxId: string;
  legalName: string;
  vatCondition: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  billingEmail: string;
};

export type InvitationPreviewRequest = {
  token: string;
};

export type Invitation = {
  email: string;
  expiresAt: string;
};

export type ReferralCodeStatus = "ACTIVE" | "DISABLED";

export type ReferralCode = {
  code: string;
  link: string;
  status: ReferralCodeStatus;
};

export type ReferralStats = {
  clicksLast30Days: number;
  registrations: number;
  activeCustomers: number;
};

export type ReferredCustomer = {
  label: string;
  cycle: number;
  maxCycles: number;
  subscriptionStatus: SubscriptionStatus;
};

export type CommissionStatus = "ACCRUED" | "APPROVED" | "PAID" | "REVERSED" | "HELD";

export type CommissionTotal = {
  status: CommissionStatus;
  amount: Money;
};

export type CommissionEntry = {
  date: string;
  customerLabel: string;
  cycle: number;
  amount: Money;
  status: CommissionStatus;
  releaseAt: string | null;
};

export type ReferralsResponse = {
  codes: ReferralCode[];
  stats: ReferralStats;
  customers: ReferredCustomer[];
  totals: CommissionTotal[];
  entries: CommissionEntry[];
};

export type LegalDocument = {
  kind: LegalDocumentKind;
  version: string;
  language: string;
  url: string;
  requiresAcceptance: boolean;
};

export type LegalAcceptanceRequest = {
  acceptedLegal: LegalVersion[];
};

export type ConsumerRequestKind = "WITHDRAWAL" | "CANCELLATION";

export type ConsumerRequest = {
  kind: ConsumerRequestKind;
  email: string;
  details?: string;
};

export type ConsumerRequestReceipt = {
  code: string;
  createdAt: string;
};
