"""Lazy loading of segmentation models (BiRefNet / IS-Net Anime via rembg ONNX sessions)."""

from __future__ import annotations

import gc
import os
import threading
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

MODELS_DIR = Path(os.environ.get("REMOVEBG_MODELS_DIR", Path(__file__).parent / "models"))
os.environ.setdefault("U2NET_HOME", str(MODELS_DIR))

# ai_mode → rembg model name. Pixel art / anime sprites segment better with IS-Net Anime.
MODEL_BY_MODE: dict[str, str] = {
    "ultra": os.environ.get("REMOVEBG_MODEL_ULTRA", "birefnet-general"),
    "standard": os.environ.get("REMOVEBG_MODEL_STANDARD", "birefnet-general-lite"),
    "pixel": os.environ.get("REMOVEBG_MODEL_PIXEL", "isnet-anime"),
}

_sessions: dict[str, Any] = {}
_lock = threading.Lock()
# Memory-bound hosts (Cloud Run CPU) keep a single model resident; 0 = no limit (desktop).
MAX_SESSIONS = int(os.environ.get("REMOVEBG_MAX_SESSIONS", "0"))


class ModelUnavailableError(RuntimeError):
    pass


def _providers() -> list[str]:
    try:
        import onnxruntime as ort
    except ImportError as exc:
        raise ModelUnavailableError("onnxruntime is not installed") from exc
    available = ort.get_available_providers()
    preferred = ["CUDAExecutionProvider", "DmlExecutionProvider", "CoreMLExecutionProvider", "CPUExecutionProvider"]
    return [p for p in preferred if p in available] or available


def get_session(mode: str) -> Any:
    model_name = MODEL_BY_MODE.get(mode, MODEL_BY_MODE["ultra"])
    with _lock:
        if model_name not in _sessions:
            try:
                from rembg import new_session
            except ImportError as exc:
                raise ModelUnavailableError("rembg is not installed") from exc
            if MAX_SESSIONS and len(_sessions) >= MAX_SESSIONS:
                _sessions.clear()
                gc.collect()
            MODELS_DIR.mkdir(parents=True, exist_ok=True)
            _sessions[model_name] = new_session(model_name, providers=_providers())
        return _sessions[model_name]


def predict_alpha(rgb: np.ndarray, mode: str) -> np.ndarray:
    """Return an HxW uint8 alpha mask for the given RGB image."""
    from rembg import remove

    session = get_session(mode)
    mask = remove(Image.fromarray(rgb), session=session, only_mask=True, post_process_mask=mode == "pixel")
    mask_arr = np.asarray(mask.convert("L"), dtype=np.uint8)
    if mask_arr.shape != rgb.shape[:2]:
        mask_arr = np.asarray(Image.fromarray(mask_arr).resize((rgb.shape[1], rgb.shape[0]), Image.Resampling.BILINEAR))
    return mask_arr


def loaded_models() -> list[str]:
    return sorted(_sessions)
