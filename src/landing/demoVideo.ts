export const VIDEO_SRC = "/demo/boxlead-demo.mp4";
export const POSTER_SRC = "/demo/boxlead-demo-poster.jpg";
export const DURATION_LABEL = "2:27";
export const VIDEO_UPLOAD_DATE = "2026-10-25T00:00:00-03:00";

export function isoDuration(label: string): string {
  const parts = label.split(":").map(Number);
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  const minutes = Math.floor(seconds / 60);
  return `PT${minutes}M${seconds % 60}S`;
}
