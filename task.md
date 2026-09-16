# 작업 현황 (2026-09-16)

## 오늘 한 일

- **문서 정리**: `.claude/작업지시서.md` 삭제 → 프로젝트 루트에 `CLAUDE.md`(AI 작업용, 상세 스펙)와
  `README.md`(사람용, 소개) 분리 작성.
- **Supabase 계정/프로젝트 세팅**: 프로젝트 생성(URL `https://ntnthopkdmlipflnawcg.supabase.co`),
  Data API 설정("Automatically expose new tables" 끔 / "Enable automatic RLS" 켬), 초기 스키마 1회
  적용 시도(`stories` 테이블 + `jam_count`/`nojam_count` + RPC 방식) — **이 스키마는 이후 폐기됨**,
  아래 "내일 할 일"의 새 스키마로 대체 예정.
- **프론트 ↔ Supabase 배선**: `@supabase/supabase-js` 설치, `src/supabaseClient.ts` 작성,
  `.env.local`(로컬, 실값)/`.env.example`(커밋용, 빈 값), GitHub Actions repo secrets
  (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) 등록 + `deploy.yml` build 스텝에 env 전달 —
  **이 배선 자체는 그대로 재사용 가능**, 아직 실제로 호출하는 코드는 없음.
- **핸드오프 스펙 반영 (`C:\Users\imes0810\Downloads\handoff\`의 작업지시서.md / supabase.md 기준)**:
  모달 시스템(채용공고/폼/완료/순위표) 4종, 코인 무지개 순환 + 7연속 클릭 이스터에그(순위표 진입),
  UGC 이야기 등록, 잼/노잼 합산 랭킹을 **localStorage 프로토타입으로 전부 구현 완료**. 브라우저에서
  전체 플로우(등록 → 뽑기 → 반응 → 랭킹 반영, 이스터에그) 직접 테스트해서 정상 동작 확인함.
- 사용자 피드백 반영(2026-09-16): "채용 완료" 모달을 "작업 완료"로 텍스트 변경, 버튼을 `하나 더`
  하나만 남기고 `목록 보기` 제거. 그 여파로 **"들어간 잼얘" 목록(list) 모달 자체를 삭제**함
  (진입 경로가 없어져서) — 삭제 기능은 없어진 상태. 아래 "내일 할 일"에 TODO로 남겨둠.
- 씨드용 기본 이야기 10개 선정 + `author: '챗쮜피티'` 부여 → `src/data/stories100.json` 교체.
- `CLAUDE.md`를 새 스펙 기준으로 전면 갱신(모달 스펙, 코인 규칙, 데이터 키, 새 Supabase 스키마 초안,
  "하지 말 것" 등). 아직 Supabase 관련 실제 코드 작업은 시작 전 상태.

## 내일 할 일 — Supabase 연동 + 마무리

**목표**: localStorage 프로토타입을 실제 Supabase로 교체하고 배포까지 마무리.

1. **기존 Supabase 프로젝트 상태 확인 및 정리**
   - 대시보드에서 어제 만든 (구)`stories` 테이블(`jam_count`/`nojam_count`/RPC 방식)이 남아있는지
     확인. 남아있으면 새 스키마와 충돌하니 정리(테이블 삭제 또는 재설계) 후 진행.
2. **새 스키마 적용** (`CLAUDE.md`의 "백엔드" 절에 SQL 전체 있음)
   - `stories`(title/body/author/is_hidden) + `reactions`(story_id/kind/voter, `unique(story_id, voter)`)
     + `story_stats` 뷰 + RLS 정책(읽기 공개, 쓰기 공개, update/delete 없음).
3. **프론트 코드를 Supabase 연동으로 교체**
   - `allStories()` — `stories100.json` 로컬 배열 대신 Supabase `stories` 테이블 조회(앱 시작 시
     1회 로드)로 전환. 기존 기본 10개는 Supabase에 시드 데이터로 한 번 insert.
   - `submitForm()` — `addCustomStory()`(localStorage) 대신 Supabase `stories` insert.
   - `handleReaction()` — `bumpStat()`(localStorage) 대신 Supabase `reactions` insert
     (`voter`는 `crypto.randomUUID()`로 만들어 `localStorage`에 저장해 재사용, 키 이름
     `jaemyae.voter`). 중복 반응은 unique 제약 위반(23505)으로 감지해 기존처럼 버튼 잠금 유지.
   - `rank` 모달 — `story_stats` 뷰 조회로 교체.
   - 로딩 실패 시 빈 화면 대신 "자판기 점검 중이에요" + 재시도 버튼 추가 (supabase.md 스펙 참고).
4. **테스트**: 로컬 dev 서버로 전체 플로우 재확인 (등록/반응/랭킹이 실제로 DB에 쌓이는지, 새로고침
   해도 유지되는지, 다른 브라우저에서도 같은 데이터가 보이는지).
5. **커밋 + push + 배포 확인** (`gh run watch`) — env는 이미 세팅돼 있어서 배포 파이프라인 자체는
   손댈 필요 없음.
6. 마무리되면 `CLAUDE.md`/`README.md`의 "백엔드 아직 미연동" 관련 문구들을 실제 완료 상태로 갱신.

## TODO (별도 기획 예정)

- **등록한 잼얘 삭제 기능**: "들어간 잼얘" 목록(list) 모달과 함께 제거됨(2026-09-16). 어떤 화면/
  진입 경로로 삭제 기능을 다시 넣을지는 나중에 따로 기획하기로 함. `storage.ts`의
  `removeCustomStory()` 함수는 재사용을 위해 코드에 남겨뒀음(현재는 어디서도 호출 안 함).
  Supabase로 넘어가면 삭제는 `is_hidden = true` 소프트 삭제 방식이 될 예정이므로, 기획할 때 이
  방식도 같이 고려할 것.
