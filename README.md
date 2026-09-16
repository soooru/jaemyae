# 🍬 잼얘자판기

버튼 하나로 짧고 잼있는 이야기 한 조각을 뽑아주는 미니 웹 자판기예요.
코인을 넣고 → 뽑기 버튼을 누르면 → 랜덤으로 이야기 카드가 나오고, 잼/노잼으로 반응을 남길 수 있어요.

🔗 **바로 해보기**: https://soooru.github.io/jaemyae/

<br/>

## ✨ 특징

- 코인을 넣어야 뽑을 수 있는 자판기 인터랙션 (뽑을 때마다 코인 재투입 필요)
- 100개 가까운 짧은 이야기/트리비아 중 랜덤 뽑기 (직전과 같은 카드 연속 방지)
- 카드마다 잼 🙂 / 노잼 🫠 반응 1회 남기기
- 손그림 낙서풍(doodle) 디자인 — 굵은 손그림 테두리, 하드 섀도, 반짝이 스티커
- (현재 백엔드(Supabase) 도입을 진행 중입니다. 곧 누구나 잼얘를 직접 등록할 수 있고,
  잼/노잼 반응이 모두 합산돼서 베스트/워스트 랭킹을 볼 수 있게 될 예정이에요.)

## 🛠 기술 스택

- 프론트엔드: [Vite](https://vitejs.dev/) + TypeScript (프레임워크 없이 순수 DOM으로 구현)
- 백엔드: [Supabase](https://supabase.com) (Postgres + 자동 API) — DB/연동 준비 완료, 화면 기능 반영은 진행 중

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
  storage.ts             — 반응 기록 등 localStorage 저장
  types.ts               — 타입 정의
  style.css              — 디자인/애니메이션 스타일
  data/stories100.json   — 이야기 데이터
```

## 📦 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 프론트엔드를 빌드해서 GitHub Pages에 배포합니다.
백엔드(Supabase)는 따로 배포할 게 없는 관리형 서비스라 이 배포 방식은 그대로 유지돼요 —
프론트 빌드에 Supabase 프로젝트 URL/키만 환경변수로 넣어주면 끝입니다.

## ✍️ 이야기 추가/수정하기

`src/data/stories100.json` 파일에 아래 형식으로 항목을 추가/수정하면 됩니다. 코드 수정은 필요 없어요.

```json
{
  "id": "story_100",
  "title": "제목",
  "category": "카테고리",
  "content": "짧은 이야기 내용 (5문장 이내 권장)"
}
```

<br/>

---

친구를 위해 만든 작은 장난감 프로젝트입니다 🍭
