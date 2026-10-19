const frame = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f4f4f0"/>${body}</svg>`;

export const PRODUCT_IMAGES: Record<string, string> = {
  auriculares: frame(
    `<path d="M50 120V100a50 50 0 0 1 100 0v20" fill="none" stroke="#1d1f24" stroke-width="12" stroke-linecap="round"/><rect x="34" y="112" width="32" height="52" rx="14" fill="#1d1f24"/><rect x="134" y="112" width="32" height="52" rx="14" fill="#1d1f24"/><rect x="42" y="124" width="16" height="28" rx="7" fill="#3a3d45"/><rect x="142" y="124" width="16" height="28" rx="7" fill="#3a3d45"/>`,
  ),
  parlante: frame(
    `<rect x="40" y="70" width="120" height="64" rx="32" fill="#1f5fae"/><circle cx="72" cy="102" r="18" fill="#174a88"/><circle cx="128" cy="102" r="18" fill="#174a88"/><rect x="88" y="94" width="24" height="16" rx="4" fill="#f7a823"/><rect x="58" y="138" width="84" height="8" rx="4" fill="#d9d9d2"/>`,
  ),
  smartwatch: frame(
    `<rect x="78" y="30" width="44" height="40" rx="8" fill="#2b2d33"/><rect x="78" y="130" width="44" height="40" rx="8" fill="#2b2d33"/><rect x="60" y="60" width="80" height="80" rx="22" fill="#1d1f24"/><rect x="70" y="70" width="60" height="60" rx="14" fill="#123b5e"/><path d="M84 100h10l6-12 8 24 6-12h8" fill="none" stroke="#7fd1ff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
  ),
  barra: frame(
    `<rect x="18" y="82" width="164" height="36" rx="12" fill="#1d1f24"/><circle cx="48" cy="100" r="9" fill="#3a3d45"/><circle cx="152" cy="100" r="9" fill="#3a3d45"/><rect x="80" y="96" width="40" height="8" rx="4" fill="#3a3d45"/><rect x="62" y="132" width="76" height="40" rx="10" fill="#2b2d33"/><circle cx="100" cy="152" r="12" fill="#3a3d45"/>`,
  ),
  teclado: frame(
    `<rect x="20" y="70" width="160" height="70" rx="10" fill="#1d1f24"/>${Array.from({ length: 30 }, (_, i) => `<rect x="${30 + (i % 10) * 14.4}" y="${80 + Math.floor(i / 10) * 16}" width="11" height="11" rx="2" fill="${["#ff5a5f", "#f7a823", "#4cc38a", "#4ea8ff", "#a77bff"][i % 5]}"/>`).join("")}<rect x="56" y="122" width="88" height="10" rx="3" fill="#3a3d45"/>`,
  ),
  mouse: frame(
    `<rect x="64" y="40" width="72" height="122" rx="36" fill="#1d1f24"/><path d="M100 40v44M64 84h72" stroke="#3a3d45" stroke-width="4"/><rect x="95" y="54" width="10" height="20" rx="5" fill="#4ea8ff"/>`,
  ),
  tocadiscos: frame(
    `<rect x="24" y="44" width="152" height="116" rx="10" fill="#c9a77c"/><circle cx="92" cy="102" r="46" fill="#1d1f24"/><circle cx="92" cy="102" r="14" fill="#d94b3d"/><circle cx="92" cy="102" r="3" fill="#f4f4f0"/><path d="M152 58v56l-22 18" fill="none" stroke="#e7e7e2" stroke-width="5" stroke-linecap="round"/>`,
  ),
  cargador: frame(
    `<rect x="62" y="56" width="76" height="76" rx="14" fill="#e7e7e2" stroke="#c9c9c2" stroke-width="3"/><rect x="80" y="40" width="10" height="20" rx="3" fill="#9a9a94"/><rect x="110" y="40" width="10" height="20" rx="3" fill="#9a9a94"/><path d="M100 132v28c0 10 10 14 22 14h18" fill="none" stroke="#1d1f24" stroke-width="7" stroke-linecap="round"/><rect x="86" y="84" width="28" height="18" rx="4" fill="#4ea8ff"/>`,
  ),
};
