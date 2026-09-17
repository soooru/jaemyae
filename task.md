# 작업 현황 (2026-09-17)

## 오늘 한 일 — Supabase 연동

- **기존 프로젝트 정리**: 어제 만들어둔 구스키마 `stories`(jam_count/nojam_count + `react_to_story`
  RPC, 레코드 0개)를 대시보드에서 확인 후 `drop table ... cascade` / `drop function`으로 삭제.
- **스키마 설계 재검토**: 처음엔 CLAUDE.md에 적어뒀던 `reactions`(voter + `unique(story_id, voter)`)
  + `story_stats` 뷰 방식으로 가려 했으나, 사용자가 "로그인도 없는데 voter로 중복을 막는 게 의미가
  없다"고 지적 → 폐기. **카운터 방식으로 재확정**하되 컬럼을 프론트 `Story` 타입에 맞춤(`title`/
  `content`/`category`/`author`/`jam_count`/`nojam_count`/`is_hidden`). 상세 스키마는 CLAUDE.md
  "백엔드" 절 참고.
- **스키마 적용 + 기본 데이터 시드**: 새 `stories` 테이블 + RLS 정책(read/insert) + `react_to_story`
  RPC(SECURITY DEFINER) 생성. `stories100.json`의 기본 10개를 Supabase에 insert. 적용 도중
  `anon` 롤에 테이블 GRANT가 없어서(`Automatically expose new tables`를 꺼뒀던 여파) 401
  `permission denied` 발생 → `grant select, insert on public.stories to anon, authenticated`로
  해결.
- **프론트 코드 연동 완료**:
  - `src/api.ts` 신설 — `fetchStories`/`insertStory`/`reactToStory` (Supabase 호출 전담).
  - `src/storage.ts` — 로컬 커스텀 스토리(`jaemyae.custom.v1`)/통계(`jaemyae.stats.v1`) 관련 함수
    전부 제거. `jam-machine:reactions`(카드당 1회 반응 잠금)와 `lastStoryId`만 남김.
  - `src/main.ts` — 앱 시작 시 `fetchStories()`로 로드(`loadState: loading/ready/error`), 로딩/
    실패 시 전용 화면("자판기 점검 중이에요" + 다시 시도 버튼) 추가. `submitForm()`은 Supabase
    insert(제출 중 중복 클릭 방지 + 실패 시 인라인 에러 문구, 입력값은 안 날아가게 DOM 패치로 처리).
    `handleReaction()`은 로컬 반응 잠금은 그대로 두고 `react_to_story` RPC를 낙관적 업데이트로 호출.
    순위표는 `story.jam`/`story.nojam`을 직접 정렬해서 사용.
  - **순위표 "기록 초기화" 버튼 삭제**: 카운트가 이제 전역 공용이라 "이 브라우저에서 초기화" 개념이
    안 맞고, RLS도 anon에게 update/delete를 안 열어놔서 애초에 리셋이 불가능 — 사용자 확인 후 버튼
    자체를 뺌(`link-btn` CSS도 같이 정리).
- **로컬 dev 서버로 전체 플로우 테스트 완료**: 로드 → 코인 삽입 → 뽑기 → 반응(RPC 204 확인) →
  순위표(이스터에그, 실제 반영된 표 수 확인) → UGC 등록(Supabase insert 확인, 풀 10→11개 반영)까지
  브라우저로 직접 클릭해서 확인. 테스트로 넣은 더미 스토리/반응 카운트는 SQL로 정리함.
- `CLAUDE.md` 백엔드 절을 실제 적용된 스키마 기준으로 갱신.

## 다음 할 일

1. **커밋 + push + 배포 확인** (`gh run watch`) — 아직 로컬에만 반영됨. 밀린 이전 커밋 2개
   (`fa4c6c1`, `6d189fd`)도 origin에 안 올라가 있어서 같이 push 필요.
2. 배포된 사이트(GitHub Pages)에서도 Supabase 연동이 실제로 동작하는지 한 번 더 확인
   (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`가 Actions secrets에 이미 등록돼 있어서 build
   단계에서 그대로 주입됨 — 별도 설정 불필요할 것으로 예상되지만 배포 후 직접 클릭해서 확인할 것).
3. `README.md`에도 "Supabase 미연동" 관련 문구가 있으면 실제 완료 상태로 갱신.

## TODO (별도 기획 예정)

- **등록한 잼얘 삭제 기능**: 여전히 미기획 상태. Supabase로 넘어왔으니 삭제는 `is_hidden = true`
  소프트 삭제(대시보드에서 수동 처리)만 가능 — 프론트에 삭제 UI를 만들지는 나중에 별도로 기획.
