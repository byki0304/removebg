"""Real-model smoke test: python scripts/smoke_test.py [ultra|standard|pixel] [image_path]

With an image path, the corner pixel is expected to be background and the center to be foreground.
"""

import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import model_loader  # noqa: E402
import pipeline  # noqa: E402

mode = sys.argv[1] if len(sys.argv) > 1 else "pixel"
if len(sys.argv) > 2:
    rgb = pipeline.load_rgb(Path(sys.argv[2]).read_bytes())
else:
    rgb = np.full((256, 256, 3), 255, dtype=np.uint8)
    yy, xx = np.mgrid[:256, :256]
    rgb[(yy - 110) ** 2 + (xx - 128) ** 2 < 45**2] = [240, 190, 150]
    rgb[150:230, 90:166] = [40, 90, 220]

start = time.perf_counter()
alpha = model_loader.predict_alpha(rgb, mode)
elapsed = time.perf_counter() - start
png = pipeline.finish(rgb, alpha, defringing=True, pixel_mode=mode == "pixel")

h, w = alpha.shape
corner, body = int(alpha[5, 5]), int(alpha[h // 2, w // 2])
print(f"mode={mode} model={model_loader.MODEL_BY_MODE[mode]} time={elapsed:.2f}s corner_alpha={corner} body_alpha={body} png={len(png)}B")
out = Path(__file__).resolve().parent.parent / "models" / f"smoke_{mode}.png"
out.write_bytes(png)
print(f"wrote {out}")
sys.exit(0 if corner < 30 and body > 200 else 1)
