import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser } from "playwright";

export type Placement = "top" | "bottom";

export type Caption = { start: number; end: number; kicker: string; text: string; placement: Placement };

type Camera = { zoom: number; x: number; y: number };

export type Move = { start: number; duration: number; to: Camera };

export type Frame = { file: string; at: number };

export type Source = { width: number; height: number };

export type Output = { width: number; height: number; fps: number; speed: number };

const CAPTION_FADE = 0.3;
const CAPTION_RISE = 18;
const CAPTION_MARGIN = 38;
const OPENING_FADE = 0.7;
const CLOSING_FADE = 1.2;
const LAST_FRAME_SECONDS = 2;
const MAX_STILL_SECONDS = 3.5;

function eased(start: number, duration: number): string {
  const progress = `clip((t-${start.toFixed(3)})/${duration.toFixed(3)},0,1)`;
  return `(${progress})*(${progress})*(${progress})*((${progress})*((${progress})*6-15)+10)`;
}

function track(moves: Move[], wide: Camera, key: keyof Camera, speed: number): string {
  let from = wide;
  const pieces = moves.map((move) => {
    const start = move.start / speed;
    const duration = Math.max(move.duration / speed, 0.05);
    const value = `(${from[key].toFixed(3)}+${(move.to[key] - from[key]).toFixed(3)}*${eased(start, duration)})`;
    from = move.to;
    return { start, value };
  });
  return nest(pieces, wide[key]);
}

function nest(pieces: Array<{ start: number; value: string }>, base: number): string {
  if (pieces.length === 0) return base.toFixed(3);
  const tree = (low: number, high: number): string => {
    if (low === high) return pieces[low].value;
    const middle = (low + high + 1) >> 1;
    return `if(lt(t,${pieces[middle].start.toFixed(3)}),${tree(low, middle - 1)},${tree(middle, high)})`;
  };
  return `if(lt(t,${pieces[0].start.toFixed(3)}),${base.toFixed(3)},${tree(0, pieces.length - 1)})`;
}

function stillTrimmer(frames: Frame[]): (at: number) => number {
  const cuts: Array<{ from: number; removed: number }> = [];
  let removed = 0;
  for (let index = 1; index < frames.length; index += 1) {
    const still = frames[index].at - frames[index - 1].at;
    if (still > MAX_STILL_SECONDS) {
      removed += still - MAX_STILL_SECONDS;
      cuts.push({ from: frames[index - 1].at + MAX_STILL_SECONDS, removed });
    }
  }
  return (at) => {
    let shift = 0;
    for (const cut of cuts) {
      if (at < cut.from) break;
      const previous = cuts[cuts.indexOf(cut) - 1]?.removed ?? 0;
      const span = cut.removed - previous;
      shift = previous + Math.min(at - cut.from, span);
    }
    return at - shift;
  };
}

export async function renderCaptions(browser: Browser, appUrl: string, captions: Caption[], dir: string, scale: number) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: scale });
  await page.goto(`${appUrl}/privacy-policy`);
  await page.evaluate(() => document.fonts.ready);
  const files: string[] = [];
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      html, body { margin: 0 !important; background: transparent !important; }
      .caption { display: inline-grid; gap: 5px; max-width: 820px; padding: 15px 28px 17px; border: 1px solid rgba(143, 193, 238, 0.32); border-radius: 18px; background: rgba(8, 14, 26, 0.92); box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); text-align: center; font-family: "Inter Variable", system-ui, sans-serif; }
      .kicker { color: #8fc1ee; font-size: 13px; font-weight: 650; letter-spacing: 0.14em; text-transform: uppercase; }
      .text { color: #f4f4ef; font-size: 26px; font-weight: 650; line-height: 1.25; letter-spacing: -0.01em; }
    `;
    document.head.append(style);
    document.body.innerHTML = `<div class="caption"><span class="kicker"></span><span class="text"></span></div>`;
  });
  for (const [index, caption] of captions.entries()) {
    await page.evaluate(([kicker, text]) => {
      document.querySelector(".kicker")!.textContent = kicker;
      document.querySelector(".text")!.textContent = text;
    }, [caption.kicker, caption.text]);
    const file = join(dir, `caption-${index}.png`);
    await page.locator(".caption").screenshot({ path: file, omitBackground: true });
    files.push(file);
  }
  await page.close();
  return files;
}

export function encode(options: {
  ffmpeg: string;
  dir: string;
  frames: Frame[];
  moves: Move[];
  captions: Caption[];
  captionFiles: string[];
  source: Source;
  output: Output;
  file: string;
}) {
  const { ffmpeg, dir, captionFiles, source, output, file } = options;
  const warp = stillTrimmer(options.frames);
  const frames = options.frames.map((frame) => ({ ...frame, at: warp(frame.at) }));
  const moves = options.moves.map((move) => ({ ...move, start: warp(move.start) }));
  const captions = options.captions.map((caption) => ({ ...caption, start: warp(caption.start), end: warp(caption.end) }));
  const origin = frames[0].at;
  const lines = frames.flatMap((frame, index) => {
    const next = frames[index + 1];
    const seconds = next ? Math.max(next.at - frame.at, 0) : LAST_FRAME_SECONDS;
    return [`file '${frame.file}'`, `duration ${seconds.toFixed(4)}`];
  });
  lines.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(join(dir, "frames.txt"), `${lines.join("\n")}\n`);

  const total = (frames[frames.length - 1].at - origin + LAST_FRAME_SECONDS) / output.speed;
  const wide: Camera = { zoom: 1, x: source.width / 2, y: source.height / 2 };
  const shifted = moves.map((move) => ({ ...move, start: move.start - origin }));
  const zoom = track(shifted, wide, "zoom", output.speed);
  const x = track(shifted, wide, "x", output.speed);
  const y = track(shifted, wide, "y", output.speed);
  const base = output.width / source.width;

  const camera =
    `[0:v]setpts=PTS/${output.speed},fps=${output.fps},` +
    `scale=w='trunc(${output.width}*(${zoom})/2)*2':h='trunc(${output.height}*(${zoom})/2)*2':eval=frame:flags=lanczos,` +
    `crop=${output.width}:${output.height}:x='floor(clip((${x})*${base}*(${zoom})-${output.width / 2},0,trunc(${output.width}*(${zoom})/2)*2-${output.width + 2}))':` +
    `y='floor(clip((${y})*${base}*(${zoom})-${output.height / 2},0,trunc(${output.height}*(${zoom})/2)*2-${output.height + 2}))',format=yuv420p[out]`;
  writeFileSync(join(dir, "camera.txt"), camera);
  execFileSync(
    ffmpeg,
    [
      "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "frames.txt",
      "-filter_complex_script", "camera.txt", "-map", "[out]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "10", "-pix_fmt", "yuv420p", "camera.mp4",
    ],
    { cwd: dir, stdio: "inherit" },
  );

  const chains = ["[0:v]format=yuv420p[v0]"];
  captions.forEach((caption, index) => {
    const start = (caption.start - origin) / output.speed;
    const length = Math.max((caption.end - caption.start) / output.speed, CAPTION_FADE * 2 + 0.2);
    const rise = caption.placement === "bottom" ? CAPTION_RISE : -CAPTION_RISE;
    const resting = caption.placement === "bottom" ? `H-h-${CAPTION_MARGIN}` : `${CAPTION_MARGIN}`;
    chains.push(
      `[${index + 1}:v]format=rgba,fade=t=in:st=0:d=${CAPTION_FADE}:alpha=1,fade=t=out:st=${(length - CAPTION_FADE).toFixed(3)}:d=${CAPTION_FADE}:alpha=1,setpts=PTS-STARTPTS+${start.toFixed(3)}/TB[c${index}]`,
      `[v${index}][c${index}]overlay=x='(W-w)/2':y='${resting}+${rise}*max(0,1-(t-${start.toFixed(3)})/${CAPTION_FADE * 1.6})':eof_action=pass:enable='between(t,${start.toFixed(3)},${(start + length).toFixed(3)})'[v${index + 1}]`,
    );
  });
  chains.push(
    `[v${captions.length}]fade=t=in:st=0:d=${OPENING_FADE},fade=t=out:st=${(total - CLOSING_FADE).toFixed(3)}:d=${CLOSING_FADE},format=yuv420p[out]`,
  );
  writeFileSync(join(dir, "graph.txt"), chains.join(";\n"));

  const captionInputs = captions.flatMap((caption, index) => {
    const length = Math.max((caption.end - caption.start) / output.speed, CAPTION_FADE * 2 + 0.2);
    return ["-loop", "1", "-framerate", String(output.fps), "-t", length.toFixed(3), "-i", captionFiles[index]];
  });
  execFileSync(
    ffmpeg,
    [
      "-y", "-loglevel", "error", "-i", "camera.mp4", ...captionInputs,
      "-filter_complex_script", "graph.txt", "-map", "[out]",
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart", file,
    ],
    { cwd: dir, stdio: "inherit" },
  );
}
