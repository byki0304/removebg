"""Model-agnostic post-processing steps of the SpriteCut pipeline (numpy only)."""

from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageOps

GHOST_ALPHA_THRESHOLD = 5
MAX_SIDE = 4096


def load_rgb(data: bytes) -> np.ndarray:
    """Decode first frame, apply EXIF rotation, cap the long side, return HxWx3 uint8."""
    with Image.open(io.BytesIO(data)) as img:
        img.seek(0)
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
        if max(img.size) > MAX_SIDE:
            img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
        return np.asarray(img, dtype=np.uint8).copy()


def estimate_border_color(rgb: np.ndarray, band: int = 2) -> np.ndarray:
    """Median color of the outer border band — the most likely flat background."""
    h, w = rgb.shape[:2]
    b = max(1, min(band, h // 2, w // 2))
    border = np.concatenate(
        [
            rgb[:b].reshape(-1, 3),
            rgb[-b:].reshape(-1, 3),
            rgb[:, :b].reshape(-1, 3),
            rgb[:, -b:].reshape(-1, 3),
        ]
    )
    return np.median(border, axis=0).astype(np.float32)


def decontaminate_colors(rgb: np.ndarray, alpha: np.ndarray, background: np.ndarray) -> np.ndarray:
    """F_clean = clip((I - (1 - a) * B) / max(a, 1e-5), 0, 255) applied on semi-transparent edges."""
    a = (alpha.astype(np.float32) / 255.0)[..., None]
    img = rgb.astype(np.float32)
    clean = (img - (1.0 - a) * background[None, None, :]) / np.maximum(a, 1e-5)
    clean = np.clip(clean, 0, 255)
    edge = (alpha > 0) & (alpha < 255)
    out = rgb.copy()
    out[edge] = clean[edge].astype(np.uint8)
    return out


def binarize_alpha(alpha: np.ndarray, threshold: int = 128) -> np.ndarray:
    return np.where(alpha >= threshold, 255, 0).astype(np.uint8)


def compose_rgba(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Stack RGBA, dropping ghost pixels (alpha < 5 → fully transparent, RGB = 0)."""
    alpha = alpha.copy()
    alpha[alpha < GHOST_ALPHA_THRESHOLD] = 0
    rgba = np.dstack([rgb, alpha]).astype(np.uint8)
    rgba[alpha == 0, :3] = 0
    return rgba


def encode_png(rgba: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(rgba).save(buf, format="PNG", compress_level=6)
    return buf.getvalue()


def finish(rgb: np.ndarray, alpha: np.ndarray, *, defringing: bool, pixel_mode: bool) -> bytes:
    """Steps 6 + 8 of the pipeline on top of a predicted alpha mask; trim/encoding happen in Node."""
    if pixel_mode:
        alpha = binarize_alpha(alpha)
    if defringing and not pixel_mode:
        rgb = decontaminate_colors(rgb, alpha, estimate_border_color(rgb))
    return encode_png(compose_rgba(rgb, alpha))
