# 🍬 잼얘자판기

버튼 하나로 짧고 잼있는 이야기 한 조각을 뽑아주는 미니 웹 자판기예요.
코인을 넣고 → 뽑기 버튼을 누르면 → 랜덤으로 이야기 카드가 나오고, 잼/노잼으로 반응을 남길 수 있어요.

🔗 **바로 해보기**: https://soooru.github.io/jaemyae/

<br/>

## ✨ 특징

- 코인을 넣어야 뽑을 수 있는 자판기 인터랙션 (뽑을 때마다 코인 재투입 필요)
- 짧은 이야기/트리비아 중 랜덤 뽑기 (직전과 같은 카드 연속 방지)
- 카드마다 잼 🙂 / 노잼 🫠 반응 1회 남기기
- 누구나 잼얘를 직접 등록(UGC) 가능, 잼/노잼 반응이 합산돼서 베스트/워스트 랭킹으로 확인 가능
- 손그림 낙서풍(doodle) 디자인 — 굵은 손그림 테두리, 하드 섀도, 반짝이 스티커

## 🛠 기술 스택

- 프론트엔드: [Vite](https://vitejs.dev/) + TypeScript (프레임워크 없이 순수 DOM으로 구현)
- 백엔드: [Supabase](https://supabase.com) (Postgres + 자동 API) — 이야기/반응 데이터 저장

## 🚀 로컬에서 실행하기

```bash
cp .env.example .env.local   # Supabase 프로젝트 URL/키 입력 (팀 내부 공유)
npm install                  # 의존성 설치
npm run dev                  # 개발 서버 실행 (http://localhost:5173)
npm run build                # 프로덕션 빌드 (dist/ 생성)
npm run preview              # 빌드 결과 미리보기
```

## 📁 폴더 구조

```
src/
  main.ts               — 화면 로직 (상태 전환, 렌더링)
  api.ts                 — Supabase 호출 (이야기 목록/등록/반응)
  storage.ts             — 이 브라우저의 반응 잠금 등 localStorage 저장
  types.ts               — 타입 정의
  style.css              — 디자인/애니메이션 스타일
  data/stories100.json   — 기본 이야기 10개 시드 기록(런타임에는 안 씀)
```

## 📦 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 프론트엔드를 빌드해서 GitHub Pages에 배포합니다.
백엔드(Supabase)는 따로 배포할 게 없는 관리형 서비스라 이 배포 방식은 그대로 유지돼요 —
프론트 빌드에 Supabase 프로젝트 URL/키만 환경변수로 넣어주면 끝입니다.

## ✍️ 이야기 추가하기

화면 하단 "인력급구!인력급구!" → 지원하기로 누구나 새 잼얘를 등록할 수 있어요(Supabase `stories`
테이블에 바로 저장). `src/data/stories100.json`은 최초 시드용 기본 10개의 기록으로만 남아있고,
런타임에는 더 이상 읽지 않아요.

<br/>

---

친구를 위해 만든 작은 장난감 프로젝트입니다 🍭
