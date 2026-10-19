import type {
  AgentActivityCounts,
  AgentActivityEvent,
  AgentResponse,
  ContextItem,
  LeadStatus,
  MessageResponse,
  PlatformType,
} from "../../src/api/types.ts";
import {
  ago,
  conversation,
  emptyState,
  IG_ACCOUNT_ID,
  IG_REEL_ID,
  lead,
  listing,
  MELI_SELLER_ID,
  message,
  nextId,
  PAGE_ID,
  scope,
  WABA_ID,
  type MockState,
  type StoredCategory,
} from "./fixtures.ts";

const DAY = 60 * 24;
const BULK_LEADS = 780;
const OLDEST_MINUTES = 30 * DAY;
const NEWEST_BULK_MINUTES = 25;
const NEWEST_BULK_REPLY_MINUTES = 15;

type Intent = "consulta" | "presupuesto" | "postventa" | "reclamo" | "mayorista" | "ninguna";

type Product = { key: string; id: string; title: string; short: string; price: number };

const PRODUCTS: Product[] = [
  { key: "auriculares", id: "MLA1402235567", title: "Auriculares inalámbricos Sony WH-1000XM5 negro", short: "Sony XM5", price: 899999 },
  { key: "parlante", id: "MLA1387719024", title: "Parlante portátil JBL Flip 6 azul", short: "Flip 6", price: 289999 },
  { key: "smartwatch", id: "MLA1455012876", title: "Smartwatch Amazfit GTS 4 negro", short: "Amazfit GTS 4", price: 349999 },
  { key: "barra", id: "MLA1398844102", title: "Barra de sonido Samsung HW-B550 con subwoofer", short: "barra Samsung", price: 599999 },
  { key: "teclado", id: "MLA1421190733", title: "Teclado mecánico Redragon Kumara K552 RGB", short: "Kumara K552", price: 89999 },
  { key: "mouse", id: "MLA1433567821", title: "Mouse gamer Logitech G502 X", short: "G502 X", price: 119999 },
  { key: "tocadiscos", id: "MLA1376655498", title: "Tocadiscos Audio-Technica AT-LP60X", short: "tocadiscos AT-LP60X", price: 459999 },
  { key: "cargador", id: "MLA1448800215", title: "Cargador Anker 65 W USB-C GaN", short: "cargador Anker", price: 69999 },
];

const CITIES = ["Córdoba", "Rosario", "Mendoza", "La Plata", "Mar del Plata", "Neuquén", "Salta", "Tucumán"];

const FIRST_NAMES = [
  "Valentina", "Martín", "Sofía", "Lucas", "Camila", "Mateo", "Julieta", "Tomás", "Florencia", "Nicolás",
  "Agustina", "Santiago", "Micaela", "Joaquín", "Carolina", "Facundo", "Lucía", "Federico", "Rocío", "Ignacio",
  "Paula", "Gonzalo", "Milagros", "Franco", "Belén", "Matías", "Daniela", "Emiliano", "Abril", "Ramiro",
];

const LAST_NAMES = [
  "González", "Rodríguez", "Fernández", "López", "Martínez", "Pérez", "Gómez", "Díaz", "Romero", "Sosa",
  "Torres", "Álvarez", "Ruiz", "Ramírez", "Flores", "Benítez", "Acosta", "Medina", "Herrera", "Suárez",
  "Aguirre", "Giménez", "Molina", "Castro", "Ortiz",
];

const HANDLE_SUFFIXES = ["", "", ".home", "_shop", ".ok", "ok", ".deco", "_ar"];

const QUESTIONS: Record<Exclude<Intent, "ninguna">, string[]> = {
  consulta: [
    "¿Tenés stock del {p}?",
    "¿El {p} tiene garantía oficial?",
    "¿Cuánto tarda el envío a {c}?",
    "¿Es compatible con iPhone?",
    "¿Viene en otro color?",
    "¿Hacen envíos a {c}?",
    "¿La batería cuánto dura?",
    "¿Puedo retirar en persona?",
  ],
  presupuesto: [
    "¿Precio por 5 unidades del {p}?",
    "¿Hacen factura A?",
    "¿Qué precio tiene en efectivo?",
    "¿En cuántas cuotas sin interés?",
    "Necesito equipar un local, ¿me pasás precios?",
    "¿Tienen descuento por transferencia?",
  ],
  postventa: [
    "¿Cuándo despachan mi compra?",
    "Ya me llegó, ¡gracias!",
    "¿Me pasás la factura?",
    "¿Cómo lo vinculo con el celular?",
    "¿Tienen el número de seguimiento?",
  ],
  reclamo: [
    "Me llegó con la caja golpeada",
    "No enciende desde ayer",
    "Pedí negro y me llegó azul",
    "Todavía no me llegó el pedido y ya pasó una semana",
  ],
  mayorista: [
    "Tengo un local en {c}, ¿venden por mayor?",
    "¿Tienen lista de precios para revendedores?",
    "¿Cuál es la compra mínima mayorista?",
  ],
};

const GENERIC_QUESTIONS = ["Hola, ¿están atendiendo?", "Buenas, una consulta", "¿Tienen local a la calle?"];

const ANSWERS: Record<Intent, string[]> = {
  consulta: [
    "¡Hola! Sí, tenemos stock y sale en el día.",
    "Sí, tiene 12 meses de garantía oficial.",
    "A {c} llega en 48 a 72 horas hábiles.",
    "¡Sí! Funciona con iPhone y con Android.",
    "Por ahora lo tenemos en negro y en azul.",
    "Podés retirar por el local de lunes a viernes de 9 a 18.",
  ],
  presupuesto: [
    "¡Hola! Te armamos el precio por cantidad y te lo pasamos por acá.",
    "Sí, emitimos factura A y B.",
    "Pagando por transferencia tenés 10% de descuento.",
    "Tenés hasta 6 cuotas sin interés con todas las tarjetas.",
    "¡Genial! Contanos qué necesitás y armamos el presupuesto.",
  ],
  postventa: [
    "¡Hola! Sale hoy y te pasamos el seguimiento.",
    "¡Gracias a vos! Cualquier cosa nos escribís.",
    "Te la mandamos por mail en el día.",
    "Mantené apretado el botón 5 segundos y aparece en el Bluetooth.",
  ],
  reclamo: [
    "Lamentamos mucho lo que pasó. Ya lo estamos revisando.",
    "Te pedimos disculpas. Lo cambiamos sin costo.",
    "Mandanos una foto y lo resolvemos hoy.",
  ],
  mayorista: ["¡Sí! Te pasamos la lista mayorista por acá.", "La compra mínima es de 10 unidades combinadas."],
  ninguna: ["¡Hola! Sí, ¿en qué te ayudamos?", "¡Hola! Contanos qué estás buscando."],
};

const FUNNEL: Array<[LeadStatus, number]> = [
  ["NEW", 0.3],
  ["CONTACTED", 0.32],
  ["QUALIFIED", 0.2],
  ["LOST", 0.1],
  ["CLOSED", 0.08],
];

const PLATFORMS: Array<[PlatformType, number]> = [
  ["MELI", 0.38],
  ["WHATSAPP", 0.3],
  ["INSTAGRAM", 0.22],
  ["META", 0.1],
];

const INTENTS: Array<[Intent, number]> = [
  ["consulta", 0.38],
  ["presupuesto", 0.26],
  ["postventa", 0.16],
  ["reclamo", 0.08],
  ["mayorista", 0.06],
  ["ninguna", 0.06],
];

function seeded(seed: number): () => number {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), 1 | value);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

class Dice {
  private readonly next: () => number;

  constructor(seed: number) {
    this.next = seeded(seed);
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(items: ReadonlyArray<[T, number]>): T {
    let roll = this.next();
    for (const [item, weight] of items) {
      roll -= weight;
      if (roll <= 0) return item;
    }
    return items[items.length - 1][0];
  }

  skewedAge(): number {
    return Math.round(NEWEST_BULK_MINUTES + (OLDEST_MINUTES - NEWEST_BULK_MINUTES) * this.next() ** 1.8);
  }
}

function plain(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function fill(text: string, product: Product, city: string): string {
  return text.replace("{p}", product.short).replace("{c}", city);
}

function categoryFor(intent: Intent, categories: Record<string, StoredCategory>): string | null {
  const names: Record<Intent, string | null> = {
    consulta: "Consulta",
    presupuesto: "Presupuesto",
    postventa: "Postventa",
    reclamo: "Reclamo",
    mayorista: "Mayorista",
    ninguna: null,
  };
  const name = names[intent];
  return name ? categories[name].id : null;
}

function statusFor(intent: Intent, minutes: number, dice: Dice): LeadStatus {
  if (intent === "postventa") return dice.chance(0.8) ? "CLOSED" : "QUALIFIED";
  if (intent === "reclamo") return dice.chance(0.7) ? "CONTACTED" : "LOST";
  if (minutes < DAY && dice.chance(0.6)) return "NEW";
  return dice.weighted(FUNNEL);
}

function agentFor(intent: Intent, platform: PlatformType, postSale: boolean): string {
  if (postSale && platform === "MELI") return "Postventa";
  if (intent === "presupuesto") return "Presupuestos";
  return "Ventas";
}

function threadPrefix(platform: PlatformType): string {
  const prefixes: Record<PlatformType, string> = {
    MELI: MELI_SELLER_ID,
    WHATSAPP: WABA_ID,
    INSTAGRAM: IG_ACCOUNT_ID,
    META: PAGE_ID,
    TIKTOK: "tiktok",
    GOOGLE_ADS: "google",
  };
  return prefixes[platform];
}

function contactName(platform: PlatformType, index: number, dice: Dice): { name: string | null; externalId: string } {
  const first = dice.pick(FIRST_NAMES);
  const last = dice.pick(LAST_NAMES);
  const number = 1000 + index;
  if (platform === "MELI") {
    return { name: `${plain(first).slice(0, 4)}${plain(last)}_${dice.int(10, 99)}`.toUpperCase(), externalId: `ML${number}` };
  }
  if (platform === "INSTAGRAM") {
    const handle = `${plain(first)}.${plain(last)}${dice.pick(HANDLE_SUFFIXES)}`.toLowerCase();
    return { name: handle, externalId: `1784140${number}000` };
  }
  if (platform === "WHATSAPP") return { name: `${first} ${last}`, externalId: `54911${4000 + index}${dice.int(1000, 9999)}` };
  return { name: dice.chance(0.85) ? `${first} ${last}` : null, externalId: `6012${number}00000` };
}

function images(state: MockState) {
  for (const product of PRODUCTS) {
    state.listings[product.id] = listing(product.id, product.title, product.price, product.key);
  }
  const posts: ContextItem[] = [
    { externalId: IG_REEL_ID, title: "Flip 6 en stock, envíos a todo el país", image: "parlante", status: "REELS" },
    { externalId: "18034412345678902", title: "Nuevos Sony XM5, cancelación de ruido real", image: "auriculares", status: "FEED" },
    { externalId: "18034412345678903", title: "Amazfit GTS 4 en tres colores", image: "smartwatch", status: "REELS" },
  ].map((post) => ({
    kind: "POST",
    externalId: post.externalId,
    title: post.title,
    imageUrl: `/__img/${post.image}.svg`,
    url: `https://www.instagram.com/p/${post.externalId.slice(-6)}/`,
    price: null,
    currency: null,
    status: post.status,
    quantity: null,
    createdAt: null,
    lines: [],
  }));
  for (const post of posts) state.posts[post.externalId] = post;
  return posts.map((post) => post.externalId);
}

function order(state: MockState, product: Product, minutes: number): string {
  const id = `2000009${String(Object.keys(state.orders).length + 1).padStart(6, "0")}`;
  state.orders[id] = [
    {
      kind: "ORDER",
      externalId: id,
      title: null,
      imageUrl: null,
      url: null,
      price: product.price,
      currency: "ARS",
      status: minutes > 3 * DAY ? "delivered" : "paid",
      quantity: 1,
      createdAt: ago(minutes),
      lines: [{ externalItemId: product.id, title: product.title, quantity: 1, unitPrice: product.price, currency: "ARS" }],
    },
  ];
  return id;
}

type Exchange = { question: string; answer: string };

function exchanges(intent: Intent, product: Product, dice: Dice): Exchange[] {
  const count = dice.int(1, 3);
  return Array.from({ length: count }, () => {
    const city = dice.pick(CITIES);
    const question = intent === "ninguna" ? dice.pick(GENERIC_QUESTIONS) : fill(dice.pick(QUESTIONS[intent]), product, city);
    return { question, answer: fill(dice.pick(ANSWERS[intent]), product, city) };
  });
}

function bulk(state: MockState, categories: Record<string, StoredCategory>, posts: string[]) {
  const dice = new Dice(20261015);
  for (let index = 0; index < BULK_LEADS; index += 1) {
    const platform = dice.weighted(PLATFORMS);
    const intent = dice.weighted(INTENTS);
    const minutes = dice.skewedAge();
    const product = dice.pick(PRODUCTS);
    const postSale = platform === "MELI" && intent === "postventa";
    const status = statusFor(intent, minutes, dice);
    const contact = contactName(platform, index, dice);
    const person = lead(platform, contact.name, contact.externalId, minutes, {
      status,
      categoryId: categoryFor(intent, categories),
      postSaleOnly: postSale && dice.chance(0.4),
      phone: platform === "WHATSAPP" ? `+${contact.externalId}` : null,
      email: dice.chance(0.2) ? `${plain(contact.name ?? "contacto").toLowerCase().replace(/[^a-z]/g, "")}@example.com` : null,
    });
    state.leads.push(person);

    const chat = conversation(person, `${threadPrefix(platform)}_${contact.externalId}`, minutes, {
      salesStage: postSale ? "POST_SALE" : "PRE_SALE",
      replyContextId: postSale ? order(state, product, minutes) : null,
      lastReadAt: ago(0),
    });
    state.conversations.push(chat);

    const comment = platform === "INSTAGRAM" && dice.chance(0.25);
    const contextRef = platform === "MELI" && !postSale ? product.id : comment ? dice.pick(posts) : null;
    const waiting = status === "NEW" && dice.chance(0.7);
    const agent = agentFor(intent, platform, postSale);
    const steps = exchanges(intent, product, dice);
    let at = minutes;
    for (const [position, step] of steps.entries()) {
      const kind: MessageResponse["kind"] = comment ? "COMMENT" : "TEXT";
      const last = position === steps.length - 1 || at < 30;
      state.messages.push(message(chat, "INBOUND", step.question, at, { kind, contextRef }));
      if (last && waiting) break;
      const reply = Math.max(at - dice.int(1, 40), NEWEST_BULK_REPLY_MINUTES);
      state.messages.push(
        message(chat, "OUTBOUND", step.answer, reply, { kind, contextRef, agentName: dice.chance(0.62) ? agent : null }),
      );
      if (last || reply < 40) break;
      at = reply - dice.int(5, Math.min(600, reply - 20));
    }
    if (waiting && minutes < 8 * 60 && dice.chance(0.75)) chat.lastReadAt = null;
  }
}

function heroes(state: MockState, categories: Record<string, StoredCategory>) {
  const product = (key: string) => PRODUCTS.find((item) => item.key === key) as Product;
  const auriculares = product("auriculares");
  const barra = product("barra");
  const parlante = product("parlante");

  const lucas = lead("MELI", "LUCASRIVERO_77", "ML_HERO_1", 52, { categoryId: categories.Consulta.id });
  const lucasChat = conversation(lucas, `${MELI_SELLER_ID}_ML_HERO_1`, 52);
  state.leads.push(lucas);
  state.conversations.push(lucasChat);
  state.messages.push(
    message(lucasChat, "INBOUND", "¿Tenés stock en negro?", 52, { contextRef: auriculares.id, externalMessageId: "13087790001" }),
    message(lucasChat, "OUTBOUND", "¡Hola! Sí, tenemos stock en negro y sale en el día.", 51, {
      contextRef: auriculares.id,
      externalMessageId: "13087790001:answer",
      agentName: "Ventas",
    }),
    message(lucasChat, "INBOUND", "¿La barra Samsung hace envío a Córdoba?", 2, {
      contextRef: barra.id,
      externalMessageId: "13087790002",
    }),
  );

  const valentina = lead("WHATSAPP", "Valentina Ruiz", "5491140002291", 9, {
    phone: "+5491140002291",
    status: "CONTACTED",
    categoryId: categories.Presupuesto.id,
  });
  const valentinaChat = conversation(valentina, `${WABA_ID}_5491140002291`, 9);
  state.leads.push(valentina);
  state.conversations.push(valentinaChat);
  const valentinaAsk = message(
    valentinaChat,
    "INBOUND",
    "Hola! Tengo un bar y quiero 4 parlantes Flip 6. ¿Me pasás precio por cantidad y si hacen factura A?",
    9,
  );
  state.messages.push(valentinaAsk);
  state.drafts.push({
    id: nextId("d4af"),
    conversationId: valentinaChat.id,
    content:
      "¡Hola Valentina! Sí, emitimos factura A. Por 4 Flip 6 pagando por transferencia tenés 10% de descuento y te los enviamos en 48 horas. ¿Te paso el link de pago?",
    agentName: "Presupuestos",
    basedOnMessageId: valentinaAsk.id,
    createdAt: ago(8),
    updatedAt: ago(8),
  });

  const flor = lead("INSTAGRAM", "flor.deco", "17841400555001", 6, { categoryId: categories.Consulta.id });
  const florChat = conversation(flor, `${IG_ACCOUNT_ID}_17841400555001`, 6);
  state.leads.push(flor);
  state.conversations.push(florChat);
  state.messages.push(
    message(florChat, "INBOUND", "¿Precio del Flip 6? Lo quiero en azul", 6, {
      kind: "COMMENT",
      externalMessageId: "17900000000099001",
      contextRef: IG_REEL_ID,
    }),
  );

  const martu = lead("INSTAGRAM", "martu.home", "17841400555002", 4, {
    status: "CONTACTED",
    categoryId: categories.Reclamo.id,
  });
  const martuChat = conversation(martu, `${IG_ACCOUNT_ID}_17841400555002`, 30, {
    needsAttention: true,
    attentionReason: "El cliente pidió hablar con una persona.",
  });
  state.leads.push(martu);
  state.conversations.push(martuChat);
  state.messages.push(
    message(martuChat, "INBOUND", "Hola, me llegó la barra con la caja golpeada", 30),
    message(martuChat, "OUTBOUND", "¡Hola! Lamentamos mucho lo que pasó. ¿Nos mandás una foto de la caja?", 29, {
      agentName: "Ventas",
    }),
    message(martuChat, "INBOUND", "Prefiero hablar con una persona, por favor", 4),
  );

  const diego = lead("WHATSAPP", "Diego Fernández", "5491140008812", 3 * DAY, {
    phone: "+5491140008812",
    status: "QUALIFIED",
    categoryId: categories.Consulta.id,
  });
  const diegoChat = conversation(diego, `${WABA_ID}_5491140008812`, 3 * DAY, { lastReadAt: ago(0) });
  state.leads.push(diego);
  state.conversations.push(diegoChat);
  state.messages.push(
    message(diegoChat, "INBOUND", "¿Me avisás cuando entren los Sony XM5 en blanco?", 3 * DAY),
    message(diegoChat, "OUTBOUND", "¡Dale Diego! Te avisamos apenas entren.", 3 * DAY - 3, { agentName: "Ventas" }),
  );

  const carolina = lead("MELI", "CAROLINA_PZ", "ML_HERO_2", 70, {
    postSaleOnly: true,
    status: "CLOSED",
    email: "carolina.paz@example.com",
    categoryId: categories.Postventa.id,
  });
  const carolinaChat = conversation(carolina, `${MELI_SELLER_ID}_ML_HERO_2`, 70, {
    salesStage: "POST_SALE",
    replyContextId: order(state, parlante, 70),
    workingAgentName: "Postventa",
    lastReadAt: ago(0),
  });
  state.leads.push(carolina);
  state.conversations.push(carolinaChat);
  state.messages.push(
    message(carolinaChat, "INBOUND", "Hola, ya hice la compra. ¿Cuándo despachan?", 70),
    message(carolinaChat, "OUTBOUND", "¡Hola Carolina! Sale hoy y te pasamos el seguimiento.", 68, { agentName: "Postventa" }),
    message(carolinaChat, "INBOUND", "¡Genial, gracias!", 40),
  );
}

function agents(categories: Record<string, StoredCategory>): AgentResponse[] {
  const at = ago(12 * DAY);
  const agent = (name: string, instructions: string, position: number, scopes: AgentResponse["scopes"]): AgentResponse => ({
    id: nextId("a9e1"),
    name,
    instructions,
    enabled: true,
    publicCommentReplies: name === "Ventas",
    position,
    scopes,
    createdAt: at,
    updatedAt: at,
  });
  return [
    agent("Ventas", "Respondé rápido, ofrecé el producto que buscan y cerrá la venta con el link de pago.", 0, [
      scope(null, null, null, "AUTO"),
    ]),
    agent("Presupuestos", "Armá presupuestos por cantidad y pedí el CUIT para la factura.", 1, [
      scope(null, categories.Presupuesto.id, null, "DRAFT"),
      scope(null, categories.Mayorista.id, null, "DRAFT"),
    ]),
    agent("Postventa", "Pasá el seguimiento del envío y resolvé dudas de uso.", 2, [scope("MELI", null, "POST_SALE", "AUTO")]),
  ];
}

function activity(state: MockState, list: AgentResponse[]) {
  const counts = new Map<string, AgentActivityCounts>(
    list.map((agent) => [agent.name, { agentId: agent.id, labeled: 0, sent: 0, drafted: 0, skipped: 0, handedOff: 0 }]),
  );
  const events = new Map<string, AgentActivityEvent[]>(list.map((agent) => [agent.name, []]));
  const categoryOf = new Map(
    state.conversations.map((chat) => [chat.id, state.leads.find((item) => item.id === chat.leadId)?.categoryId ?? null]),
  );
  const labeledChats = new Set<string>();
  const record = (agentName: string, event: Omit<AgentActivityEvent, "id">) => {
    events.get(agentName)?.push({ id: nextId("e0a1"), ...event });
  };

  for (const item of state.messages) {
    if (item.direction !== "OUTBOUND" || !item.agentName) continue;
    const count = counts.get(item.agentName);
    if (!count) continue;
    count.sent += 1;
    const category = labeledChats.has(item.conversationId) ? null : (categoryOf.get(item.conversationId) ?? null);
    if (category) {
      labeledChats.add(item.conversationId);
      count.labeled += 1;
    }
    record(item.agentName, {
      conversationId: item.conversationId,
      outcome: "SENT",
      reason: null,
      labeledCategoryId: category,
      createdAt: item.createdAt,
    });
  }
  for (const draft of state.drafts) {
    const count = draft.agentName ? counts.get(draft.agentName) : undefined;
    if (!count || !draft.agentName) continue;
    count.drafted += 1;
    record(draft.agentName, {
      conversationId: draft.conversationId,
      outcome: "DRAFTED",
      reason: null,
      labeledCategoryId: categoryOf.get(draft.conversationId) ?? null,
      createdAt: draft.createdAt,
    });
  }
  for (const chat of state.conversations.filter((item) => item.needsAttention)) {
    const count = counts.get("Ventas");
    if (!count) continue;
    count.handedOff += 1;
    record("Ventas", {
      conversationId: chat.id,
      outcome: "HANDOFF",
      reason: chat.attentionReason ?? null,
      labeledCategoryId: null,
      createdAt: ago(4),
    });
  }
  const skipped = state.conversations.filter((chat) => chat.platform === "WHATSAPP").slice(10, 13);
  for (const [index, chat] of skipped.entries()) {
    const count = counts.get("Ventas");
    if (!count) continue;
    count.skipped += 1;
    record("Ventas", {
      conversationId: chat.id,
      outcome: "SKIPPED",
      reason: "human_took_over",
      labeledCategoryId: null,
      createdAt: ago(24 + index * 90),
    });
  }

  state.activity = {
    summary: { days: 30, unassigned: { skipped: 2, labeled: 0 }, agents: [...counts.values()] },
    details: Object.fromEntries(
      list.map((agent) => {
        const count = counts.get(agent.name) as AgentActivityCounts;
        const recent = (events.get(agent.name) ?? []).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 25);
        const { labeled, sent, drafted, skipped: omitted, handedOff } = count;
        return [agent.id, { days: 30, labeled, sent, drafted, skipped: omitted, handedOff, events: recent }];
      }),
    ),
  };
}

function connections(state: MockState) {
  const connection = (platform: PlatformType, externalAccountId: string, displayName: string, minutes: number) => ({
    id: nextId("acc0"),
    platform,
    externalAccountId,
    displayName,
    connectedAt: ago(40 * DAY),
    needsReconnection: false,
    lastEventAt: ago(minutes),
    failedEventCount: 0,
  });
  state.connections.push(
    connection("MELI", MELI_SELLER_ID, "TIENDA_NORTE", 2),
    connection("WHATSAPP", WABA_ID, "+54 9 11 4000-2210", 9),
    connection("INSTAGRAM", IG_ACCOUNT_ID, "@tiendanorte", 4),
    connection("META", PAGE_ID, "Tienda Norte", 35),
  );
}

export function buildShowcase(): MockState {
  const state = emptyState();
  state.categories.push({
    id: nextId("ca7e"),
    name: "Mayorista",
    description: "Comercios y revendedores que compran por cantidad.",
    color: "ORANGE",
    position: state.categories.length,
    createdAt: ago(20 * DAY),
    updatedAt: ago(20 * DAY),
  });
  const categories = Object.fromEntries(state.categories.map((category) => [category.name, category]));

  connections(state);
  const posts = images(state);
  heroes(state, categories);
  bulk(state, categories, posts);

  const roster = agents(categories);
  state.agents.push(...roster);
  state.businessProfile = {
    description:
      "Tienda Norte vende audio y tecnología. Envíos a todo el país en 48 a 72 horas hábiles. Factura A y B. Hasta 6 cuotas sin interés y 10% de descuento por transferencia.",
    tone: "cercano y directo",
    autoCategorize: true,
  };
  activity(state, roster);
  state.playgroundReplies = [
    {
      pattern: "mayor|revend|local",
      reply:
        "¡Hola! Sí, vendemos por mayor. La compra mínima es de 10 unidades combinadas y te pasamos la lista mayorista por acá. ¿Me pasás tu CUIT para armarte el presupuesto?",
    },
    {
      pattern: "env[ií]o|llega|c[oó]rdoba|rosario|mendoza",
      reply:
        "¡Hola! Sí, enviamos a todo el país. A Córdoba llega en 48 a 72 horas hábiles y te pasamos el seguimiento apenas sale. ¿Querés que te lo reservemos?",
    },
    {
      pattern: "precio|cu[aá]nto|cuotas|transferencia",
      reply:
        "¡Hola! Tenés hasta 6 cuotas sin interés y 10% de descuento pagando por transferencia. ¿Te paso el link de pago?",
    },
    { pattern: "factura", reply: "Sí, emitimos factura A y B. Pasanos tu CUIT y la mandamos con la compra." },
  ];
  state.playgroundLimit = 30;
  return state;
}
