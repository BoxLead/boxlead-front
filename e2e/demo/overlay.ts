declare global {
  interface Window {
    demo: {
      card: (variant: "intro" | "chapter" | "outro", html: string) => void;
      hideCard: () => void;
      raise: () => void;
    };
  }
}

export function installOverlay() {
  const css = `
    #demo-overlay { position: fixed; inset: 0; width: 100vw; height: 100vh; margin: 0; padding: 0; border: 0; overflow: visible; background: transparent; z-index: 2147483647; pointer-events: none; font-family: "Inter Variable", system-ui, sans-serif; color: #f4f4ef; }
    .demo-cursor { position: absolute; left: 0; top: 0; width: 30px; height: 30px; transform: translate(-100px, -100px); filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5)); transition: scale 0.12s ease; }
    .demo-cursor.is-pressed { scale: 0.86; }
    .demo-ripple { position: absolute; width: 46px; height: 46px; margin: -23px 0 0 -23px; border: 2px solid rgba(143, 193, 238, 0.95); border-radius: 50%; background: rgba(143, 193, 238, 0.18); animation: demo-ripple 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) forwards; }
    @keyframes demo-ripple { from { transform: scale(0.25); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
    .demo-card { position: absolute; inset: 0; display: grid; place-items: center; opacity: 0; transition: opacity 0.7s ease; }
    .demo-card.is-visible { opacity: 1; }
    .demo-card[data-variant="intro"], .demo-card[data-variant="outro"] { background: radial-gradient(120% 90% at 50% 30%, #1a3655 0%, #0d1828 48%, #070d17 100%); }
    .demo-card[data-variant="chapter"] { background: rgba(7, 13, 23, 0.62); backdrop-filter: blur(18px) saturate(120%); }
    .demo-card-glow { position: absolute; width: 900px; height: 900px; border-radius: 50%; background: radial-gradient(circle, rgba(143, 193, 238, 0.16), transparent 62%); animation: demo-breathe 6s ease-in-out infinite; }
    @keyframes demo-breathe { 50% { transform: scale(1.12); opacity: 0.7; } }
    .demo-stack { position: relative; display: grid; gap: 20px; justify-items: center; text-align: center; }
    .demo-stack > * { opacity: 0; transform: translateY(22px); animation: demo-rise 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: calc(var(--i, 0) * 140ms + 150ms); }
    @keyframes demo-rise { to { opacity: 1; transform: none; } }
    .demo-logo { display: flex; align-items: center; gap: 14px; font-size: 40px; letter-spacing: 0.06em; }
    .demo-logo svg { width: 52px; height: 52px; }
    .demo-pill { padding: 6px 14px; border: 1px solid rgba(143, 193, 238, 0.4); border-radius: 999px; color: #8fc1ee; font-size: 14px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; }
    .demo-headline { max-width: 980px; margin: 0; font-size: 58px; font-weight: 750; line-height: 1.06; letter-spacing: -0.025em; }
    .demo-headline em { display: block; color: #8fc1ee; font-style: normal; }
    .demo-sub { max-width: 760px; margin: 0; color: #b8c4d3; font-size: 22px; line-height: 1.45; }
    .demo-values { display: flex; gap: 14px; margin-top: 6px; }
    .demo-value { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; background: rgba(255, 255, 255, 0.04); color: #e7ecf2; font-size: 17px; font-weight: 550; }
    .demo-value::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: #4cc38a; box-shadow: 0 0 12px #4cc38a; }
    .demo-cta { display: flex; align-items: center; gap: 16px; margin-top: 10px; }
    .demo-cta-primary { padding: 14px 30px; border-radius: 999px; background: #eaeadc; color: #132c44; font-size: 22px; font-weight: 750; box-shadow: 0 12px 40px rgba(234, 234, 220, 0.18); }
    .demo-cta-url { color: #b8c4d3; font-size: 21px; font-weight: 600; }
    .demo-note { margin-top: 8px; color: #5f6d80; font-size: 13px; }
    .demo-chapter-number { color: #8fc1ee; font-size: 18px; font-weight: 700; letter-spacing: 0.3em; }
    .demo-chapter-title { margin: 0; font-size: 64px; font-weight: 750; letter-spacing: -0.03em; }
    .demo-chapter-line { width: 0; height: 3px; border-radius: 3px; background: linear-gradient(90deg, #8fc1ee, #4cc38a); animation: demo-line 0.9s 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 1 !important; transform: none !important; }
    @keyframes demo-line { to { width: 120px; } }
    .demo-chapter-sub { margin: 0; color: #c7d1dd; font-size: 24px; }
  `;
  const arrow = `<svg class="demo-cursor" viewBox="0 0 24 24"><path d="M4 2l15 11.2-6.6 1.3 3.9 7.2-2.9 1.5-3.9-7.3L4 20.6z" fill="#ffffff" stroke="#0b1220" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

  function root(): HTMLElement {
    const existing = document.getElementById("demo-overlay");
    if (existing) return existing;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
    const overlay = document.createElement("div");
    overlay.id = "demo-overlay";
    overlay.popover = "manual";
    overlay.innerHTML = `<div class="demo-card"></div>${arrow}`;
    document.body.append(overlay);
    overlay.showPopover();
    return overlay;
  }

  const cursor = () => root().querySelector<SVGElement>(".demo-cursor");

  window.addEventListener(
    "mousemove",
    (event) => {
      const element = cursor();
      if (element) element.style.transform = `translate(${event.clientX - 5}px, ${event.clientY - 3}px)`;
    },
    true,
  );
  window.addEventListener(
    "mousedown",
    (event) => {
      cursor()?.classList.add("is-pressed");
      const ripple = document.createElement("div");
      ripple.className = "demo-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      root().append(ripple);
      setTimeout(() => ripple.remove(), 650);
    },
    true,
  );
  window.addEventListener("mouseup", () => cursor()?.classList.remove("is-pressed"), true);

  window.demo = {
    card(variant, html) {
      const card = root().querySelector<HTMLElement>(".demo-card");
      if (!card) return;
      card.dataset.variant = variant;
      card.innerHTML = html;
      card.querySelectorAll<HTMLElement>(".demo-stack > *").forEach((item, index) => item.style.setProperty("--i", String(index)));
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-visible")));
    },
    hideCard() {
      root().querySelector(".demo-card")?.classList.remove("is-visible");
    },
    raise() {
      const overlay = root();
      overlay.hidePopover();
      overlay.showPopover();
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => root());
  else root();
}
