# 잼얘자판기 (jam-story-machine)

버튼을 누르면 짧은 이야기(잼얘) 하나를 랜덤으로 뽑아 보여주는 한 화면짜리 웹서비스.
친구용(쩨리를 위한) 장난 프로젝트. 프론트엔드는 Vite + vanilla TypeScript(정적 사이트).

**진행 순서(사용자 지정)**: 프론트엔드(모달 4종 · UGC 등록 · 랭킹)를 localStorage 프로토타입으로
먼저 완성 → 그다음 맨 마지막에 Supabase로 교체. 프론트 구현은 끝났고, **2026-09-17부터 Supabase
연동 작업이 진행 중**이다(아래 "백엔드" 절 · `task.md` 참고).

## 프로젝트 개요

- **컨셉**: 손그림 낙서풍(doodle) 자판기 패널. 버튼(코인 투입 → 뽑기)을 누르면 짧은 트리비아/이야기
  카드가 자판기에서 나오듯 뽑히고, 잼/노잼으로 반응을 남기는 장난감 같은 인터랙션. 추가로 누구나
  이야기를 직접 등록(UGC)할 수 있고, 반응을 합산한 베스트/워스트 랭킹을 볼 수 있다.
- **목적/대상**: "쩨리"라는 특정 친구에게 보여주기 위한 사적인 장난 프로젝트. 불특정 다수를 위한
  서비스가 아니므로 회원가입 같은 무거운 기능은 불필요.
- **한 화면 원칙**: 메인 화면은 세로 1열 레이아웃 하나로 끝난다. 메뉴/탭/설정 등 추가 내비게이션을
  만들지 않는다. **등록/목록/랭킹 같은 나머지 기능은 전부 모달 오버레이로 처리**해서 이 원칙을
  지킨다 (상시 노출되는 별도 화면·버튼을 추가하지 않는다).
- **실사 자판기 아님**: 금속 질감, 상품 진열대, 배출구 트레이 같은 사실적 묘사는 하지 않고
  손그림 낙서 톤(굵은 잉크 테두리, 비대칭 라운드, 하드 섀도)을 유지한다.
- **native `alert`/`confirm` 사용 금지** — 모두 커스텀 모달로 구현한다.

## 화면 구조 (메인, 세로 1열)

```
   ✦        ✧                  ← 반짝이 스티커(패널 바깥 절대배치 6개)
┌─ 패널 (max-width 400px, 3px 아웃라인) ─┐
│        쩨리를 위한                      │
│        잼얘자판기                       │  헤더 (가운데 정렬)
│  ──────────────────────────────────    │  3px 구분선
│  ┌ 디스플레이 창 (min-height 262px) ┐  │  상태별 내용 교체 영역
│  └─────────────────────────────────┘  │
│  [   잼얘 뽑기   ]  [◉ INSERT]         │  CTA + 코인 슬롯
└─────────────────────────────────────────┘
        [ 인력급구!인력급구!인력급구! ] [🧹]  ← 채용공고 모달 진입점 + 청소부 아이콘 버튼
```

메인에서 바뀌는 것은 **디스플레이 창 내부**, **CTA 상태**, **코인 슬롯 상태**뿐. 그 외 모든 기능
(등록/목록/랭킹)은 모달로 처리한다. 디스플레이 창 `min-height: 262px` 고정으로 상태 전환 시
레이아웃 점프가 없다.

### 메인 화면 상태

| 상태 | 진입 조건 | 디스플레이 창 | CTA |
|---|---|---|---|
| 대기(코인 없음) | 최초 진입 / 뽑기 직후 | 마스코트 박스(bob) + "잼얘가 N개 들어 있어요 / 먼저 오른쪽 코인을 넣어주세요." | 비활성 |
| 대기(코인 있음) | INSERT 클릭 | "준비 완료! 잼얘 뽑기를 눌러보세요." | 활성 · "잼얘 뽑기" |
| 뽑는 중 | CTA 클릭 | 흔들리는 박스(shake) + 로딩 문구 + 점 3개, 700ms마다 문구 순환 | 비활성 · "뽑는 중..." |
| 결과 | 1,800ms 경과 | 카드 낙하 + 이야기 카드(작성자 `— 이름` 우하단 표기) + [잼][노잼] | **"하나 더 뽑기"** (코인 없으면 비활성) |
| 반응 완료 | 잼/노잼 클릭 | 선택한 버튼만 컬러 고정, 반대쪽 dim + 감사 문구 | 동일 |

세부 규칙: 반응은 카드당 1회(양쪽 다 disabled). 랜덤 추출 시 직전과 같은 카드가 나오면 다음으로
밀어 연속 중복 방지. 카드에 일련번호는 표시하지 않는다. 제목 없는 카드는 "제목 없는 잼얘"로 표시
(현재는 등록 폼에서 제목이 필수라 실제로는 발생하지 않음, 안전망 차원).

**CTA 라벨 관련 수정 이력**: 예전 코드에 결과 화면 CTA가 항상 "코인을 넣어주세요"로 표시되고
`hasCoin`이 true여도 라벨이 안 바뀌는 버그가 있었음 — "하나 더 뽑기"로 고정 수정함(2026-09-16).

### 코인 규칙 (핵심 인터랙션)

- 최초 CTA는 비활성. INSERT를 누르면 코인이 채워지고 라벨이 READY로 바뀐다.
- 뽑기 1회 = 코인 1개 소모. 뽑기 시작과 동시에 코인 회수, 슬롯은 INSERT로 복귀 — "하나 더 뽑기"도
  재투입 필요.
- **코인이 이미 있어도 INSERT 버튼은 disabled가 아니다** (예전 버전과 다른 점). 클릭할 때마다
  코인 색이 무지개 순환: 빨 `#F14E32` → 주 `#F2913D` → 노 `#F5C542` → 초 `#13BD7E` → 파 `#3C8DE0`
  → 보 `#7250C7`. 코인 슬롯 배경도 같은 색으로 옅게 물든다(`hexToRgba`, 32% 알파).
- `coinClickCount`는 **코인이 리셋될 때(뽑기 시작, 또는 순위표(rank) 모달을 닫을 때)마다 0으로
  같이 초기화**된다(2026-09-17 변경 — 예전엔 뽑아도 리셋 안 되는 평생 누적 카운트였으나, "코인
  INSERT는 리셋되는데 클릭 수는 안 리셋돼서 순위표가 뜬금없이 뜬다"는 피드백으로 동기화함).
- **이스터에그**: **보라색이 되는 클릭(6번째, 마지막 리셋 이후 6의 배수일 때)마다** 잼얘 순위표
  (rank) 모달이 바로 열린다 — 그 클릭은 코인 삽입으로 처리되지 않고 모달만 연다. 다음 클릭은
  자동으로 빨강부터 다시 시작. 시간 간격 조건은 없음 — 천천히 눌러도 6번째면 항상 열린다.

## 모달 (4종, 공통 오버레이)

오버레이 `rgba(34,48,43,.42)` · 모달 `max-width 380px` · `max-height 88vh`(내부 스크롤) · 우상단
✕ 닫기 34×34. `form` 모달은 배경(backdrop) 클릭으로 안 닫힘(입력 중 실수로 날아가는 것 방지) —
그 외 모달은 배경 클릭으로 닫힘. 순위표(rank)는 **상시 노출 버튼이 없고 코인 색이 보라색이 되는
클릭(이스터에그)으로만 들어간다** — 원래 있던 "목록" 모달 링크는 목록 모달 자체가 삭제되면서 함께
없어짐.

- **채용공고(`job`)** — 메인 하단 알약 버튼 `인력급구!인력급구!인력급구!` 클릭으로 진입점. `급 구`
  배지 + "쩨리에게 줄 잼얘 채울 / 현장직을 모집합니다" + 정보 4줄(근무처 대기업 지사 / 근무지 남해 /
  일당 100?만원 / 복리 숙식제공) + **지원하기** 버튼. "지원하기"는 `form` 모달을 연다(입사 지원 =
  이야기 등록이라는 농담 설정 — `done` 모달 제목 "작업 완료"가 이 흐름을 전제로 한다).
- **자판기 청소부(예정, 아직 미구현)** — `인력급구` 알약 버튼 우측에 아이콘 전용 버튼(🧹,
  `.icon-btn`, data-action="cleaner-job")만 먼저 만들어둠(2026-09-17). 클릭하면 커스텀 alert
  오버레이(`showAlert`/`renderAlertOverlay`, `.alert-overlay`/`.alert-box`)로 "앗, 청소부 지원은
  아직 받지 않아요!" 메시지만 뜬다. **다음 작업으로 예정된 실제 기능**: 워스트 잼얘(순위표 하단)를
  청소부가 "지원"해서 치우는(= 삭제하는) 흐름 — 아직 백엔드 연결도, 모달 내용도 없음. 이 아이콘
  버튼과 커스텀 alert 오버레이는 `done` 모달의 "퇴사하기"(`resign`) 흐름과는 별개다.
- **잼얘 채우기(`form`)** — 필드 3개 전부 필수(빈 값 있으면 등록 버튼 비활성): `작업자`(20자),
  `제목`(40자), `잼얘 본문`(textarea 5행, 라벨 옆 회색 안내 "추천: 5문장 이내"). **플레이스홀더,
  글자수 카운터, 검증 안내 문구를 넣지 않는다.** 등록 버튼 "자판기에 넣기" → 로컬 스토리 목록에
  추가하고 `done` 모달로 전환.
- **작업 완료(`done`)** — 마스코트 + "잼얘 하나가 들어갔어요. 이제 자판기에서 뽑힐 수 있어요."
  (제목에 이미 "작업 완료"가 있어서 본문에서는 뺌, 2026-09-17) + 버튼 2개: `하나 더`(`form`으로
  재진입) / `퇴사하기`(화면 전체를 덮는 서사형 이스터에그 `resign-scene`을 연다 — "재활용" 텍스트가
  검정 배경+볼드+이탤릭으로 노랑↔빨강 깜빡이고, "눈 앞의 자판기를 응시하기" 버튼을 누르면 첫 페이지
  IDLE 상태로 완전히 리셋된다). 두 버튼 모두 `.modal-cta--compact`로 축소, `.modal-cta-group`으로
  간격을 벌림.
- **잼얘 순위표(`rank`)** — "지금까지 N표가 모였어요"(N=0이면 통째로 빈 상태). **베스트**(민트 배지,
  잼 많은 순)/**워스트**(코랄 배지, 노잼 많은 순) 각 최대 3개, 순위 메달(1 `#F5C542` / 2 `#E3DDCB`
  / 3 `#F5A79B`) + 제목 + 작성자 + 득표수 + **본문 전체**(말줄임 없음). 카운트는 Supabase
  `stories.jam_count`/`nojam_count`를 그대로 씀(하단 `기록 초기화` 버튼은 카운트가 전역 공용이 되면서
  삭제됨 — "백엔드" 절 참고). **이 모달을 닫으면(✕ 또는 배경 클릭) 코인이 강제로 INSERT 상태로
  리셋**된다(`hasCoin`/`coinClickCount` 둘 다 0) — 코인이 READY 상태였어도 예외 없음.

**들어간 잼얘 목록(list) 모달은 삭제됨(2026-09-16)** — `done` 모달의 "목록 보기" 버튼을 없애면서
진입 경로가 사라져 모달 자체와 등록한 이야기 삭제 UI를 함께 제거함. 삭제 기능은 나중에 별도로
다시 기획할 예정(`task.md`의 TODO 참고). `storage.ts`의 `removeCustomStory()`는 재사용을 위해
코드에는 남아 있지만 현재 어디서도 호출되지 않는다.

## 스택 / 실행

- 프론트엔드: Vite + TypeScript(strict), 프레임워크 없음. UI는 순수 DOM 조작(`innerHTML` 재렌더 +
  부분 패치). 텍스트 입력 필드(form 모달)는 매 키 입력마다 재렌더하지 않고 `input` 이벤트로 제출
  버튼 활성화만 토글 — 전체 재렌더를 하면 입력 중 포커스/커서 위치가 날아가기 때문.
- 상태 저장: 전부 `localStorage` 프로토타입(아래 "데이터" 절의 키 참고). Supabase는 아직 미연동.
- 명령어
  - `npm run dev` — 개발 서버
  - `npm run build` — `tsc -b && vite build` (dist/ 생성)
  - `npm run preview` — 빌드 결과 미리보기

## 디렉터리 구조

```
src/
  main.ts               — 전체 UI 로직 (상태 머신 + 모달 시스템 + 렌더링 + 이벤트 바인딩)
  storage.ts             — localStorage 래퍼 (반응/커스텀 스토리/통계)
  types.ts               — Story, MachineState, ModalKind, StatsMap 등 타입
  style.css              — 전체 스타일 (낙서풍 디자인 시스템 + 모달)
  data/stories100.json   — 기본 제공 이야기 10개 (author: '챗쮜피티')
  supabaseClient.ts       — Supabase 클라이언트 초기화 (배선만 돼 있음, 아직 미사용)
  vite-env.d.ts           — import.meta.env 타입 선언
.github/workflows/deploy.yml — GitHub Pages 자동 배포
```

## 상태 머신 / 모달 시스템 (main.ts)

- `MachineState = 'IDLE' | 'DRAWING' | 'RESULT' | 'REACTED'`, `ModalKind = 'job' | 'form' | 'done'
  | 'rank'` (모달 안 열려 있으면 `modal`은 `undefined`).
- `allStories()` = 기본 10개(`stories100.json`) + `getCustomStories()`(로컬에 등록된 것). 뽑기 풀·
  재고 숫자·랭킹 모두 이 합계를 사용한다.
- `insertCoin()`: `DRAWING` 중엔 무시. 매 클릭마다 `coinClickCount` 증가 → 6의 배수면 `rank` 모달을
  열고 종료(코인은 삽입되지 않음). 그 외에 이미 `hasCoin`이면 색만 갱신(`updateControls()`)하고 끝.
  새로 채워지는 경우 `RESULT`/`REACTED`에서는 카드를 지우고 `IDLE`로 전체 재렌더, `IDLE`에서는
  컨트롤만 패치(카드가 없으니 `jam-drop` 재생 문제 없음).
- `startDrawing()`: 코인 소모. (`coinClickCount`는 뽑기와 무관하게 계속 누적됨 — 리셋 안 함.)
- `handleReaction()`: 기존처럼 `setReaction()`(이 브라우저의 "이미 반응함" 잠금, 카드당 1회 강제)
  + 새로 `bumpStat()`(전체 합산 잼/노잼 카운트, 랭킹용)을 같이 호출한다.
- 폼 검증은 `bindFormValidation()`이 `input` 이벤트로 처리(전체 재렌더 없음). 제출은
  `submitForm()`이 DOM에서 값을 직접 읽어(controlled state 없음) `addCustomStory()` 호출 후
  `done` 모달로 전환.

## 데이터 (localStorage 키)

| 키 | 내용 |
|---|---|
| `jam-machine:reactions` | `{ [storyId]: 'jam' \| 'nojam' }` — 이 브라우저의 카드별 반응 1회 잠금 |
| `jam-machine:lastStoryId` | 직전 뽑힌 스토리 id (연속 중복 방지용) |
| `jaemyae.custom.v1` | 이 브라우저가 등록한 커스텀 `Story[]` |
| `jaemyae.stats.v1` | `{ [storyId]: { jam: number, nojam: number } }` — 랭킹용 합산 카운트 |

- `src/data/stories100.json`: 기본 제공 10개, `{ id, title, category, content, author: '챗쮜피티' }`.
  99개 중 카테고리별로 고루 뽑은 것(동물/언어 2개씩, 나머지 1개씩) — 나머지 89개는 더 이상 안 씀.
- (예전에 있던 "소진 카운트"(`dispensedCount`, 뽑을수록 재고가 줄어드는 연출)는 제거함 — 새
  스펙에서 재고 숫자는 "뽑기 풀 전체 합계"로 표시하기로 바뀌었기 때문. `getDispensedCount`/
  `incrementDispensedCount`는 storage.ts에서 삭제됨.)

## 디자인 시스템 (손그림 낙서풍, doodle)

**정체성**: 실사 자판기 묘사 금지. 메인은 한 화면, 나머지는 모달. 라이선스 캐릭터 IP 금지 — 마스코트는
자체 도형만. 플레이스홀더/글자수 카운터/검증 문구도 넣지 않는다(폼 모달).

- **테두리**: 모든 면 3px `#22302B` 실선 (칩·작은 알약만 2px).
- **라운드**: 비대칭, 네 값 모두 다르게. 패널 `40/36/42/34` · 모달 `34/30/36/32` · 디스플레이 창
  `28/24/30/26` · 카드 `22/18/24/20` · 버튼 `24/20/26/22` · 입력 필드 `16/13/17/14`.
- **하드 섀도**: 패널 `0 8px 0`, 모달 `0 8px 0`, CTA·코인·모달CTA `0 6px 0`, 카드·반응버튼
  `0 4~5px 0`. 블러 섀도는 패널 바닥 그림자 하나만.
- **눌림 인터랙션**: hover `translateY(-1px)` + 섀도 +1px, active `translateY(4px)` + 섀도 +2px.
- **반짝이**: `✦`/`✧`, Gaegu, 패널 기준 절대배치 6개, 크기/색/딜레이 모두 다르게.
- **컬러** (아래 팔레트 외 색 추가 금지, 그라디언트·블러 섀도 남발 금지):
  | 용도 | 값 |
  |---|---|
  | 아웃라인/잉크 | `#22302B` |
  | 페이지 배경 | `#FBEFEF` |
  | 패널/모달 | `#F7F1DF` |
  | 입력·창 안쪽 | `#FFFDF6` · 카드 `#FFFFFF` |
  | CTA 활성 | `#F14E32` + 흰 텍스트 |
  | CTA 비활성 | `#E3DDCB` / 텍스트 `#A79F8C` |
  | 코인 무지개 | `#F14E32 #F2913D #F5C542 #13BD7E #3C8DE0 #7250C7` |
  | 코인(투입 전) | `#C9C4BA`, 슬롯 배경 `#FFE9A8` |
  | 마스코트 박스 | `#DFF6EC` · 뽑는 중 `#FFE9C9` |
  | 잼/노잼 선택 | `#DFF6EC` / `#FFE0D8` |
  | 보조/흐린 텍스트 | `#8A8078` / `#A79F8C` |
  | 점선 구분선 `#D8D2C2` · 빈 상태 테두리 `#C9C4BA` | |
  | 랭킹 메달 1/2/3 | `#F5C542` / `#E3DDCB` / `#F5A79B` |
- **타이포**: 본문 `'SpoqaHanSans','Malgun Gothic','Apple SD Gothic Neo',Helvetica,Arial,sans-serif`.
  포인트(워드마크·CTA·모달 제목·카드 타이틀·버튼 라벨)는 Google Fonts **Gaegu** 400/700. 워드마크
  2.3rem / 모달 제목 1.7rem / 모달 CTA 1.4rem(메인 CTA 1.3rem) / 필드 라벨 1.1rem / 안내 0.72rem.
  전역 `word-break: keep-all`.
- **반응형**: 모바일 우선, 패널/모달 `max-width: 400px`/`380px` 고정. 최소 터치 타깃 44px 이상
  (CTA 64px, 모달 CTA 58px, 코인 슬롯 74px, 모달 닫기 34px). `prefers-reduced-motion`에서
  bob/shake/twinkle 정지, 카드·모달 등장은 fade로 대체.
- **애니메이션**: `jam-drop`(카드·모달 등장) · `jam-shake`(뽑는 중) · `jam-bob`(마스코트/로딩점/코인)
  · `jam-blink`(눈 깜빡임) · `jam-fade`(전환) · `jam-twinkle`(반짝이).

## 백엔드 (Supabase — 연동 작업 진행 중, 2026-09-17 시작)

**사용자가 2026-09-17에 "Supabase부터 시작할거야"라고 명시적으로 시작을 지시함.** 아래 스키마는
실제 프로젝트에 **적용 완료**된 상태(SQL Editor로 실행함). 프론트 코드 쪽 연동(allStories/
submitForm/handleReaction/rank 모달 교체)은 진행 중 — 상태는 `task.md` 참고.

- Supabase 프로젝트: URL `https://ntnthopkdmlipflnawcg.supabase.co`, `.env.local`/GitHub Actions
  secrets에 연결 정보 설정 완료(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`),
  `@supabase/supabase-js` 설치 및 `src/supabaseClient.ts` 배선 완료.
- **스키마 설계가 두 번 바뀜**: (1) 최초 시도 — `jam_count`/`nojam_count` + RPC. (2) 한때 문서화했던
  `reactions`(`voter` + `unique(story_id, voter)`) + `story_stats` 뷰 방식. **(2)는 사용자가
  "로그인도 없는데 voter로 중복을 막는 게 의미가 없다"고 지적해서 폐기**하고, 다시 (1)과 같은 카운터
  방식으로 확정함(2026-09-17) — 다만 컬럼을 프론트 `Story` 타입(`title`/`content`/`category`/
  `author`)에 맞춰 재설계. **현재 실제로 적용된 스키마**:

  ```sql
  create table public.stories (
    id uuid primary key default gen_random_uuid(),
    title text,
    content text not null check (char_length(content) between 1 and 600),
    category text,
    author text not null default '챗쮜피티',
    jam_count integer not null default 0,
    nojam_count integer not null default 0,
    is_hidden boolean not null default false,
    created_at timestamptz not null default now()
  );

  alter table public.stories enable row level security;

  create policy stories_read on public.stories for select using (is_hidden = false);
  create policy stories_insert on public.stories for insert with check (true);

  create or replace function public.react_to_story(story_id uuid, reaction text)
  returns void
  language sql
  security definer
  set search_path = public
  as $$
    update public.stories
    set jam_count = jam_count + (case when reaction = 'jam' then 1 else 0 end),
        nojam_count = nojam_count + (case when reaction = 'nojam' then 1 else 0 end)
    where id = story_id and is_hidden = false and reaction in ('jam', 'nojam');
  $$;

  grant execute on function public.react_to_story(uuid, text) to anon;
  ```

  - **`reactions`/`voter`/`story_stats` 뷰는 만들지 않음** — 반응 중복 방지는 여전히 지금처럼
    **로컬(같은 브라우저, `jam-machine:reactions` 키)에서만** 처리한다. 서버는 그냥 카운트만 올림.
    이유: 회원가입이 없는 장난 프로젝트라 "누가 투표했는지"를 서버가 안다고 해서 부정 투표를
    막을 수 있는 게 아니고(localStorage 지우면 그만), 이 프로젝트 스코프에서 그 정도 방지는
    불필요하다고 판단함.
  - update/delete 정책 없음 → anon 키로는 카운트 직접 수정 불가, 오직 `react_to_story` RPC(SECURITY
    DEFINER)로만 증가 가능. 삭제는 여전히 대시보드에서 `is_hidden = true` 소프트 삭제(추후 기획).
  - **정리 완료**: 이전 세션이 만든 구버전 `stories` 테이블(id 17602, jam_count/nojam_count + RPC)과
    구 `react_to_story` 함수는 `drop table ... cascade` / `drop function`으로 삭제 후 위 스키마로
    재생성함(레코드 0개 상태였어서 데이터 손실 없음).
  - 프런트 반영 시 할 일: `allStories()` — 앱 시작 시 Supabase `stories` select로 교체(+ 로딩
    실패 시 "자판기 점검 중이에요" + 재시도 UI). `submitForm()` — `stories` insert. `handleReaction()`
    — `supabase.rpc('react_to_story', {story_id, reaction})` 호출(로컬 `jam-machine:reactions` 잠금은
    유지). `rank` 모달 — `stories`를 `jam_count`/`nojam_count` 기준으로 정렬 조회. 기본 제공 10개
    (`stories100.json`)는 이 테이블에 시드 insert 필요.

## 배포

- 저장소: https://github.com/soooru/jaemyae (public)
- `main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 자동으로 build → GitHub Pages 배포.
- 배포 URL: https://soooru.github.io/jaemyae/
- "push해줘 / 배포해줘"라고 하면 commit + push만 하면 됨. Actions가 나머지를 처리하며,
  `gh run watch`로 배포 성공 여부만 확인.
- Supabase 연동 시에도 이 파이프라인은 그대로 유지 — 관리형 서비스라 별도 배포 단계가 없고, 이미
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`가 로컬 `.env.local`과 GitHub Actions secrets에
  등록돼 있어 `deploy.yml` build 스텝에 env로 전달된다(코드에서 실제로 쓰기 시작하면 그대로 동작).
- **이터레이션 스타일**: 사용자가 구체적인 UX 문제나 원하는 카피를 던지면 → 수정 → (가능하면)
  빌드/스팟체크(+가능하면 브라우저로 직접 클릭해보고 확인) → 커밋 → push → 배포 확인까지 한 번에
  진행. 매번 재확인받지 않아도 됨. 사용자가 직접 파일을 고쳐놓는 경우도 있으니 그건 의도된 최신
  상태로 보고 그 위에서 이어서 작업.

## 하지 말 것

- 메뉴·탭·설정 등 추가 내비게이션 (메인은 한 화면, 나머지는 모달).
- native `alert`/`confirm` 사용.
- 입력 필드 플레이스홀더, 글자수 카운터, 검증 안내 문구(폼 모달).
- 순위표(rank) 상시 노출 버튼 — 코인이 보라색 되는 클릭(이스터에그)으로만 진입.
- 디자인 팔레트 외 색상 추가, 실사 자판기 묘사, 그라디언트/블러 섀도 남발.
- 라이선스 있는 캐릭터 IP 사용 — 마스코트는 자체 도형으로만.
- `.claude/` 디렉터리 내용을 커밋하거나 공개 저장소에 노출 (gitignore 유지).
