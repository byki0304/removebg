import io

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

import model_loader
import pipeline
import sidecar_server


def _png(rgb: np.ndarray) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(rgb).save(buf, format="PNG")
    return buf.getvalue()


def _sprite() -> tuple[np.ndarray, np.ndarray]:
    rgb = np.full((40, 60, 3), 255, dtype=np.uint8)
    rgb[10:30, 20:40] = [200, 30, 60]
    alpha = np.zeros((40, 60), dtype=np.uint8)
    alpha[10:30, 20:40] = 255
    return rgb, alpha


def test_border_color_is_background():
    rgb, _ = _sprite()
    assert pipeline.estimate_border_color(rgb).tolist() == [255.0, 255.0, 255.0]


def test_decontamination_removes_white_halo():
    rgb = np.array([[[227, 142, 157]]], dtype=np.uint8)  # 50% of (200,30,60) over white
    alpha = np.array([[128]], dtype=np.uint8)
    out = pipeline.decontaminate_colors(rgb, alpha, np.array([255, 255, 255], dtype=np.float32))
    assert np.allclose(out[0, 0], [200, 30, 60], atol=3)


def test_ghost_pixels_are_cleared():
    rgb, alpha = _sprite()
    alpha[0, 0] = 3
    rgba = pipeline.compose_rgba(rgb, alpha)
    assert rgba[0, 0].tolist() == [0, 0, 0, 0]
    assert rgba[15, 25].tolist() == [200, 30, 60, 255]


def test_pixel_mode_binarizes_alpha():
    assert pipeline.binarize_alpha(np.array([0, 127, 128, 255], dtype=np.uint8)).tolist() == [0, 0, 255, 255]


def test_load_rgb_caps_size_and_reads_first_frame():
    big = np.zeros((10, 5000, 3), dtype=np.uint8)
    assert max(pipeline.load_rgb(_png(big)).shape[:2]) == pipeline.MAX_SIDE


@pytest.fixture
def client(monkeypatch):
    def fake_predict(rgb, mode):
        return _sprite()[1]

    monkeypatch.setattr(model_loader, "predict_alpha", fake_predict)
    return TestClient(sidecar_server.app)


def test_remove_bg_endpoint_returns_rgba_png(client):
    rgb, _ = _sprite()
    res = client.post(
        "/remove-bg",
        files={"file": ("input.png", _png(rgb), "image/png")},
        data={"apply_defringing": "true", "ai_mode": "ultra"},
    )
    assert res.status_code == 200
    out = np.asarray(Image.open(io.BytesIO(res.content)))
    assert out.shape == (40, 60, 4)
    assert out[0, 0, 3] == 0 and out[15, 25, 3] == 255


def test_missing_model_returns_503(monkeypatch):
    def unavailable(rgb, mode):
        raise model_loader.ModelUnavailableError("rembg is not installed")

    monkeypatch.setattr(model_loader, "predict_alpha", unavailable)
    res = TestClient(sidecar_server.app).post("/remove-bg", files={"file": ("a.png", _png(_sprite()[0]), "image/png")})
    assert res.status_code == 503
