import { isAcceptedFileName, maxBytesFor, type JobOptions } from "@removebg/shared";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/apiResponse";
import { processImage } from "@/lib/imagePipeline/processImage";

export const runtime = "nodejs";
export const maxDuration = 120;

function parseOptions(raw: FormDataEntryValue | null): JobOptions {
  const fallback: JobOptions = { autoTrim: true, padding: 2, defringing: true, outputFormat: "png", aiMode: "ultra" };
  if (typeof raw !== "string") return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<JobOptions>;
    return {
      autoTrim: parsed.autoTrim ?? fallback.autoTrim,
      padding: Number.isFinite(parsed.padding) ? Number(parsed.padding) : fallback.padding,
      defringing: parsed.defringing ?? fallback.defringing,
      outputFormat: parsed.outputFormat === "webp" ? "webp" : "png",
      aiMode: parsed.aiMode === "standard" || parsed.aiMode === "pixel" ? parsed.aiMode : "ultra",
    };
  } catch {
    return fallback;
  }
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!form || !(file instanceof File)) return apiError(400, "err_generic");
  if (!isAcceptedFileName(file.name)) return apiError(415, "err_file_type");
  if (file.size > maxBytesFor(file.name)) return apiError(413, "err_file_size");

  try {
    const result = await processImage(Buffer.from(await file.arrayBuffer()), parseOptions(form.get("options")));
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Cache-Control": "no-store",
        "X-Engine": result.engine,
        "X-Gif-Frames": result.gifFrames === null ? "" : String(result.gifFrames),
        "X-Result-Size": `${result.width}x${result.height}`,
        "X-Source-Size": `${result.sourceWidth}x${result.sourceHeight}`,
        "X-Trim-Offset": `${result.offsetX},${result.offsetY}`,
      },
    });
  } catch {
    return apiError(500, "err_generic");
  }
}
