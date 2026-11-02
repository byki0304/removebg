# SpriteCut AI (removebg)

게임 스프라이트용 초정밀 배경 제거 앱. 사양서: `06_Cursor_Project_Master_Prompt_final_removebg.md`

| 경로 | 내용 |
| --- | --- |
| `apps/web` | Next.js 15 웹/모바일 앱 (인증, 화면, 이미지 파이프라인, Supabase 마이그레이션, Playwright) |
| `apps/desktop` | Electron 데스크톱 앱 + `python_sidecar` (로컬 AI 엔진, FastAPI) |
| `packages/shared` | i18n(ko/en/ja), 휴대폰번호 정규화, 검증, 공용 타입 |
| `packages/intro-video` | Remotion으로 코드 생성하는 6초 인트로 영상 |

## 1. 빠른 시작 (Supabase 없이 화면 확인)

```powershell
npm install
npm install-scripts approve sharp esbuild electron
copy apps\web\.env.example apps\web\.env.local   # NEXT_PUBLIC_UI_PREVIEW=1 로 바꾸면 로그인 없이 모든 화면 확인
npm run dev                                       # http://localhost:3000
```

## 2. Supabase 연결

1. Supabase 프로젝트 생성 → `apps/web/supabase/migrations/20261103000000_init.sql` 을 SQL Editor에서 실행 (또는 `supabase db push`). `pg_cron` 확장이 필요합니다(Database > Extensions).
2. Authentication 설정
   - Providers > **Email: Enabled**, **Confirm email: OFF**
   - **Phone provider 사용 안 함** (SMS 인증 없음 — 휴대폰번호는 ID+비밀번호 로그인)
   - **Anonymous sign-ins: Enabled** (게스트)
   - Google provider Enabled
   - URL Configuration > Redirect URLs: `https://<도메인>/auth/callback`, `http://localhost:3000/auth/callback`, `spritecut://auth/callback`
3. `apps/web/.env.local` 에 키 입력: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`(서버 전용), `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_UI_PREVIEW=0`

게스트 데이터는 pg_cron이 72시간 후 자동 삭제하고, 이메일·휴대폰·Google 회원 데이터는 영구 보관됩니다.

## 3. AI 엔진 (Python sidecar)

Python 3.11–3.13 권장 (3.14는 onnxruntime 휠 미지원).

```powershell
cd apps\desktop\python_sidecar
py -3.13 -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python sidecar_server.py --port 8000 --preload   # 웹의 AI_ENGINE_URL=http://127.0.0.1:8000
.\.venv\Scripts\python -m pytest                                   # 단위 테스트
.\.venv\Scripts\python scripts\smoke_test.py pixel <이미지경로>     # 실제 모델 확인
```

모델(rembg ONNX): Ultra=`birefnet-general`(약 1GB), Standard=`birefnet-general-lite`, 픽셀/애니=`isnet-anime`. 첫 사용 시 자동 다운로드됩니다. 엔진이 꺼져 있으면 웹은 내장 기본 엔진(단색 배경용)으로 자동 대체합니다.

## 4. 데스크톱 앱 (Electron)

```powershell
npm run dev            # 터미널 1: 웹 개발 서버
npm run desktop        # 터미널 2: Electron (sidecar 자동 실행)
```

배포 빌드:

```powershell
cd apps\desktop\python_sidecar; .\.venv\Scripts\python -m pip install pyinstaller; .\.venv\Scripts\python build_sidecar.py; cd ..\..\..
$env:SPRITECUT_CLOUD_URL="https://<배포된 웹 도메인>"
npm run desktop:dist   # apps/desktop/release/
```

데스크톱 번들에는 Service Role Key가 들어가지 않습니다. 관리자 권한이 필요한 가입/게스트 처리는 `SPRITECUT_CLOUD_URL`(배포된 웹)로 위임되고, Google 로그인은 시스템 브라우저 → `spritecut://` 딥링크로 돌아옵니다. 로그: `%APPDATA%\SpriteCut AI\logs\main.log`.

## 5. 인트로 영상

```powershell
npm run render:intro   # apps/web/public/intro/ 에 intro_landscape.mp4, intro_portrait.mp4, poster.webp 생성
```

Remotion은 개인·소규모(3인 이하) 팀은 무료, 그 이상은 회사 라이선스가 필요합니다.

## 6. 테스트

```powershell
npm run typecheck
npm test
npm run e2e            # Playwright: 흐름 + 10개 해상도 × 11개 화면 × 3개 언어 반응형/겹침 검사 + 회전
```

## 7. GCP 배포

- 웹: `docker build -f apps/web/gcp/Dockerfile --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... --build-arg NEXT_PUBLIC_SITE_URL=... .` → Cloud Run (런타임 env: `SUPABASE_SERVICE_ROLE_KEY`, `AI_ENGINE_URL`)
- AI 엔진: `docker build -t spritecut-engine apps/desktop/python_sidecar` → Cloud Run GPU (L4/T4)
- GCS 버킷 수명주기: `apps/web/gcp/lifecycle.json` (3일 후 삭제)
