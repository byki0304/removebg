import { parseGIF } from "gifuct-js";

export function isGifBuffer(buffer: Buffer): boolean {
  return buffer.length > 6 && buffer.subarray(0, 3).toString("ascii") === "GIF";
}

/** N = 1: static GIF (whole image). N > 1: animated GIF, only Frame 0 is processed. */
export function countGifFrames(buffer: Buffer): number {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const gif = parseGIF(arrayBuffer);
  return gif.frames.filter((frame) => "image" in frame).length;
}
