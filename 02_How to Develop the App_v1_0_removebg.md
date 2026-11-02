# 🎮 미니게임 에셋 특화 초고품질 AI 배경 제거 앱 개발 기획서("How to Develop the App v1")

**프로젝트명(가칭):** SpriteCut AI Studio (스프라이트컷 AI 스튜디오)

**문서 버전:** v1.0

**주요 타겟:** 미니게임 개발자, 인디게임 아티스트, 2D/3D 에셋 디자이너

**핵심 목적:** 다양한 이미지 포맷(JPG, PNG, WebP, AVIF, BMP, GIF)에서 캐릭터, NPC, 아이템, 설치물(Fixtures)의 배경을 완벽하게 제거하고, 미니게임 엔진에 즉시 투입 가능한 고품질 투명 PNG로 일괄 변환하는 오프라인 데스크톱 애플리케이션 구축

## 1. 업로드 문서('Brainstorm for removebg app..md') 검토 및 기술적 보완 분석

업로드해주신 문서는 1부(기본 아키텍처 및 포맷/GIF 처리 로직)와 2부(배경 제거 품질 고도화 10단계 기법)로 구성되어 있으며, 상용 서비스 이상의 핵심 포인트를 매우 정확하게 짚고 있습니다. 이를 실제 미니게임 개발 환경에 적용하기 위해 검토한 결과와 추가 보완 사항은 다음과 같습니다.

### 1.1 기존 문서의 핵심 강점 (유지 및 반영)

1. **폭넓은 포맷 수용 및 GIF 스마트 분기:** `JPG`, `JPEG`, `PNG`, `WebP`, `AVIF`, `BMP`, `GIF`를 모두 수용하며, 특히 `GIF`의 경우 프레임 수를 분석($N_{\text{frames}} > 1$)하여 정적 이미지는 즉시 처리하고 애니메이션은 첫 번째 프레임($\text{Frame}_0$)을 추출해 처리하는 워크플로우가 명확합니다.

2. **오프라인 로컬 실행 및 배치(Batch) 처리:** `Electron` 기반 데스크톱 앱으로 설계하여 API 호출 비용($\$0$)을 달성하고, $100$장 이상의 대량 이미지를 일괄 업로드하여 `ZIP`으로 묶어내는 실용적인 구조를 갖추고 있습니다.

3. **최신 SOTA(State-of-the-Art) 모델 및 후처리 파이프라인 제시:** 단순 `U2Net(rembg)` 호출의 한계를 넘어 `BiRefNet`, `BRIA RMBG`, `SAM2`, `Anime Segmentation` 분기, `Real-ESRGAN` 업스케일링, `Alpha Matting`, 외곽선 후처리, 미세 알파값($\alpha < 5$) 제거, 그림자 제거 등 고품질 달성을 위한 핵심 기술이 망라되어 있습니다.

### 1.2 미니게임 에셋 특화를 위한 5대 기술적 보완점 (기획 고도화)

기존 문서의 내용을 실제 코드로 구현하고 미니게임 품질을 극대화하기 위해 다음 5가지 기술적 과제를 보완하여 설계에 반영했습니다.

* **보완 1: 1부(Node.js)와 2부(고성능 AI 모델) 간의 아키텍처 브릿지 구축**

  * *문제점:* 1부에서 제안된 `@imgly/background-removal-node`는 간편하지만 기본 경량 모델 위주여서 2부의 `BiRefNet`, `Real-ESRGAN`, `Alpha Matting`, `Shadow Removal`을 그대로 구동하기 어렵습니다.

  * *해결책:* 프론트엔드/파일 I/O는 `Electron + React + Node.js(Sharp)`로 처리하고, AI 추론 엔진은 **`ONNX Runtime (WebGPU/DirectML/CUDA)`** 또는 내장형 **`Python FastAPI Sidecar (PyTorch/ONNX)`** 구조로 연동하여 2부의 초고품질 파이프라인을 $100\%$ 로컬 GPU 가속으로 구현합니다.

* **보완 2: 외곽선 축소(Erosion)로 인한 게임 아이템/무기 손실 방지** $\rightarrow$ **색 번짐 제거(Color Decontamination) 도입**

  * *문제점:* 2부의 $1 \sim 2\text{ px}$ 축소(`erosion`) 기법은 흰색 테두리를 없애는 데 효과적이지만, 미니게임 캐릭터의 얇은 검날, 활시위, 지팡이 끝, 안경테, 픽셀 아트의 외곽선(아우트라인)까지 함께 깎아먹는 부작용이 발생합니다.

  * *해결책:* 무작정 픽셀을 깎는 대신, 반투명 경계 픽셀에서 배경색 성분만 수학적으로 빼내는 **전경색 복원(Foreground Color Estimation / Defringing)** 알고리즘을 기본 적용하고, `erosion`은 사용자가 미세 조절($0 \sim 3\text{ px}$)할 수 있도록 개선합니다.

* **보완 3: 무분별한 업스케일링 방지** $\rightarrow$ **고해상도 가이드 매팅(Guided Matting) 적용**

  * *문제점:* $512 \times 512$ 이미지를 `Real-ESRGAN`으로 $4$배($2048 \times 2048$) 업스케일한 뒤 그대로 저장하면 파일 용량이 $16$배로 폭증하며, 픽셀 아트나 고유한 2D 화풍이 변질될 수 있습니다.

  * *해결책:* 업스케일링은 **정밀한 알파 마스크(Alpha Mask) 추출용**으로만 활용하고, 최종 출력 시에는 원본 해상도 유지 또는 $2\times / 4\times$ 업스케일 출력 여부를 선택할 수 있게 분리합니다.

* **보완 4: 미니게임 에셋 카테고리별(캐릭터/NPC/아이템/Fixtures) 맞춤 처리**

  * 설치물(의자 다리 사이, 창문 틀)이나 캐릭터(팔과 몸통 사이 공간) 내부의 갇힌 배경(Inner Holes)을 완벽히 뚫어내고, 포션이나 유리창 같은 반투명 에셋(Semi-transparent)의 투명도를 보존하는 모드를 추가합니다.

* **보완 5: 게임 엔진 즉시 투입을 위한 스프라이트 최적화 기능**

  * 배경 제거 후 남는 불필요한 투명 여백을 자동으로 잘라내는 **Auto-Trim(Tight Bounding Box)**, 외곽 패딩($2\text{ px}$ 등), 그리고 캐릭터 발밑이나 아이템 중앙으로 기준점을 맞추는 **피벗(Pivot) 정렬** 옵션을 추가하여 미니게임 개발 속도를 획기적으로 단축합니다.

## 2. 미니게임 에셋 유형별 맞춤 배경 제거 전략

미니게임에 사용되는 4대 핵심 에셋은 형태적 특성이 다르므로, 앱 내에서 자동으로(또는 탭 선택으로) 최적화된 파라미터를 적용합니다.

| 

| **에셋 유형** | **주요 특징 및 난제** | **특화 AI 모델 및 후처리 전략** | 
| **1. 캐릭터 & NPC**  (Characters & NPCs) | • 머리카락, 털, 망토 등 복잡한 외곽선  • 팔과 몸통 사이의 닫힌 공간(배경 잔류 위험)  • 2D 애니메/일러스트 화풍 비중이 높음 | • **모델:** `BiRefNet` + `IS-Net (Anime-Seg)` 하이브리드  • **후처리:** 정밀 Alpha Matting 활성화 + 전경색 복원(Defringing)으로 검은색/갈색 선화(Line-art) 보호 | 
| **2. 아이템**  (Items & Icons) | • 검, 활, 포션, 반지 등 작고 세밀한 형태  • 유리병, 마법 구슬 등 **반투명(Translucent)** 영역 존재  • 외곽선 침식(`erosion`) 시 형태 훼손 위험 | • **모델:** `BiRefNet (High-Res Mode)` + 사전 $2\times$ 업스케일링  • **후처리:** `Erosion = 0px` 고정, 반투명 보존 옵션(Glass/Potion Mode) 제공하여 $0 < \alpha < 255$ 구간 유지 | 
| **3. 설치물 & 환경**  (Fixtures & Props) | • 가구, 가로등, 나무, 울타리, 던전 기물 등  • 바닥에 닿는 \*\*그림자(Cast Shadow)\*\*가 함께 찍혀 있음  • 그물망, 창살 등 다중 타공(Multi-holes) 구조 | • **모델:** `BiRefNet` + `SAM 2` (기하학적 경계 보정)  • **후처리:** **Shadow Removal 모듈** 강제 활성화로 바닥 그림자 완전 소거 + 내부 구멍(Inner Hole) 탐지 감도 극대화 | 
| **4. 픽셀 아트 (도트)**  (Pixel Art Sprites) | • 계단식 픽셀 경계가 생명임  • 일반 AI 모델 적용 시 경계가 흐려지는(Blur) 현상 발생 | • **전용 파이프라인:** `Nearest-Neighbor` 스케일링 + 알파 채널 이진화($\alpha < 128 \Rightarrow 0, \alpha \ge 128 \Rightarrow 255$)로 칼같은 도트 경계 유지 | 

## 3. 초고품질 배경 제거 12단계 마스터 파이프라인

기존 문서의 10단계 파이프라인을 미니게임 에셋 제작에 맞춰 **12단계 마스터 파이프라인**으로 고도화한 아키텍처입니다.

```
[1. 다중 파일 업로드] (.jpg, .jpeg, .png, .webp, .avif, .bmp, .gif)
       ↓
[2. 포맷 분석 및 GIF 프레임 분기]
   ├─ 일반 이미지 ───────────────────────┐
   └─ GIF 이미지 ──> 정적(Frame = 1) ────┼─> [3. EXIF 제거 및 정규화 (RGBA 변환)]
                 └─> 동적(Frame > 1) ────┘      (첫 프레임 추출 후 합류)
       ↓
[4. AI 이미지 타입 & 해상도 자동 진단]
   ├─ 도메인 판별: 2D 일러스트/애니메 vs 3D 렌더/실사 vs 픽셀아트
   └─ 에셋 크기 판별: 저해상도(W, H < 768px) 여부 확인
       ↓
[5. 적응형 업스케일링 (Guided Super-Resolution)]
   └─ 저해상도 이미지의 경우 Real-ESRGAN (Anime/General)으로 2x~4x 고해상도 변환
       ↓
[6. 코어 AI 세그멘테이션 (다중 모델 라우팅)]
   ├─ 표준/초고품질(일반/기물): BiRefNet / BRIA RMBG 2.0
   ├─ 2D 캐릭터/NPC 특화: IS-Net (Anime Segmentation) + BiRefNet Ensemble
   └─ 정밀 기하학/아이템: SAM 2 (Segment Anything 2) 보조 마스킹
       ↓
[7. 바닥 그림자 분리 및 제거 (Shadow Detection & Removal)]
   └─ 객체 하단부 그라데이션 그림자 영역 탐지 후 배경 마스크로 편입
       ↓
[8. 트라이맵(Trimap) 생성 및 정밀 Alpha Matting]
   └─ 확실한 전경(Foreground) / 경계 미확정(Unknown) / 확실한 배경(Background) 3단계 분리 후 Closed-Form / VITMatte 연산
       ↓
[9. 외곽선 색 번짐 제거 (Color Decontamination) 및 형태 보정]
   └─ 흰색/검은색 배경 물듦(Halo) 제거 + 미세 Feathering / 선택적 Morphology(Erosion)
       ↓
[10. 미세 잔여 노이즈 클리닝 (Alpha Thresholding)]
   └─ 육안으로 안 보이는 찌꺼기 픽셀 완전 투명화 (α < 5 → α = 0, α > 250 → α = 255)
       ↓
[11. 미니게임 에셋 최적화 (Game Engine Post-Processing)]
   └─ Auto-Trim (투명 여백 자동 크롭) + 여백 패딩(Padding) + 해상도 복원
       ↓
[12. 무손실 투명 PNG 인코딩 및 일괄 ZIP 패키징]

```

### 단계별 핵심 알고리즘 및 수식 명세

#### ① GIF 정적/애니메이션 판별 및 추출 (Step 2)

* 업로드된 버퍼의 헤더와 프레임 디스크립터를 `gifuct-js`로 파싱합니다.

* 조건식: 

  $$
  \text{ Frame Count } (N) = \text{gif.frames.length}
  $$

  * $N = 1$일 때: 정적 GIF로 판별하여 즉시 디코딩 후 Step 3으로 전달합니다.

  * $N > 1$일 때: 애니메이션 GIF로 판별하여 `gif-frames` 또는 `sharp(input, { page: 0 })`를 통해 첫 번째 프레임($\text{Frame}_0$)만 무손실 비트맵으로 추출합니다. *(선택 옵션: 미니게임 개발자를 위해 모든 프레임을 각각 배경 제거하여 스프라이트 시트용 연번 PNG로 뽑아주는 확장 토글 제공)*

#### ② 고해상도 가이드 업스케일링 (Step 5)

* 입력 이미지의 가로($W$) 또는 세로($H$) 해상도가 \$\\min(W, H) < 768\\text{ px}$인 경우, 경계선 픽셀 정보 부족으로 인해 계단 현상(Jaggies)이 발생합니다.

* `Real-ESRGAN (x4plus_anime_6B)` 모델을 사용하여 해상도를 $4W \times 4H$로 확장한 뒤 배경을 제거합니다. 이후 원본 크기가 필요한 경우 `Lanczos3` 보간법으로 다운샘플링하여 **슈퍼샘플링 안티앨리어싱(SSAA)** 효과를 얻습니다.

#### ③ 트라이맵(Trimap) 기반 Alpha Matting (Step 8)

* 1차 AI 모델이 예측한 확률 맵 \$P(x, y) \\in \[0, 1\]$을 바탕으로 모폴로지 연산(Dilation/Erosion)을 수행하여 트라이맵 $T(x, y)$를 생성합니다: 

  $$
  T(x, y) = \begin{cases} \text{Foreground } (1.0), & \text{if } P(x, y) > 0.95 \\ \text{Background } (0.0), & \text{if } P(x, y) < 0.05 \\ \text{Unknown } (0.5), & \text{otherwise} \end{cases}
  $$

* `Unknown` 영역(주로 머리카락, 깃털, 나뭇잎 끝단)에 대해 이미지 합성 방정식 $I_i = \alpha_i F_i + (1 - \alpha_i) B_i$를 풀어 정밀한 알파값 $\alpha_i$를 계산합니다.

#### ④ 외곽선 색 번짐 제거 (Color Decontamination / Defringing) (Step 9)

* 미니게임에서 어두운 던전 타일 위에 캐릭터를 올렸을 때 가장자리에 하얀 테두리(White Halo)가 보이는 이유는 경계 픽셀 $I$에 원본의 흰색 배경 $B$가 섞여 있기 때문입니다.

* 단순 축소(`erosion`) 대신, 추정된 알파값 \$\\alpha \\in (0, 1)$와 주변 배경색 $B$를 이용해 순수 전경색 $F$를 역산하여 복원합니다: 

  $$
  F_{\text{clean}} = \text{clip}\left( \frac{I - (1 - \alpha)B}{\max(\alpha, \epsilon)}, 0, 255 \right)
  $$

* 이 수식을 적용하면 **선화나 얇은 아이템 두께를 단 \$1\\text{ px}$도 깎아먹지 않으면서 하얀/검은 테두리만 감쪽같이 제거**할 수 있습니다.

#### ⑤ 잔여 노이즈 클리닝 (Alpha Thresholding) (Step 10)

* AI 모델 특성상 배경 영역에 $0.01\% \sim 1\%$($\alpha \in [1, 4]$) 수준의 미세한 유령 픽셀이 남을 수 있습니다. 미니게임 엔진에서 히트박스(Hitbox) 계산이나 클릭 판정 오류를 막기 위해 클리핑 함수를 적용합니다: 

  $$
  \alpha_{\text{final}}(x, y) = \begin{cases} 0, & \text{if } \alpha(x, y) < \tau_{\text{low}} \quad (\text{기본값 } \tau_{\text{low}} = 5) \\ 255, & \text{if } \alpha(x, y) > \tau_{\text{high}} \quad (\text{기본값 } \tau_{\text{high}} = 250) \\ \alpha(x, y), & \text{otherwise} \end{cases}
  $$

* $\alpha_{\text{final}}(x, y) = 0$인 픽셀은 RGB 채널 값도 \$(0, 0, 0)$으로 초기화하여 PNG 압축률을 극대화합니다.

## 4. 핵심 기능 명세서 (Functional Specifications)

### 4.1 파일 입출력 및 배치 처리 기능

* **지원 입력 포맷:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.bmp`, `.gif`

* **출력 포맷:** $32\text{-bit}$ RGBA 투명 `.png` (단일 파일 다운로드 및 다중 파일 자동 `.zip` 압축 다운로드)

* **대용량 배치 큐(Batch Queue) 관리:**

  * 드래그 앤 드롭(Drag & Drop) 및 폴더 통째로 불러오기 지원

  * $100$장 이상 동시 업로드 시 비동기 워커 큐(Worker Queue)를 통해 메모리 오버플로우(OOM) 없이 순차/병렬 처리

  * 개별 파일 진행 상태 표시 (`대기 중` $\rightarrow$ `포맷/GIF 분석` $\rightarrow$ `AI 추론 중` $\rightarrow$ `후처리 중` $\rightarrow$ `완료`)

### 4.2 품질 모드 및 에셋 프리셋 선택

사용자가 작업 목적과 하드웨어 사양에 맞춰 선택할 수 있는 4가지 품질 모드를 제공합니다.

1. **⚡ 빠름 (Fast Mode):**

   * 엔진: `@imgly/background-removal-node` 또는 `U2Netp (ONNX)`

   * 특징: 프로토타이핑용, 장당 $0.2 \sim 0.5$초 내외 초고속 처리

2. **⚖️ 표준 (Standard Mode):**

   * 엔진: `IS-Net (General / Anime 자동 분기)` + 기본 Edge Cleanup

   * 특징: 일반적인 2D 게임 리소스 제작에 적합한 속도/품질 균형 모드

3. **💎 초고품질 (Ultra Studio Mode - 기본 권장):**

   * 엔진: `Guided Upscale` + `BiRefNet (또는 BRIA RMBG 2.0)` + `Alpha Matting` + `Color Decontamination` + `Shadow Removal`

   * 특징: 상용 게임에 즉시 투입 가능한 최상의 누끼 품질 보장

4. **👾 픽셀아트 전용 (Pixel-Perfect Mode):**

   * 엔진: 안티앨리어싱 완전 배제, 알파 채널 Hard-Edge($0$ 또는 $255$) 스냅핑으로 도트 뭉개짐 방지

### 4.3 미니게임 개발자 특화 부가 기능 (Killer Features)

* **인게임 배경 시뮬레이션 프리뷰 (In-Game Background Tester):**

  * 기본 투명 체커보드(`□■`)뿐만 아니라, 외곽선 테두리 불량을 즉시 육안으로 잡아낼 수 있도록 **순수 검정(`#000000`)**, **순수 흰색(`#FFFFFF`)**, **네온 마젠타(`#FF00FF`)**, 그리고 **미니게임 샘플 타일맵(초원 잔디, 어두운 던전 돌바닥, 나무 마루)** 배경 위에서 결과를 실시간으로 비교할 수 있습니다.

* **초간편 수동 마스킹 보정 브러시 (Quick Touch-up Brush):**

  * AI가 $99\%$ 완벽하게 처리하더라도, 캐릭터가 쥐고 있는 특이한 형태의 아이템 일부가 지워지거나 남을 수 있습니다.

  * 앱 내 프리뷰 창에서 `[복구 브러시(+)]`와 `[지우개 브러시(-)]`로 $1 \sim 2$초 만에 쓱 문질러 즉시 수정하고 저장할 수 있는 인터랙티브 캔버스를 제공합니다.

* **스프라이트 규격 자동화 (Auto-Trim & Padding):**

  * **Auto-Trim:** 배경 제거 후 사방의 빈 투명 공간을 오브젝트 외곽선에 딱 맞게 자동 크롭(Crop)합니다.

  * **여백 패딩(Padding):** 크롭된 이미지 상하좌우에 지정된 픽셀(예: $2\text{ px}$, $4\text{ px}$)만큼 투명 여백을 추가하여 게임 엔진에서 텍스처 클리핑이 깨지는 현상을 방지합니다.

## 5. 시스템 아키텍처 및 기술 스택

오프라인 환경에서 완벽히 동작하며 GPU 가속을 최대한 활용하기 위한 **Electron 하이브리드 아키텍처**입니다.

### 5.1 전체 시스템 구조도

```
+-----------------------------------------------------------------------+
|                     Electron Desktop Application                      |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Frontend (Renderer Process)                                     |  |
|  | - React 19 + TypeScript + Vite + Tailwind CSS                   |  |
|  | - Drag & Drop Zone / Batch Queue Dashboard                      |  |
|  | - Before/After Split Slider & In-Game Tilemap Preview Canvas    |  |
|  | - WebGL2 Interactive Touch-up Brush (복구/지우개 브러시)          |  |
|  +-----------------------------------------------------------------+  |
|                                  ▲                                    |
|                                  │ IPC (Inter-Process Communication)  |
|                                  ▼                                    |
|  +-----------------------------------------------------------------+  |
|  | Backend I/O & Fast Pipeline (Node.js Main/Worker Process)       |  |
|  | - Sharp: 초고속 포맷 변환, EXIF 삭제, Auto-Trim, Padding, PNG저장 |  |
|  | - gifuct-js & gif-frames: GIF 애니메이션 판별 및 첫 프레임 추출  |  |
|  | - Archiver / JSZip: 대량 처리 결과물 고속 ZIP 패키징             |  |
|  | - @imgly/background-removal-node: '빠름(Fast)' 모드 즉시 처리     |  |
|  +-----------------------------------------------------------------+  |
|                                  ▲                                    |
|                                  │ Localhost gRPC / Fast IPC          |
|                                  ▼                                    |
|  +-----------------------------------------------------------------+  |
|  | Ultra AI Inference Engine (Python Sidecar or ONNX Runtime Node) |  |
|  | - Engine: ONNX Runtime GPU (CUDA / DirectML / CoreML)           |  |
|  | - Models: BiRefNet, IS-Net-Anime, Real-ESRGAN, SAM2             |  |
|  | - Post-Proc: PyMatting (Alpha Matting), OpenCV (Defringing)     |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+

```

### 5.2 하드웨어(GPU) 가속 및 폴백(Fallback) 전략

* **NVIDIA GPU 장착 PC:** `ONNX Runtime CUDA Execution Provider`를 활성화하여 초고품질 모드 기준 장당 $0.3 \sim 1.2$초 내에 처리합니다.

* **AMD / Intel 내장 그래픽(Windows):** `DirectML Execution Provider`를 통해 별도의 복잡한 CUDA 설치 없이도 모든 Windows PC의 GPU 가속을 활용합니다.

* **Mac (Apple Silicon M1\~M4):** `CoreML Execution Provider`를 활성화하여 Neural Engine 및 GPU 가속을 수행합니다.

* **저사양 CPU 환경:** 자동으로 `INT8` 양자화(Quantized) 모델로 전환하고 멀티스레딩을 활용하여 안정적으로 동작합니다.

## 6. UI/UX 화면 설계 (Workspace Layout)

미니게임 개발자가 직관적으로 대량의 에셋을 검수하고 추출할 수 있는 **3단 다크모드 워크스페이스**로 구성합니다.

```
+-----------------------------------------------------------------------------------+
| ✂️ SpriteCut AI Studio                       [GPU: RTX 4070 활성] [⚙️ 설정] [도움말] |
+--------------------+-----------------------------------------+--------------------+
| [1. 에셋 설정 패널] | [2. 메인 프리뷰 & 인게임 시뮬레이터]     | [3. 배치 작업 큐]   |
|                    |                                         |                    |
| ▶ 에셋 카테고리     |  [원본 비교 슬라이더]  [수동 브러시 보정] | 📁 업로드: 24개 파일 |
| (●) 자동 AI 판별   |  +-----------------------------------+  | [전체 시작] [비우기] |
| ( ) 캐릭터 / NPC   |  |                 |                 |  |                    |
| ( ) 아이템 / 무기  |  |   원본 이미지    |  배경 제거 결과  |  | ✅ hero_idle.gif   |
| ( ) 설치물(Fixture)|  |                 |  (투명/타일배경) |  |   (동적GIF->1프레임)|
| ( ) 픽셀 아트(도트)|  |                 |                 |  | ✅ npc_merchant.webp|
|                    |  +-----------------------------------+  | ⏳ sword_rare.avif  |
| ▶ 품질 모드        |  배경 테스트:                            |   (Alpha Matting중)|
| [💎 초고품질 ▼]    |  [🏁체커] [⬛검정] [⬜흰색] [🟪마젠타]    | 🕒 chair_wood.jpg  |
|                    |  [🌿초원 타일] [🧱던전 타일]             | 🕒 potion_red.png  |
| ▶ 고급 후처리 옵션  |                                         | ...                |
| [v] 사전 업스케일링 |  +-----------------------------------+  |                    |
| [v] Alpha Matting  |  | 💡 파일이나 폴더를 이곳으로        |  | 진행률: [████░░] 65%|
| [v] 바닥 그림자제거 |  |    드래그 앤 드롭 하세요           |  |                    |
| [v] 테두리 색번짐제거|  | (.jpg .png .webp .avif .bmp .gif) |  | +----------------+ |
| [v] 여백 자동 크롭 |  +-----------------------------------+  | | 📦 전체 ZIP 저장| |
|     패딩: [ 2 ] px |                                         | +----------------+ |
+--------------------+-----------------------------------------+--------------------+

```

## 7. 개발 로드맵 (Milestone)

| **단계** | **개발 목표** | **주요 세부 과업** | 
| **Phase 1**  (MVP 구축) | 기본 입출력 및  포맷/GIF 파이프라인 완성 | • Electron + React + Vite + Node.js 보일러플레이트 구축  • `sharp` 기반 7종 이미지 포맷 입력 및 투명 PNG 변환 구현  • `gifuct-js` & `gif-frames` 연동 GIF 정적/애니메이션 판별 및 첫 프레임 추출  • `@imgly/background-removal-node` 연동 기본 배경 제거 및 ZIP 일괄 다운로드 | 
| **Phase 2**  (초고품질 AI 탑재) | BiRefNet & 후처리  엔진 결합 | • ONNX Runtime(DirectML/CUDA) 또는 Python Sidecar 엔진 연동  • `BiRefNet`, `IS-Net(Anime)` 모델 탑재 및 자동 이미지 타입 분류기 적용  • `Alpha Matting`, `Color Decontamination(테두리 색 번짐 제거)`, `Alpha < 5` 클리닝 구현 | 
| **Phase 3**  (미니게임 특화) | 게임 에셋 최적화 및  품질 극대화 | • 바닥 그림자 제거(Shadow Removal) 및 사전 업스케일링(Guided Upscale) 추가  • 픽셀아트(Hard-edge) 전용 모드, Auto-Trim(여백 재단), Padding 기능 구현  • 인게임 배경 시뮬레이터(초원/던전/마젠타 배경 프리뷰) 및 수동 복구/지우개 브러시 구현 | 
| **Phase 4**  (최적화 및 배포) | 성능 튜닝 및  설치 파일 패키징 | • 100장 이상 대용량 배치 처리 시 메모리 관리 및 멀티워커 최적화  • 모델 가중치 로컬 캐싱 관리 및 Windows용 `.exe` (NSIS 설치 프로그램) 빌드 배포 | 

## 8. Cursor Agent 즉시 실행용 마스터 프롬프트 (개발 지시서)

아래 블록의 프롬프트는 Cursor IDE (Composer / Agent 모드)에 그대로 복사하여 붙여넣어 프로젝트를 즉시 생성하고 구현할 수 있도록 설계된 고도화 개발 명세서입니다.

```
[System Role: Senior Full-Stack & AI Graphics Engineer]
미니게임 에셋(캐릭터, NPC, 아이템, 설치물/Fixtures) 제작에 최적화된 오프라인 데스크톱 배경 제거 애플리케이션 'SpriteCut AI Studio'를 제작한다.

1. 기술 스택 및 아키텍처
- Framework: Electron + React (TypeScript, Vite, Tailwind CSS)
- Backend (Electron Main / Worker Threads): Node.js
- 코어 이미지/포맷 처리: `sharp`
- GIF 판별 및 추출: `gifuct-js` (정적/애니메이션 프레임 수 판별), `gif-frames` 또는 `sharp` (첫 프레임 추출)
- AI 배경 제거 엔진 (이중 파이프라인):
  (1) Fast/Standard 모드: `@imgly/background-removal-node` 및 `onnxruntime-node` (IS-Net / BiRefNet ONNX 모델 구동)
  (2) 고급 후처리 파이프라인: Alpha Matting, Color Decontamination(배경색 번짐 제거), Alpha Thresholding, Auto-Trim
- 압축 패키징: `archiver` 또는 `jszip`

2. 필수 지원 포맷 및 GIF 처리 규칙
- 입력 허용 확장자: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.bmp`, `.gif` (대소문자 무관, 다중 파일 및 폴더 드래그앤드롭 지원)
- 출력 포맷: 무손실 투명 배경 `.png` (단일 저장 및 다중 파일 `result.zip` 일괄 다운로드)
- GIF 처리 로직:
  - 입력 파일이 `image/gif`인 경우 `gifuct-js`로 프레임 수를 먼저 검사한다.
  - 정적 GIF(프레임 수 == 1)이면 그대로 배경 제거 파이프라인에 투입한다.
  - 애니메이션 GIF(프레임 수 > 1)이면 첫 번째 프레임(index 0)만 추출하여 배경을 제거하고 투명 PNG로 변환한다.
- 모든 출력 파일은 개인정보 보호 및 용량 최적화를 위해 EXIF 메타데이터(GPS, 촬영정보 등)를 완전히 제거한다.

3. 초고품질 배경 제거 및 미니게임 에셋 후처리 파이프라인 구현
단순히 모델을 호출하는 것을 넘어, 다음 후처리(Post-processing) 단계를 모듈화하여 구현하라:
- Step A (해상도 보정): 저해상도 이미지(예: 512x512 이하) 입력 시 경계선 정밀도를 높이기 위해 사전 2x 업스케일 후 마스크를 추출하는 옵션 제공.
- Step B (에셋 타입별 모드):
  - '일반/초고품질 모드'(캐릭터/NPC/아이템/Fixtures): 정밀 세그멘테이션 + 경계선 스무딩
  - '픽셀아트(도트) 모드': 안티앨리어싱을 끄고 Alpha 값을 이진화(alpha < 128 ? 0 : 255)하여 도트 외곽선 보존
- Step C (잔여 노이즈 완전 제거 - Alpha Thresholding):
  - 배경 제거 후 남은 미세 반투명 노이즈 픽셀을 없애기 위해 `alpha < 5`인 픽셀은 `alpha = 0` 및 `RGB = (0,0,0)`으로 완전 투명화 처리.
- Step D (외곽선 테두리 보정 - Defringing & Erosion):
  - 흰색/검은색 배경 테두리(Halo)를 제거하기 위한 Color Decontamination(전경색 복원) 로직과 사용자 조절 가능한 Edge Shrink(0~3px Erosion) 및 Feathering 필터 구현.
- Step E (미니게임 엔진 최적화 - Auto-Trim & Padding):
  - 배경 제거 완료 후 상하좌우의 빈 투명 여백을 객체 크기에 딱 맞게 자동으로 잘라내는(Trim) 기능과 지정된 픽셀(예: 2px)만큼 투명 패딩을 주는 옵션 구현.

4. UI/UX 구현 요구사항
- 직관적인 3단 다크모드 레이아웃 (좌측: 에셋 카테고리 및 후처리 설정 / 중앙: 프리뷰 캔버스 및 드롭존 / 우측: 배치 처리 큐 및 ZIP 다운로드)
- 미니게임 배경 테스트 프리뷰: 투명 체커보드뿐만 아니라 순수 검정(#000), 흰색(#FFF), 마젠타(#FF00FF), 초원/던전 색상 배경을 원클릭으로 전환하며 누끼 품질을 검수할 수 있는 뷰어 제공.
- 수동 보정 브러시: HTML5 Canvas 기반으로 사용자가 결과물에서 지워진 부분을 복구(+)하거나 남은 배경/그림자를 지울(-) 수 있는 간단한 마스크 브러시 도구 포함.

위 명세를 바탕으로 프로젝트 폴더 구조, `package.json`, Electron Main/Preload 스크립트, 이미지 처리 파이프라인 모듈, 그리고 React UI 컴포넌트를 단계별로 완벽히 동작하도록 작성하라.

```