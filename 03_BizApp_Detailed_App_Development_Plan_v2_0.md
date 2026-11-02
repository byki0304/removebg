### 업무용 프로그램 개발 표준 세부 기획서
("BizApp Detailed App Development Plan v2.0")

**버전:** 2.0  
**기준 제품:** removebg / SpriteCut AI Studio  
**작성 기준일:** 2026-11-02  
**적용 범위:** 
1. **Local Desktop Mode**: Electron + React (TypeScript) + Node.js (Sharp) + Python (FastAPI / PyTorch / OpenCV / BiRefNet / ONNX GPU Sidecar)
2. **Web / Mobile SaaS Mode**: Next.js 15 (React 19, App Router) + Tailwind CSS v4 + Framer Motion + Supabase DB (pg_cron) + Google Cloud Storage (GCS) + GCP Cloud Run (GPU Serverless)  
**코드 기본 언어:** 필드명, 함수명, 변수명, 파일명, DB 컬렉션/테이블/필드, API 경로, 오류 코드, 이벤트 코드는 **100% 영문(English)**으로 구현한다. 화면에 노출되는 UX 텍스트는 **한국어(Default), English, Japanese** 3개 언어로 세팅하며 즉시 전환 스위처를 제공한다.

---

### v1.4에서 v2.0으로의 변경 및 확정 내역 (Changelog)

1. **프로젝트 목적 및 명칭 확장**:
   * 프로젝트명을 **removebg / SpriteCut AI Studio**로 확정한다.
   * 단순 포맷 변환을 넘어, 게임 개발 시 캐릭터, 아이템, 픽스처의 섬세한 머리카락, 털, 나뭇가지, 반투명 유리까지 손실 없이 **초고정밀 배경 제거(Background Removal)** 및 무손실 투명 `.png` / `.webp` 변환을 최우선 목적으로 한다.

2. **다양한 입력 포맷 지원 및 GIF 스마트 판별/분기 처리**:
   * 지원 입력 포맷: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.bmp`, `.gif` (대소문자 구분 없음).
   * **GIF 처리 로직**: `gifuct-js` 라이브러리로 프레임 수($N$)를 판별한다.
     * **정적 GIF ($N = 1$)**: 전체 배경을 완전히 투명하게 처리 후 PNG/WebP로 변환.
     * **동적/애니메이션 GIF ($N > 1$)**: 첫 번째 프레임(Frame 0)의 비트맵 데이터를 추출하여 배경을 제거하고 정적 투명 PNG/WebP로 변환.

3. **여백 재단(Auto-Trim) 및 원본 규격 유지 선택 옵션**:
   * **삭제된 공간 제거 옵션 (Auto-Trim)**: 투명 여백을 Tight Bounding Box로 자동 자르고 외곽선 깨짐 방지용 $2	ext{ px}$ 안전 패딩(Padding)을 적용.
   * **삭제된 공간 유지 옵션 (Original Canvas)**: 원본 해상도와 오브젝트의 중심점(Pivot) 캔버스 위치를 100% 그대로 유지한 채 배경만 투명화.

4. **12단계 정밀 AI 누끼 & 후처리 파이프라인 탑재**:
   * **사전 가이드 업스케일링**: Real-ESRGAN 기반 $2 \sim 4$배 슈퍼샘플링(SSAA)으로 저해상도 JPG 외곽선 계단 현상 방지.
   * **SOTA AI 코어 엔진**: BiRefNet, BRIA RMBG 2.0, IS-Net (Anime-Seg) 하이브리드 라우팅.
   * **정밀 알파 매팅 (ViTMatte)**: 경계 영역 Trimap 생성 및 미세 알파값($0 < lpha < 255$) 정밀 보정.
   * **수학적 전경색 복원 (Color Decontamination / Defringing)**: 픽셀을 깎아내는 침식(Erosion) 방식이 아닌, 배경색($B$) 성분을 수학적으로 제거하여 머리카락과 선화를 훼손하지 않고 흰색/검은색 테두리(Halo)만 제거.
     $$F_{	ext{clean}} = 	ext{clip}\left( rac{I - (1 - lpha)B}{\max(lpha, \epsilon)}, 0, 255 ight)$$
   * **알파 클리닝 (Alpha Thresholding)**: $lpha < 5$ 유령 픽셀을 $lpha = 0$ 및 $	ext{RGB}=(0,0,0)$으로 완전 초기화.

5. **하이브리드 아키텍처 (Desktop Offline GPU + Cloud Web/Mobile SaaS)**:
   * **Desktop Mode**: Electron + Node.js (Sharp) + Python FastAPI Sidecar (Localhost API 연동, GPU 가속, 서버 비용 $0).
   * **Web / Mobile SaaS Mode**: Next.js 15 + Supabase DB + GCP Cloud Run (GPU Serverless) + GCS.

6. **업로드 용량 제한 및 72시간 순차적 자동 파기 (TTL) 정책**:
   * 업로드 용량 제한: 이미지 파일당 최대 $25 \sim 30	ext{ MB}$, GIF 최대 $50	ext{ MB}$, 1회 배치 최대 $200	ext{ MB}$ / $30$개, $4096	ext{ px}$ 초과 시 클라이언트 자동 다운스케일링.
   * **72시간 자동 파기**: 저작권 보호 및 용량 관리를 위해 GCS Object Lifecycle Management ($3	ext{ days}$) 및 Supabase `pg_cron` 스케줄러로 업로드/변환 파일 및 DB 레코드를 72시간 후 자동 영구 삭제.

7. **게임 전용 UX 검수 및 수정 도구**:
   * **인게임 배경 시뮬레이터**: 투명 체커보드, 순수 검정(#000), 순수 흰색(#FFF), 네온 마젠타(#FF00FF), 초원 잔디 및 던전 타일맵 배경 위 실시간 누끼 검수.
   * **수동 마스킹 보정 브러시**: HTML5 Canvas 기반 터치업 지우개(-) 및 복구(+) 브러시 제공.

8. **비주얼 테마 컨셉 ('케데헌' 애니메이션 바이브)**:
   * 옵시디언 다크(#0B0C10), 네온 시안(#00F0FF), 비비드 마젠타(#FF0055), 일렉트릭 퍼플(#9D00FF) 발광(Glow) 및 글래스모피즘(backdrop-filter: blur(12px)) 스타일링, 6초 인트로 애니메이션 비디오 적용.

---

### 0. 문서 정보

| ID | 구분 | 항목 | 기입 상세 내용 |
| --- | --- | --- | --- |
| B-00-01 | 필수 | 프로그램명 (영문 / 한글) | **removebg / SpriteCut AI Studio** (화면 로고: SpriteCut AI) |
| B-00-02 | 필수 | 문서 버전 / 날짜 | **2.0 / 2026-11-02** |
| B-00-03 | 필수 | 한 줄 약속 | 미니게임 개발을 위한 초고정밀 AI 배경 제거 및 투명 PNG/WebP 에셋 변환 솔루션 |
| B-00-04 | 기본 | 플랫폼 | Cross-Platform (Desktop Offline App: Windows/macOS + Web/Mobile SaaS PWA) |
| B-00-05 | 기본 | 프론트엔드 | Electron / Next.js 15 (React 19), Tailwind CSS v4, Framer Motion, HTML5 Canvas API |
| B-00-06 | 기본 | 백엔드 & AI 엔진 | Node.js (Sharp), Python FastAPI Sidecar (PyTorch, OpenCV, BiRefNet, ViTMatte), GCP Cloud Run GPU |
| B-00-07 | 필수 | 주 저장소 & DB | Supabase (PostgreSQL, Realtime, Auth, pg_cron) & Google Cloud Storage (GCS) |
| B-00-08 | 기본 | 배포 파이프라인 | GitHub Repositories -> Cursor IDE -> Vercel / GCP Cloud Run / Electron Builder |
| B-00-09 | 필수 | MVP 범위 | JPG/PNG/WebP/AVIF/GIF/BMP 지원, GIF 스마트 판별, Auto-Trim/Original Canvas 선택, 12단계 정밀 누끼, 72시간 TTL 자동삭제, 3개 프레임 UI, 3개 국어 i18n |
| B-00-10 | 필수 | 핵심 보안 정책 | 72시간 후 원본 및 변환 파일 스토리지 및 DB 영구 자동 파기 (User Privacy & Copyright First) |

---

### 1. 아이디어 및 핵심 동작

#### 핵심 시나리오
게임 개발자 및 아티스트가 캐릭터, 아이템, 픽스처 이미지(JPG, PNG, WebP, AVIF, GIF, BMP)를 업로드하면, SOTA AI 모델(BiRefNet/BRIA)과 수학적 전경색 복원(Color Decontamination) 알고리즘을 통해 머리카락, 털, 나뭇가지 하나까지 손실 없이 배경을 제거하고, Auto-Trim 또는 원본 캔버스 크기를 선택하여 투명 PNG/WebP로 일괄 다운로드한다.

#### 메인 UX 흐름 (Screen Flow)
1. **Intro Screen (/intro)**: 6초간 재생되는 '케데헌' 스타일 애니메이션 비디오 (Skip 및 Mute 제공).
2. **Login Selection Screen (/auth)**: 인증 선택 ([Google 로그인], [이메일/비밀번호], [휴대폰 인증], [회원가입], [계정 없이 사용(Guest)]).
3. **Main Workspace Screen (/)**:
   * **[배경 제거 (Remove Background)]** 메인 탭 우선 노출.
   * 드래그 앤 드롭 존 및 파일 탐색기 업로드.
   * 캔버스 옵션 선택 (Auto-Trim + Padding vs Original Canvas).
   * 포맷 선택 (.png vs .webp) 및 AI 정밀도 모드 설정.
4. **Interactive Editor & Preview Screen**:
   * 인게임 배경 시뮬레이터 (체커보드, 검정, 흰색, 네온 마젠타, 잔디, 던전 타일).
   * 수동 보정 마스크 브러시 (+/- touch-up).
5. **Export & Batch Download Screen**:
   * 개별 파일 다운로드 및 JSZip 일괄 다운로드.
   * 72시간 자동 파기 카운트다운 안내 문구 노출.

---

### 2. 브랜드 및 비주얼 테마 ('케데헌' 애니메이션 바이브)

* **컬러 팔레트 (Color Palette)**:
  * **Background Base**: 딥 옵시디언 (#0B0C10, #12131C)
  * **Accent & Glow**: 네온 시안 (#00F0FF), 비비드 마젠타 (#FF0055), 일렉트릭 퍼플 (#9D00FF)
  * **Container**: 반투명 다크 글래스모피즘 (#161824 / backdrop-filter: blur(12px))
  * **Border & Stroke**: 네온 발광 테두리 및 에너제틱 글로우 펄스
* **UI Fixtures**:
  * Drag & Drop Zone: 마우스 진입 시 #00F0FF / #FF0055 에너지 파동 인터랙션.
  * Neon Glow Buttons: Framer Motion 기반 클릭/호버 시 발광 증폭.

---

### 3. 기술 스택 및 아키텍처 비교

| 레이어 | Desktop Offline Mode | Web / Mobile SaaS Mode |
| --- | --- | --- |
| **GUI Framework** | Electron + React (Vite) | Next.js 15 (App Router, React 19) |
| **Styling & Motion** | Tailwind CSS v4 + Framer Motion | Tailwind CSS v4 + Framer Motion |
| **I/O & Image Preprocessing** | Node.js + Sharp | Node.js (Vercel Serverless / Sharp) |
| **AI Inference Engine** | Local Python FastAPI Sidecar (ONNX/CUDA) | GCP Cloud Run (GPU Serverless Container) |
| **Database & Auth** | Local Storage / Supabase Auth | Supabase (Auth, Realtime, pg_cron) |
| **File Storage** | Local Disk File System | Google Cloud Storage (GCS) |
| **Auto-Delete (72h TTL)** | Local Temp Cleanup | GCS Lifecycle Rule (3 days) + Supabase pg_cron |

---

### 4. 12단계 정밀 AI 누끼 & 후처리 파이프라인

```
[입력 파일 업로드] ──> [포맷/GIF 프레임 판별] ──> [Real-ESRGAN 업스케일링]
                                                       │
[Auto-Trim / Padding] <── [Alpha Thresholding] <── [Color Decontamination] <── [BiRefNet / ViTMatte]
          │
          ▼
[PNG/WebP 무손실 인코딩] ──> [인게임 시뮬레이터 검수] ──> [일괄 ZIP 다운로드]
```

1. **포맷 및 GIF 판별**: `gifuct-js`로 $N$ 분석 ($N=1$ 전체 정적 변환, $N>1$ Frame 0 추출).
2. **사전 가이드 업스케일링**: $512	ext{ px}$ 이하 이미지는 Real-ESRGAN $2	ext{x}$ 확장 후 AI 마스킹 수행.
3. **AI 세그멘테이션**: BiRefNet / BRIA RMBG 2.0 / IS-Net (Anime) 하이브리드 엔진 추론.
4. **트라이맵 & 알파 매팅**: ViTMatte로 머리카락, 털, 나뭇가지, 반투명 경계 알파값($0 < lpha < 255$) 복원.
5. **수학적 전경색 복원 (Color Decontamination)**: 픽셀 침식 없이 경계 픽셀에 섞인 배경색 제거.
6. **알파 클리닝**: $lpha < 5$ 유령 픽셀 초기화.
7. **규격 재단 (Auto-Trim & Padding)**: 사방 투명 여백 재단 및 $2	ext{ px}$ 안전 패딩 부여 (옵션 선택 시).

---

### 5. 반응형 3개 프레임 레이아웃 규격

* **Desktop ($w \ge 1024	ext{ px}$)**: Left Sidebar (280px) + Top/Center Main Workspace + Right Batch Queue.
* **Mobile Portrait ($w < 1024	ext{ px}$, Portrait)**: Top Header + Bottom Navigation Bar (64px) + Touch Friendly Canvas.
* **Mobile Landscape ($w < 1024	ext{ px}$, Landscape)**: Compact Top Header (48px) + Bottom Navigation Bar (56px) + 2열 그리드 워크스페이스.

---

### 6. 파일 업로드, 용량 및 72시간 자동 파기 (TTL) 스펙

* **단일 파일 용량**: 정적 이미지 최대 $30	ext{ MB}$, GIF 최대 $50	ext{ MB}$.
* **배치 업로드**: 1회 최대 $30$개 파일 / 총 $200	ext{ MB}$ 이하.
* **해상도**: 최대 $4096	ext{ px}$ (초과 시 클라이언트 자동 비율 다운스케일링).
* **72시간 자동 파기 (TTL)**:
  * **GCS Lifecycle Rule**: `Age: 3 days` 조건 충족 시 Google Cloud 인프라에서 파일 영구 삭제.
  * **Supabase `pg_cron`**: 매시간 `expires_at < NOW()` 조건의 DB 메타데이터 자동 정기 삭제.

---

### 7. 계정, DB 스키마 및 Cloud 인프라

#### Supabase `jobs` 테이블 DDL
```sql
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_file_name TEXT NOT NULL,
    original_file_url TEXT NOT NULL,
    result_file_url TEXT,
    status TEXT CHECK (status IN ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED')) DEFAULT 'QUEUED',
    options JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours')
);

-- 72시간 자동 파기 pg_cron 스케줄러 등록
SELECT cron.schedule(
    'prune-expired-jobs-hourly',
    '0 * * * *',
    $$ DELETE FROM public.jobs WHERE expires_at < NOW(); $$
);
```

---

### 8. i18n 다국어 사전 (ko, en, ja)

| Dictionary Key | 한국어 (ko) | English (en) | Japanese (ja) |
| --- | --- | --- | --- |
| `app.title` | SpriteCut AI Studio - 초고정밀 AI 배경 제거 | SpriteCut AI Studio - Precision AI Background Remover | SpriteCut AI Studio - 초高精度 AI 背景削除 |
| `upload.dropzone` | 이미지 또는 GIF 파일을 드래그하거나 클릭하세요 | Drag & drop image or GIF files here, or click to browse | 이미지 또는 GIF 파일을 드래그하거나 클릭하세요 |
| `canvas.auto_trim` | 삭제된 공간 제거 (Auto-Trim + 2px 패딩) | Auto-Trim Blank Space (Tight Box + 2px Padding) | 余白自動カット (Auto-Trim + 2px パディング) |
| `canvas.original` | 원본 캔버스 규격 유지 | Keep Original Canvas Size & Pivot | 元のキャンバスサイズを維持 |
| `ttl.notice` | 🔒 모든 파일은 보안을 위해 72시간 후 자동 파기됩니다. | 🔒 All files are automatically deleted after 72 hours. | 🔒 すべてのファイルは72時間後に自動削除されます。 |

---

### 9. 배포 파이프라인 및 CI/CD

1. **GitHub Main Branch**: 코드 푸시 시 Vercel 및 GCP Cloud Run 자동 빌드.
2. **Electron Desktop Builder**: GitHub Actions CI를 통해 `.exe` (Windows) 및 `.dmg` (macOS) 릴리즈 자산 자동 생성.
3. **Cursor IDE 연동**: 개발 및 디버깅은 `.cursorrules` 표준 가이드라인에 따라 진행.