export type CaptionPlacement = "top" | "bottom";

declare global {
  interface Window {
    demo: {
      caption: (kicker: string, text: string, placement: CaptionPlacement) => void;
      hideCaption: () => void;
      card: (html: string) => void;
      raise: () => void;
    };
  }
}

export function installOverlay() {
  const css = `
    #demo-overlay { position: fixed; inset: 0; width: 100vw; height: 100vh; margin: 0; padding: 0; border: 0; overflow: visible; background: transparent; z-index: 2147483647; pointer-events: none; font-family: "Inter Variable", system-ui, sans-serif; }
    .demo-cursor { position: absolute; left: 0; top: 0; width: 26px; height: 26px; transform: translate(-100px, -100px); filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.45)); }
    .demo-ripple { position: absolute; width: 44px; height: 44px; margin: -22px 0 0 -22px; border: 3px solid rgba(143, 193, 238, 0.95); border-radius: 50%; animation: demo-ripple 0.55s ease-out forwards; }
    @keyframes demo-ripple { from { transform: scale(0.3); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
    .demo-caption { position: absolute; left: 50%; display: grid; gap: 4px; max-width: 760px; padding: 14px 24px 16px; border: 1px solid rgba(143, 193, 238, 0.35); border-radius: 18px; background: rgba(8, 14, 26, 0.9); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); text-align: center; opacity: 0; transition: opacity 0.35s ease, transform 0.35s ease; }
    .demo-caption[data-placement="bottom"] { bottom: 28px; transform: translate(-50%, 16px); }
    .demo-caption[data-placement="top"] { top: 16px; transform: translate(-50%, -16px); }
    .demo-caption.is-visible { opacity: 1; transform: translate(-50%, 0); }
    .demo-caption-kicker { color: #8fc1ee; font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
    .demo-caption-text { color: #f4f4ef; font-size: 25px; font-weight: 650; line-height: 1.25; letter-spacing: -0.01em; }
    .demo-card { position: absolute; inset: 0; display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, #17304d 0%, #0b1220 62%); opacity: 0; transition: opacity 0.6s ease; }
    .demo-card.is-visible { opacity: 1; }
    .demo-card-body { display: grid; gap: 18px; justify-items: center; text-align: center; color: #f4f4ef; }
    .demo-card-logo { display: flex; align-items: center; gap: 14px; font-size: 44px; letter-spacing: 0.04em; }
    .demo-card-logo svg { width: 56px; height: 56px; }
    .demo-card-title { max-width: 900px; margin: 0; font-size: 50px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; }
    .demo-card-title em { color: #8fc1ee; font-style: normal; }
    .demo-card-sub { margin: 0; color: #b8c4d3; font-size: 22px; }
    .demo-card-url { margin-top: 10px; padding: 12px 26px; border-radius: 999px; background: #eaeadc; color: #132c44; font-size: 22px; font-weight: 700; }
    .demo-card-note { margin-top: 18px; color: #6f7d90; font-size: 14px; }
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
    overlay.innerHTML = `${arrow}<div class="demo-caption" data-placement="bottom"><span class="demo-caption-kicker"></span><span class="demo-caption-text"></span></div><div class="demo-card"></div>`;
    document.body.append(overlay);
    overlay.showPopover();
    return overlay;
  }

  window.addEventListener(
    "mousemove",
    (event) => {
      const cursor = root().querySelector<SVGElement>(".demo-cursor");
      if (cursor) cursor.style.transform = `translate(${event.clientX - 4}px, ${event.clientY - 2}px)`;
    },
    true,
  );
  window.addEventListener(
    "mousedown",
    (event) => {
      const ripple = document.createElement("div");
      ripple.className = "demo-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      root().append(ripple);
      setTimeout(() => ripple.remove(), 600);
    },
    true,
  );

  window.demo = {
    caption(kicker, text, placement) {
      const caption = root().querySelector<HTMLElement>(".demo-caption");
      if (!caption) return;
      caption.classList.remove("is-visible");
      caption.dataset.placement = placement;
      caption.querySelector(".demo-caption-kicker")!.textContent = kicker;
      caption.querySelector(".demo-caption-text")!.textContent = text;
      requestAnimationFrame(() => requestAnimationFrame(() => caption.classList.add("is-visible")));
    },
    hideCaption() {
      root().querySelector(".demo-caption")?.classList.remove("is-visible");
    },
    raise() {
      const overlay = root();
      overlay.hidePopover();
      overlay.showPopover();
    },
    card(html) {
      const card = root().querySelector<HTMLElement>(".demo-card");
      if (!card) return;
      card.innerHTML = html;
      requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-visible")));
    },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => root());
  else root();
}
