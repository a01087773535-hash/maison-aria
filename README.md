# MAISON ARIA — Luxury K-Beauty Operator OS

라이브 배포 가능한 하이엔드 K-뷰티 브랜드 홈페이지 + 상담·상품DB·전성분·추천 엔진 풀스택.

## 라이브 배포 (Render.com · 3-Click)

### 1. GitHub에 코드 올리기
```bash
cd maison-aria
git init
git add .
git commit -m "init maison aria"
git branch -M main
git remote add origin https://github.com/<YOUR_ID>/maison-aria.git
git push -u origin main
```

### 2. Render.com에서 Deploy
- https://render.com 접속 (GitHub 로그인)
- `New +` → `Blueprint` → 방금 만든 repo 선택 → `Apply`
- `render.yaml` 이 자동 인식됨 → 그대로 `Deploy`

### 3. 발급된 URL 접속
- 배포 완료 시 `https://maison-aria-xxxx.onrender.com` 형태의 라이브 URL 발급
- 로그인 계정:
  - 관리자: `admin` / `admin1234`
  - 직원: `staff` / `staff1234`

## 대안 배포 플랫폼

### Railway.app (1-Click)
```bash
# railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

### Vercel (Serverless Node)
```bash
npm i -g vercel
vercel
```

### Fly.io
```bash
fly launch
fly deploy
```

## 로컬 실행

### 방법 1) Windows
- `start_app.bat` 더블클릭 (Node.js LTS 필요)

### 방법 2) macOS / Linux
```bash
npm install
npm start
```
브라우저에서 http://localhost:3000

## 주요 기능

- **하이엔드 홈페이지 (Maison Aria 랜딩)** — Cormorant Garamond + Noto Serif KR, 아이보리·누드·핑크·실버 팔레트
- **뮤즈 실사 이미지 4종** — 히어로, 시그니처, 에디토리얼(흑백), 리조트, 라운지 무드
- **상품 DB 323개** — 전성분 100% 확보 완료 (auto_seed_v2 + evidence 플래그)
- **추천 엔진 v2** — 피부/목표/고민/회피/예산/카테고리 6-factor 가중치 + 카테고리 로테이션 + 지터
- **상담·이력·대시보드·파이프라인** 통합 관리
- **PWA** — 홈화면 설치, 오프라인 캐시

## 폴더 구조

```
maison-aria/
├─ server.js              # Express + lowdb 백엔드
├─ package.json           # Node 엔진 명시 (18~22)
├─ render.yaml            # Render.com Blueprint
├─ Procfile               # Heroku 호환
├─ .node-version          # nvm/asdf 힌트
├─ data/db.json           # 상품/유저/상담 DB
├─ public/
│   ├─ index.html         # 하이엔드 홈페이지 + 앱 SPA
│   ├─ styles.css         # Maison Aria 럭셔리 테마
│   ├─ app.js             # 프론트 로직 (자가복구 + 리셋)
│   ├─ assets/            # 뮤즈 실사 이미지 5장
│   └─ icons/             # PWA 아이콘
├─ start_app.bat / .cmd / .ps1
└─ README.md
```

## 환경 변수

Render / Railway 등에서 자동 세팅됨.

- `PORT` — 서버 포트 (자동)
- `NODE_ENV=production`

## 라이센스

Private. 2026 © Maison Aria.
