"""RemoveBg AI Engine — local FastAPI sidecar (Electron) and Cloud Run GPU service (web)."""

from __future__ import annotations

import argparse
import hmac
import os
import threading

from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

import model_loader
import pipeline

MAX_UPLOAD_BYTES = 60 * 1024 * 1024
# Public deployments (Cloud Run) set ENGINE_TOKEN; callers must send it as X-Engine-Token.
ENGINE_TOKEN = os.environ.get("ENGINE_TOKEN", "")

app = FastAPI(title="RemoveBg AI Engine")


@app.get("/health")
def health() -> dict[str, object]:
    return {"ok": True, "models": model_loader.loaded_models()}


def _process(data: bytes, ai_mode: str, defringing: bool) -> bytes:
    rgb = pipeline.load_rgb(data)
    alpha = model_loader.predict_alpha(rgb, ai_mode)
    return pipeline.finish(rgb, alpha, defringing=defringing, pixel_mode=ai_mode == "pixel")


@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    apply_defringing: bool = Form(True),
    ai_mode: str = Form("ultra"),
    x_engine_token: str = Header(""),
) -> Response:
    if ENGINE_TOKEN and not hmac.compare_digest(x_engine_token, ENGINE_TOKEN):
        raise HTTPException(status_code=401, detail="invalid engine token")
    data = await file.read()
    if not data or len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large or empty")
    if ai_mode not in model_loader.MODEL_BY_MODE:
        ai_mode = "ultra"
    try:
        png = await run_in_threadpool(_process, data, ai_mode, apply_defringing)
    except model_loader.ModelUnavailableError as exc:
        # 503 makes the Node bridge fall back to its built-in basic engine.
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return Response(content=png, media_type="image/png")


def _preload(mode: str) -> None:
    try:
        model_loader.get_session(mode)
        print(f"[sidecar] model ready: {model_loader.MODEL_BY_MODE[mode]}")
    except Exception as exc:  # noqa: BLE001 — a failed warm-up must not stop the server
        print(f"[sidecar] model preload skipped: {exc}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8000")))
    parser.add_argument(
        "--preload",
        action="store_true",
        help="download/load the default model in the background so the first request does not time out",
    )
    args = parser.parse_args()
    if args.preload:
        threading.Thread(target=_preload, args=(os.environ.get("REMOVEBG_PRELOAD_MODE", "ultra"),), daemon=True).start()

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port, log_level="info")


if __name__ == "__main__":
    main()
