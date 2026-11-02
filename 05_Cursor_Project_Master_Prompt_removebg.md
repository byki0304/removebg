# Cursor Agent 마스터 프로젝트 개발 지시서 (v2.0)
> **프로젝트명:** removebg / SpriteCut AI Studio v2.0  
> **목적:** Cursor (Composer / Agent 모드)에 이 지시서를 그대로 전달하여, 'BizApp Detailed App Development Plan v2.0' 및 'BizApp Design Doc v2.0' 기반의 초고정밀 AI 배경 제거 및 투명 에셋 변환 프로그램 전체 코드를 100% 자동 구현  
> **작성일:** 2026-11-01  

---

## 1. System Role & Execution Goal

**Role:** You are a Principal Software Architect and Lead AI Systems Engineer.
**Task:** Build the complete codebase for **'SpriteCut AI Studio' (removebg v2.0)**.
**Key Mandate:** 
1. Follow the specifications defined in `BizApp Detailed App Development Plan v2.0` and `BizApp Design Doc v2.0` with 100% accuracy.
2. Every file name, variable, function, DB schema, API endpoint, and state key MUST be written in **100% English**.
3. All user-facing UI text MUST use the **i18n dictionary switcher** supporting **Korean (Default), English, and Japanese**.
4. Deliver a robust **Dual-Target Architecture**:
   - **Target A (Desktop Offline App):** Electron + React 19 + Node.js `sharp` + Python FastAPI Sidecar (Local GPU/CPU inference, $0 API cost).
   - **Target B (Web/Mobile Cloud SaaS):** Next.js 15 (App Router) + Supabase (Auth/DB/pg_cron) + GCP Cloud Run GPU Container + Google Cloud Storage (GCS) with 72-Hour TTL.

---

## 2. Project Technology Stack & Directory Structure

### 2.1 Tech Stack
- **Frontend / Desktop Framework:** Next.js 15+ (React 19), Electron 33+, Tailwind CSS v4, Framer Motion, Lucide Icons, HTML5 Canvas API
- **Image Processing Engine (Node.js):** `sharp`, `gifuct-js`, `jszip`
- **AI & Computer Vision Engine (Python):** Python 3.11+, PyTorch, OpenCV (`cv2`), Pillow (`PIL`), FastAPI, Uvicorn, ONNX Runtime
- **SOTA AI Models:** BiRefNet, BRIA RMBG 2.0, IS-Net (Anime-Seg), ViTMatte (Alpha Matting), Real-ESRGAN (2x Super-Resolution)
- **Database & Cloud Backend:** Supabase (PostgreSQL + `pg_cron` + Realtime), Google Cloud Storage (GCS Lifecycle Rule), GCP Cloud Run (NVIDIA L4/T4 Container)

### 2.2 Repository Directory Structure
```text
removebg-spritecut/
├── apps/
│   ├── desktop/                 # Electron Desktop Wrapper
│   │   ├── src/
│   │   │   ├── main/            # Electron Main Process (aiBridge.js, sidecarLauncher.js)
│   │   │   ├── preload/         # Context Bridge
│   │   │   └── renderer/        # Shared Next.js Frontend UI
│   │   ├── python_sidecar/      # Python FastAPI Sidecar Engine
│   │   │   ├── sidecar_server.py
│   │   │   ├── model_loader.py
│   │   │   ├── pipeline.py
│   │   │   └── requirements.txt
│   │   └── package.json
│   └── web/                     # Next.js 15 Web/Mobile Cloud App
│       ├── src/
│       │   ├── app/             # App Router (/intro, /auth, /, /api/remove-bg)
│       │   ├── components/      # UI Components (DropZone, Queue, Simulator, BrushCanvas)
│       │   ├── lib/             # Supabase Client, i18n, Sharp Utilities
│       │   └── types/           # TypeScript Types
│       ├── supabase/            # Migrations & pg_cron DDL
│       └── gcp/                 # Dockerfile & Cloud Run config
├── packages/
│   └── shared/                  # Common TypeScript Types & i18n Dictionaries
├── package.json
└── turbo.json
```

---

## 3. Core Image Conversion & 12-Step AI Pipeline Specification

### 3.1 Input / Output Standards
- **Accepted Formats:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.bmp`, `.gif` (Case-insensitive)
- **Limits:** Max 30MB per file, batch limit up to 30 files or 200MB per request.
- **Output Formats:** Lossless Transparent `.png` or `.webp` (User selectable). EXIF metadata MUST be stripped upon export.

### 3.2 GIF Smart Branching Logic
Use `gifuct-js` to parse the GIF binary header and evaluate frame count (N):
1. **Static GIF (N = 1):** Process through the standard transparent background removal pipeline and export as PNG/WebP.
2. **Animated GIF (N > 1):** Extract Frame 0 (first frame) as an RGBA bitmap patch, apply transparent background removal, and export as a static transparent PNG/WebP file.

### 3.3 12-Step Master AI & Mathematical Pipeline
Implement the following execution pipeline in Python (`pipeline.py`) and Node.js (`aiBridge.js`):

1. **Format Normalization:** Decode input stream into 32-bit RGBA memory buffer.
2. **EXIF Rotation Correction:** Auto-orient pixels based on EXIF tag.
3. **Guided Super-Resolution:** If image resolution <= 512x512, apply Real-ESRGAN 2x upscaling to prevent jagged edges on thin hair or branches.
4. **AI Core Segmentation:**
   - Default/Character/Fixture: **BiRefNet** or **BRIA RMBG 2.0**
   - 2D Illustration / Anime / Pixel Art: **IS-Net (Anime-Seg)** (preserves inner holes between arms, chair legs, branches).
5. **Alpha Matting (ViTMatte):** Generate a 10px boundary Trimap and compute fine alpha values (0 < alpha < 255).
6. **Color Decontamination (Defringing) Formula [CRITICAL]:**
   Eliminate halo edge bleed without pixel erosion (0px loss of thin hair/branches) using the mathematical formula:
   F_clean = clip((I - (1 - alpha) * B) / max(alpha, epsilon), 0, 255)
   Where I is pixel RGB, B is estimated background color (default white [255, 255, 255]), alpha is normalized alpha [0, 1], and epsilon = 1e-5.
7. **Bottom Shadow Removal:** Detect and merge soft floor gradient shadows into the background mask.
8. **Alpha Thresholding:** Clean residual ghost pixels (alpha < 5 -> alpha = 0, RGB = [0, 0, 0]).
9. **Canvas Bounding Box Mode Selection:**
   - **Mode 1 (Auto-Trim):** Scan non-zero alpha boundary (xmin, ymin, xmax, ymax), crop tight bounding box, and apply 2px safety padding.
   - **Mode 2 (Original Canvas):** Retain exact original resolution (W x H) and center pivot point.
10. **In-Game Background Verification:** Send result RGBA buffer to the frontend preview simulator.
11. **Lossless Encoding:** Encode using Sharp (png({ compressionLevel: 9 }) or webp({ lossless: true })).
12. **ZIP Archiving:** Package batch outputs using jszip with original filenames preserved.

---

## 4. Database Schema, Cloud Architecture & 72-Hour Auto-Delete (TTL)

### 4.1 Supabase Schema & pg_cron DDL
Create `supabase/migrations/20261101_init_jobs.sql`:

```sql
-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Jobs Table
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_file_name TEXT NOT NULL,
    original_file_url TEXT NOT NULL,
    result_file_url TEXT,
    status TEXT CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')) DEFAULT 'QUEUED',
    options JSONB DEFAULT '{"autoTrim": true, "padding": 2, "defringing": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours')
);

-- RLS Policies
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own jobs" ON public.jobs
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Hourly Cleanup Job (72-Hour TTL)
SELECT cron.schedule(
    'prune-expired-jobs-hourly',
    '0 * * * *',
    $$ DELETE FROM public.jobs WHERE expires_at < NOW(); $$
);
```

### 4.2 GCS Object Lifecycle Rule (`gcp/lifecycle.json`)
```json
{
  "lifecycle": {
    "rule": [
      {
        "action": { "type": "Delete" },
        "condition": {
          "age": 3,
          "isLive": true
        }
      }
    ]
  }
}
```

---

## 5. Implementation Code Templates

### 5.1 Python FastAPI Sidecar Engine (`apps/desktop/python_sidecar/sidecar_server.py`)
```python
import io
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response
from PIL import Image

app = FastAPI(title="SpriteCut AI Engine")

def apply_color_decontamination(img_rgba: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    # Mathematical Foreground Color Decontamination Formula
    b, g, r, a = cv2.split(img_rgba)
    alpha_norm = a.astype(np.float32) / 255.0
    bg_color = np.array([255.0, 255.0, 255.0], dtype=np.float32) # Default white background
    
    img_rgb = cv2.merge([r, g, b]).astype(np.float32)
    alpha_3d = np.dstack([alpha_norm] * 3)
    
    fg_clean = (img_rgb - (1.0 - alpha_3d) * bg_color) / np.maximum(alpha_3d, 1e-5)
    fg_clean = np.clip(fg_clean, 0, 255).astype(np.uint8)
    
    r_c, g_c, b_c = cv2.split(fg_clean)
    return cv2.merge([b_c, g_c, r_c, a])

@app.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    apply_defringing: bool = Form(True)
):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    np_img = np.array(image)
    
    # AI Mask Generation (BiRefNet / Threshold fallback)
    gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
    _, alpha_mask = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Alpha Thresholding (remove ghost pixels alpha < 5)
    alpha_mask[alpha_mask < 5] = 0
    
    rgba = cv2.cvtColor(np_img, cv2.COLOR_RGB2RGBA)
    rgba[:, :, 3] = alpha_mask
    
    if apply_defringing:
        rgba = apply_color_decontamination(rgba, alpha_mask)
        
    is_success, buffer = cv2.imencode(".png", rgba)
    return Response(content=buffer.tobytes(), media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
```

### 5.2 Node.js Sharp Bridge (`apps/desktop/src/main/aiBridge.js`)
```javascript
const axios = require('axios');
const FormData = require('form-data');
const sharp = require('sharp');

async function processImagePipeline(inputBuffer, options = {}) {
    // 1. Sharp Preprocessing & EXIF Auto-Orient
    const normalizedBuffer = await sharp(inputBuffer).rotate().toBuffer();
    
    // 2. Request Python FastAPI Sidecar AI Engine
    const formData = new FormData();
    formData.append('file', normalizedBuffer, { filename: 'input.jpg' });
    formData.append('apply_defringing', options.defringing ? 'true' : 'false');
    
    const response = await axios.post('http://localhost:8000/remove-bg', formData, {
        headers: formData.getHeaders(),
        responseType: 'arraybuffer'
    });
    
    let resultBuffer = Buffer.from(response.data);
    let sharpInstance = sharp(resultBuffer);
    
    // 3. Auto-Trim & Safety Padding
    if (options.autoTrim) {
        sharpInstance = sharpInstance.trim();
    }
    
    if (options.padding && options.padding > 0) {
        sharpInstance = sharpInstance.extend({
            top: options.padding,
            bottom: options.padding,
            left: options.padding,
            right: options.padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
    }
    
    return await sharpInstance.png({ compressionLevel: 9 }).toBuffer();
}

module.exports = { processImagePipeline };
```

---

## 6. UI/UX & K-D-Hunter Dark Neon Styling Specifications

### 6.1 Design Tokens (`tailwind.config.js`)
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        obsidian: '#0B0C10',
        surface: '#12131C',
        'neon-cyan': '#00F0FF',
        'vivid-magenta': '#FF0055',
        'electric-purple': '#9D00FF',
        'glass-panel': 'rgba(22, 24, 36, 0.8)',
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 240, 255, 0.5)',
        'glow-magenta': '0 0 15px rgba(255, 0, 85, 0.5)',
      },
      backdropBlur: {
        glass: '12px',
      }
    }
  }
}
```

### 6.2 Responsive 3-Frame Layout Requirements
1. **Desktop (w >= 1024px):**
   - Left Sidebar (280px): Canvas option toggles (Auto-Trim / Original), AI precision selector, i18n switcher.
   - Center Workspace: Interactive DropZone, Canvas Preview Simulator, Touch-Up Brush Toolbar.
   - Right Sidebar: Batch Queue, Progress Indicator, 72h Countdown Timer, ZIP Export Button.
2. **Mobile Portrait (w < 1024px & Portrait):**
   - Top Compact Header + Bottom Navigation Bar (64px: `[Convert]` `[Simulator]` `[Queue]`).
3. **Mobile Landscape (w < 1024px & Landscape):**
   - Slim Header (48px) + Bottom Bar (56px) + 2-Column Asset Grid.

### 6.3 In-Game Background Simulator & Touch-Up Brush Component
Implement `components/SimulatorCanvas.tsx`:
- **6 Background Modes:** `checkerboard`, `black` (#000), `white` (#FFF), `magenta` (#FF00FF), `grass` (2D Grass Tile), `dungeon` (Dungeon Stone Tile).
- **Touch-Up HTML5 Canvas Brush:**
  - `Restore (+)` mode: Paints original alpha back into selected drag region.
  - `Erase (-)` mode: Clears alpha to 0 in selected drag region.
  - Brush Size Slider: 5px ~ 100px.

### 6.4 i18n Dictionary (`packages/shared/i18n.ts`)
```typescript
export const translations = {
  ko: {
    app_title: "SpriteCut AI Studio - 초고정밀 AI 배경 제거",
    dropzone_prompt: "이미지 또는 GIF 파일을 드래그하거나 클릭하세요.",
    option_auto_trim: "삭제된 공간 제거 (Auto-Trim + 2px 패딩)",
    option_original_canvas: "원본 캔버스 규격 유지",
    ttl_warning: "🔒 모든 파일은 보안을 위해 72시간 후 자동 파기됩니다.",
    simulator_title: "인게임 배경 시뮬레이터",
  },
  en: {
    app_title: "SpriteCut AI Studio - Precision AI Background Remover",
    dropzone_prompt: "Drag & drop image or GIF files here, or click to browse.",
    option_auto_trim: "Auto-Trim Blank Space (Tight Box + 2px Padding)",
    option_original_canvas: "Keep Original Canvas Size & Pivot",
    ttl_warning: "🔒 All files are automatically deleted after 72 hours.",
    simulator_title: "In-Game Background Simulator",
  },
  ja: {
    app_title: "SpriteCut AI Studio - 超高精度 AI 背景削除",
    dropzone_prompt: "画像またはGIFファイルをドラッグするかクリックしてください。",
    option_auto_trim: "余白自動カット (Auto-Trim + 2px パディング)",
    option_original_canvas: "元のキャンバスサイズを維持",
    ttl_warning: "🔒 すべてのファイルは72時間後に自動削除されます。",
    simulator_title: "インゲーム背景シミュレーター",
  }
};
```

---

## 7. Step-by-Step Execution Plan for Cursor Composer

Execute the following stages in sequence:

1. **Stage 1 (Setup Monorepo & Dependencies):**
   Initialize Turborepo, install dependencies (`sharp`, `axios`, `gifuct-js`, `jszip`, `framer-motion`, `@supabase/supabase-js`, `tailwindcss`).
2. **Stage 2 (Python FastAPI Sidecar):**
   Build `sidecar_server.py` with OpenCV color decontamination, BiRefNet loader, and thresholding.
3. **Stage 3 (Node.js & Sharp Pipeline):**
   Implement `aiBridge.js` handling GIF Frame 0 extraction, EXIF auto-rotation, Auto-Trim cropping, and 2px padding.
4. **Stage 4 (Supabase & GCP Backend):**
   Set up `jobs` table schema, RLS, `pg_cron` hourly cleanup, and Cloud Run Docker container.
5. **Stage 5 (Next.js Frontend & UI Fixtures):**
   Build K-D-Hunter dark neon theme layout, DropZone, In-Game Simulator, and HTML5 Touch-Up Canvas Brush.
6. **Stage 6 (Packaging & Verification):**
   Verify desktop Electron build (`.exe`/`.dmg`) and web Next.js deployment. Ensure zero memory leaks during batch processing.

---
