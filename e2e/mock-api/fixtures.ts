import type {
  AccountConnectionResponse,
  AgentResponse,
  BusinessProfile,
  CategoryResponse,
  ContextItem,
  ConversationResponse,
  LeadResponse,
  MessageResponse,
  PlatformType,
  ReplyDraft,
  ReplyMode,
  SalesStage,
} from "../../src/api/types.ts";

export type Scenario = "default" | "empty" | "meli-reconnect" | "agents" | "agents-limited";

export type StoredConversation = Omit<
  ConversationResponse,
  | "leadName"
  | "lastMessagePreview"
  | "lastMessageDirection"
  | "lastMessageAt"
  | "unreadCount"
> & { replyContextId: string | null };

export type StoredCategory = Omit<CategoryResponse, "leadCount">;

export type MockState = {
  categories: StoredCategory[];
  leads: LeadResponse[];
  conversations: StoredConversation[];
  messages: MessageResponse[];
  connections: AccountConnectionResponse[];
  listings: Record<string, ContextItem>;
  orders: Record<string, ContextItem[]>;
  posts: Record<string, ContextItem>;
  agents: AgentResponse[];
  businessProfile: BusinessProfile;
  drafts: ReplyDraft[];
  playgroundRuns: number;
  playgroundLimit: number;
};

export const MELI_SELLER_ID = "241550991";
export const WABA_ID = "104882915577";
export const IG_ACCOUNT_ID = "17841400008460056";
export const IG_REEL_ID = "18034412345678901";
export const PAGE_ID = "112233445566778";

const MINUTE = 60_000;

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * MINUTE).toISOString();
}

let sequence = 0;

export function nextId(prefix: string): string {
  sequence += 1;
  const hex = sequence.toString(16).padStart(12, "0");
  const tag = prefix.padEnd(8, "0").slice(0, 8);
  return `${tag}-0000-4000-8000-${hex}`;
}

function lead(
  platform: PlatformType,
  name: string | null,
  externalLeadId: string,
  minutes: number,
  extra: Partial<LeadResponse> = {},
): LeadResponse {
  return {
    id: nextId("1ead"),
    platform,
    externalLeadId,
    name,
    email: null,
    phone: null,
    status: "NEW",
    postSaleOnly: false,
    categoryId: null,
    createdAt: ago(minutes),
    updatedAt: ago(minutes),
    ...extra,
  };
}

function conversation(
  leadRef: LeadResponse,
  externalThreadId: string,
  minutes: number,
  extra: Partial<StoredConversation> = {},
): StoredConversation {
  return {
    id: nextId("c0ff"),
    leadId: leadRef.id,
    platform: leadRef.platform,
    externalThreadId,
    salesStage: "PRE_SALE",
    status: "OPEN",
    lastReadAt: null,
    replyContextId: null,
    createdAt: ago(minutes),
    updatedAt: ago(minutes),
    ...extra,
  };
}

function message(
  conversationRef: StoredConversation,
  direction: MessageResponse["direction"],
  content: string,
  minutes: number,
  extra: Partial<MessageResponse> = {},
): MessageResponse {
  return {
    id: nextId("5e55"),
    conversationId: conversationRef.id,
    direction,
    externalMessageId: null,
    content,
    kind: "TEXT",
    contextRef: null,
    replyToExternalId: null,
    createdAt: ago(minutes),
    updatedAt: ago(minutes),
    ...extra,
  };
}

function listing(
  externalId: string,
  title: string,
  price: number,
  image: string,
): ContextItem {
  return {
    kind: "LISTING",
    externalId,
    title,
    imageUrl: `/__img/${image}.svg`,
    url: `https://articulo.mercadolibre.com.ar/${externalId.slice(0, 3)}-${externalId.slice(3)}`,
    price,
    currency: "ARS",
    status: "active",
    quantity: null,
    createdAt: null,
    lines: [],
  };
}

const DEFAULT_CATEGORIES: Array<Pick<StoredCategory, "name" | "description" | "color">> = [
  { name: "Consulta", description: "Personas que preguntan por un producto o servicio antes de decidir.", color: "BLUE" },
  { name: "Presupuesto", description: "Pedidos de precio, cotización o condiciones de compra.", color: "GREEN" },
  { name: "Postventa", description: "Clientes que ya compraron y consultan por envío, uso o factura.", color: "PURPLE" },
  { name: "Reclamo", description: "Problemas, devoluciones o quejas que necesitan atención.", color: "RED" },
];

export function defaultCategories(): StoredCategory[] {
  return DEFAULT_CATEGORIES.map((category, position) => ({
    ...category,
    id: nextId("ca7e"),
    position,
    createdAt: ago(60 * 24 * 30),
    updatedAt: ago(60 * 24 * 30),
  }));
}

export function emptyState(): MockState {
  return {
    categories: defaultCategories(),
    leads: [],
    conversations: [],
    messages: [],
    connections: [],
    listings: {},
    orders: {},
    posts: {},
    agents: [],
    businessProfile: { description: "", tone: null, autoCategorize: true },
    drafts: [],
    playgroundRuns: 0,
    playgroundLimit: 30,
  };
}

export function buildState(scenario: Scenario): MockState {
  if (scenario === "empty") return emptyState();
  if (scenario === "agents" || scenario === "agents-limited") return withAgents(buildState("default"), scenario);

  const state = emptyState();

  state.connections.push(
    {
      id: nextId("acc0"),
      platform: "MELI",
      externalAccountId: MELI_SELLER_ID,
      displayName: "TIENDA_NORTE",
      connectedAt: ago(60 * 24 * 12),
      needsReconnection: scenario === "meli-reconnect",
      lastEventAt: ago(4),
      failedEventCount: scenario === "meli-reconnect" ? 3 : 0,
    },
    {
      id: nextId("acc0"),
      platform: "WHATSAPP",
      externalAccountId: WABA_ID,
      displayName: "+54 9 11 4000-2210",
      connectedAt: ago(60 * 24 * 20),
      needsReconnection: false,
      lastEventAt: ago(18),
      failedEventCount: 0,
    },
    {
      id: nextId("acc0"),
      platform: "INSTAGRAM",
      externalAccountId: IG_ACCOUNT_ID,
      displayName: "@tiendanorte",
      connectedAt: ago(60 * 24 * 30),
      needsReconnection: false,
      lastEventAt: ago(55),
      failedEventCount: 0,
    },
  );

  const auriculares = listing(
    "MLA1402235567",
    "Auriculares inalámbricos Sony WH-1000XM5 negro",
    899999,
    "auriculares",
  );
  const parlante = listing(
    "MLA1387719024",
    "Parlante portátil JBL Flip 6 azul",
    289999,
    "parlante",
  );
  state.listings[auriculares.externalId] = auriculares;
  state.listings[parlante.externalId] = parlante;

  const [consulta, presupuesto, postventa] = state.categories;
  const martin = lead("MELI", "MARTINGOMEZ_82", "MARTIN_ML_1", 300, { categoryId: consulta.id });
  const preSale = conversation(martin, `${MELI_SELLER_ID}_99120001`, 300);
  state.leads.push(martin);
  state.conversations.push(preSale);
  state.messages.push(
    message(preSale, "INBOUND", "Hola, ¿tenés stock en color negro?", 300, {
      externalMessageId: "13087766001",
      contextRef: auriculares.externalId,
    }),
    message(
      preSale,
      "OUTBOUND",
      "¡Hola! Sí, tenemos stock en negro y sale en el día.",
      290,
      {
        externalMessageId: "13087766001:answer",
        contextRef: auriculares.externalId,
      },
    ),
    message(preSale, "INBOUND", "¿Hacen envío a Córdoba capital?", 42, {
      externalMessageId: "13087766002",
      contextRef: auriculares.externalId,
    }),
    message(preSale, "INBOUND", "¿El parlante viene con factura A?", 12, {
      externalMessageId: "13087766003",
      contextRef: parlante.externalId,
    }),
  );

  const carolina = lead("MELI", "CAROLINA_PZ", "CAROLINA_ML_2", 60 * 26, {
    postSaleOnly: true,
    email: "carolina.paz@example.com",
    phone: "1155550199",
    categoryId: postventa.id,
  });
  const postSale = conversation(carolina, `${MELI_SELLER_ID}_99120002`, 60 * 26, {
    salesStage: "POST_SALE",
    replyContextId: "2000009871234",
  });
  state.leads.push(carolina);
  state.conversations.push(postSale);
  state.orders["2000009871234"] = [
    {
      kind: "ORDER",
      externalId: "2000009871234",
      title: null,
      imageUrl: null,
      url: null,
      price: 289999,
      currency: "ARS",
      status: "paid",
      quantity: 1,
      createdAt: ago(60 * 26),
      lines: [
        {
          externalItemId: parlante.externalId,
          title: parlante.title,
          quantity: 1,
          unitPrice: 289999,
          currency: "ARS",
        },
      ],
    },
  ];
  state.messages.push(
    message(postSale, "INBOUND", "Hola, ya hice la compra. ¿Cuándo despachan?", 60 * 25, {
      externalMessageId: "a1f2c3d4e5f60001",
    }),
    message(postSale, "OUTBOUND", "¡Hola Carolina! Sale mañana a primera hora.", 60 * 24, {
      externalMessageId: "a1f2c3d4e5f60002",
    }),
    message(postSale, "INBOUND", "Genial, muchas gracias.", 25, {
      externalMessageId: "a1f2c3d4e5f60003",
    }),
  );

  const herrera = lead("WHATSAPP", "Martín Herrera", "5491155550142", 90, {
    phone: "+5491155550142",
    status: "CONTACTED",
    categoryId: presupuesto.id,
  });
  const whatsapp = conversation(herrera, `774400112233_5491155550142`, 90);
  state.leads.push(herrera);
  state.conversations.push(whatsapp);
  state.messages.push(
    message(whatsapp, "INBOUND", "Buenas, ¿hacen factura A para empresas?", 90),
    message(whatsapp, "OUTBOUND", "¡Hola Martín! Sí, emitimos factura A.", 85),
    message(whatsapp, "INBOUND", "Perfecto, paso el CUIT por acá.", 5),
  );

  const sofia = lead("INSTAGRAM", "sofi.decoraciones", "17841401234567", 180, {
    status: "QUALIFIED",
  });
  const instagram = conversation(sofia, `${IG_ACCOUNT_ID}_17841401234567`, 180);
  state.leads.push(sofia);
  state.conversations.push(instagram);
  state.messages.push(
    message(instagram, "INBOUND", "Hola! Vi el parlante en sus historias, ¿lo tienen en rosa?", 180),
    message(instagram, "OUTBOUND", "¡Hola Sofi! Por ahora solo en azul y negro.", 170),
  );

  const julian = lead("META", null, "6012345678901234", 60 * 50);
  const messenger = conversation(julian, `${PAGE_ID}_6012345678901234`, 60 * 50);
  state.leads.push(julian);
  state.conversations.push(messenger);
  state.messages.push(
    message(messenger, "INBOUND", "¿Tienen local para retirar?", 60 * 50, {}),
  );
  messenger.lastReadAt = ago(60 * 49);

  const reel: ContextItem = {
    kind: "POST",
    externalId: IG_REEL_ID,
    title: "Flip 6 en stock, envíos a todo el país",
    imageUrl: "/__img/parlante.svg",
    url: "https://www.instagram.com/reel/C9mockReel1/",
    price: null,
    currency: null,
    status: "REELS",
    quantity: null,
    createdAt: null,
    lines: [],
  };
  state.posts[reel.externalId] = reel;

  const commenter = lead("INSTAGRAM", "nico.audio", "17841409876543", 60 * 24 * 8);
  const commenterChat = conversation(commenter, `${IG_ACCOUNT_ID}_17841409876543`, 60 * 24 * 8);
  commenterChat.lastReadAt = ago(15);
  state.leads.push(commenter);
  state.conversations.push(commenterChat);
  state.messages.push(
    message(commenterChat, "INBOUND", "¿Precio del Flip 6?", 60 * 24 * 8, {
      kind: "COMMENT",
      externalMessageId: "17900000000000001",
      contextRef: IG_REEL_ID,
    }),
    message(commenterChat, "OUTBOUND", "¡Te escribimos por privado!", 60 * 24 * 8 - 10, {
      kind: "COMMENT",
      externalMessageId: "17900000000000002",
      contextRef: IG_REEL_ID,
      replyToExternalId: "17900000000000001",
    }),
    message(commenterChat, "INBOUND", "¿Y lo tienen en azul?", 20, {
      kind: "COMMENT",
      externalMessageId: "17900000000000003",
      contextRef: IG_REEL_ID,
    }),
  );

  return state;
}

function scope(
  platform: PlatformType | null,
  categoryId: string | null,
  salesStage: SalesStage | null,
  replyMode: ReplyMode,
): AgentResponse["scopes"][number] {
  return { id: nextId("5c0e"), platform, categoryId, salesStage, replyMode };
}

function withAgents(state: MockState, scenario: Scenario): MockState {
  const presupuesto = state.categories.find((c) => c.name === "Presupuesto");
  if (!presupuesto) throw new Error("fixture: missing Presupuesto category");
  const at = ago(60 * 24 * 3);

  state.businessProfile = {
    description: "Vendemos audio y accesorios. Envíos a todo el país en 48 horas. Aceptamos todos los medios de pago.",
    tone: "cercano y directo",
    autoCategorize: true,
  };
  state.agents.push(
    {
      id: nextId("a9e1"),
      name: "Ventas",
      instructions: "Respondé con entusiasmo, ofrecé el producto y cerrá la venta.",
      enabled: true,
      position: 0,
      scopes: [scope(null, null, null, "AUTO"), scope(null, presupuesto.id, null, "DRAFT")],
      createdAt: at,
      updatedAt: at,
    },
    {
      id: nextId("a9e1"),
      name: "Postventa",
      instructions: "",
      enabled: false,
      position: 1,
      scopes: [scope("MELI", null, "POST_SALE", "AUTO")],
      createdAt: at,
      updatedAt: at,
    },
  );

  const whatsappChat = state.conversations.find((c) => c.platform === "WHATSAPP");
  const instagramChat = state.conversations.find(
    (c) => c.platform === "INSTAGRAM" && state.messages.some((m) => m.conversationId === c.id && m.kind === "TEXT"),
  );
  if (!whatsappChat || !instagramChat) throw new Error("fixture: missing conversations");

  const answered = state.messages.find(
    (m) => m.conversationId === whatsappChat.id && m.direction === "OUTBOUND",
  );
  if (answered) answered.agentName = "Ventas";
  const trigger = state.messages.filter((m) => m.conversationId === whatsappChat.id).at(-1);
  state.drafts.push({
    id: nextId("d4af"),
    conversationId: whatsappChat.id,
    content: "¡Perfecto Martín! Pasame el CUIT y te mandamos la factura A hoy mismo.",
    agentName: "Ventas",
    basedOnMessageId: trigger?.id ?? null,
    createdAt: ago(4),
    updatedAt: ago(4),
  });
  instagramChat.needsAttention = true;
  instagramChat.attentionReason = "El cliente pidió hablar con una persona.";

  state.playgroundLimit = scenario === "agents-limited" ? 0 : 30;
  return state;
}
