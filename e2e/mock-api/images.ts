const frame = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f4f4f0"/>${body}</svg>`;

export const PRODUCT_IMAGES: Record<string, string> = {
  auriculares: frame(
    `<path d="M50 120V100a50 50 0 0 1 100 0v20" fill="none" stroke="#1d1f24" stroke-width="12" stroke-linecap="round"/><rect x="34" y="112" width="32" height="52" rx="14" fill="#1d1f24"/><rect x="134" y="112" width="32" height="52" rx="14" fill="#1d1f24"/><rect x="42" y="124" width="16" height="28" rx="7" fill="#3a3d45"/><rect x="142" y="124" width="16" height="28" rx="7" fill="#3a3d45"/>`,
  ),
  parlante: frame(
    `<rect x="40" y="70" width="120" height="64" rx="32" fill="#1f5fae"/><circle cx="72" cy="102" r="18" fill="#174a88"/><circle cx="128" cy="102" r="18" fill="#174a88"/><rect x="88" y="94" width="24" height="16" rx="4" fill="#f7a823"/><rect x="58" y="138" width="84" height="8" rx="4" fill="#d9d9d2"/>`,
  ),
};
