import './style.css';
import type { LoadState, MachineState, ModalKind, ReactionType, Story } from './types';
import { fetchStories, insertStory, reactToStory } from './api';
import {
  getLastStoryId,
  getReaction,
  setLastStoryId,
  setReaction,
} from './storage';

const DRAWING_DURATION_MS = 1800;
const LOADING_MESSAGES = [
  '덜컹...',
  '재밌는 얘기 찾는 중...',
  '잼얘 굴러가는 중...',
];
const LOADING_INTERVAL_MS = 700;

const RAINBOW_COLORS = [
  '#F14E32',
  '#F2913D',
  '#F5C542',
  '#13BD7E',
  '#3C8DE0',
  '#7250C7',
];
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const JOB_INFO = [
  ['근무처', '대기업 지사'],
  ['근무지', '남해'],
  ['일당', '100?만원'],
  ['복리', '숙식제공'],
];
// 워스트 잼얘 삭제 기능은 아직 미구현 — 버튼만 먼저 준비.
const CLEANER_ALERT_TEXT = '◆자판기 청소부 구함◆ $$일당두둑$$ →→ 모집 준비중!!';

let state: MachineState = 'IDLE';
let loadState: LoadState = 'loading';
let stories: Story[] = [];
let currentStory: Story | undefined;
let currentReaction: ReactionType | undefined;
let hasCoin = false;
let loadingTimer: ReturnType<typeof setInterval> | undefined;

let coinClickCount = 0;

let modal: ModalKind | undefined;
let formSubmitting = false;
let formError: string | undefined;
let resignSceneOpen = false;
let alertMessage: string | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;

function allStories(): Story[] {
  return stories;
}

async function loadStories(): Promise<void> {
  loadState = 'loading';
  render();
  try {
    stories = await fetchStories();
    loadState = 'ready';
  } catch (err) {
    console.error('잼얘 목록을 불러오지 못함:', err);
    loadState = 'error';
  }
  render();
}

function poolSize(): number {
  return allStories().length;
}

function pickRandomStory(excludeId: string | undefined): Story | undefined {
  const available = allStories();
  if (available.length === 0) return undefined;
  if (available.length === 1) return available[0];
  const candidates = available.filter((s) => s.id !== excludeId);
  const pool = candidates.length > 0 ? candidates : available;
  return pool[Math.floor(Math.random() * pool.length)];
}

function openModal(kind: ModalKind): void {
  modal = kind;
  if (kind === 'form') {
    formError = undefined;
    formSubmitting = false;
  }
  render();
}

function closeModal(): void {
  modal = undefined;
  render();
}

function openResignScene(): void {
  resignSceneOpen = true;
  render();
}

function closeResignScene(): void {
  resignSceneOpen = false;
  modal = undefined;
  state = 'IDLE';
  hasCoin = false;
  currentStory = undefined;
  currentReaction = undefined;
  render();
}

function showAlert(message: string): void {
  alertMessage = message;
  render();
}

function closeAlert(): void {
  alertMessage = undefined;
  render();
}

function insertCoin(): void {
  if (state === 'DRAWING') return;

  coinClickCount += 1;

  // The coin cycles red→orange→yellow→green→blue→purple; landing on purple
  // (every 6th click, cumulative — draws don't reset it) pops the ranking
  // modal instead of loading a coin, then the cycle naturally loops back to
  // red on the next click via the modulo in getControlsViewModel().
  if (coinClickCount % RAINBOW_COLORS.length === 0) {
    openModal('rank');
    return;
  }

  if (hasCoin) {
    // Already loaded — this click only cycled the rainbow color above.
    updateControls();
    return;
  }
  hasCoin = true;

  if (state === 'RESULT' || state === 'REACTED') {
    // Re-arming after a result clears the old card back to the mascot
    // screen instead of leaving it sitting there with a re-armed CTA.
    state = 'IDLE';
    currentReaction = undefined;
    render();
    return;
  }

  // Patch the controls in place instead of a full render() — re-rendering
  // the whole panel would recreate the story card element and replay its
  // jam-drop entrance animation, making it look like it "shakes".
  updateControls();
  if (state === 'IDLE') updateIdleHint();
}

function startDrawing(): void {
  if (!hasCoin || state === 'DRAWING') return;
  hasCoin = false;
  state = 'DRAWING';
  currentReaction = undefined;
  render();

  let msgIndex = 0;
  loadingTimer = setInterval(() => {
    msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
    const el = document.querySelector<HTMLElement>('[data-loading-text]');
    if (el) el.textContent = LOADING_MESSAGES[msgIndex];
  }, LOADING_INTERVAL_MS);

  setTimeout(() => {
    if (loadingTimer) clearInterval(loadingTimer);
    const next = pickRandomStory(currentStory?.id ?? getLastStoryId());
    currentStory = next;
    if (next) setLastStoryId(next.id);
    currentReaction = next ? getReaction(next.id) : undefined;
    state = next ? (currentReaction ? 'REACTED' : 'RESULT') : 'RESULT';
    render();
  }, DRAWING_DURATION_MS);
}

function handleReaction(reaction: ReactionType): void {
  if (!currentStory || currentReaction) return;
  const story = currentStory;
  setReaction(story.id, reaction);
  story[reaction] += 1;
  currentReaction = reaction;
  state = 'REACTED';
  render();

  reactToStory(story.id, reaction).catch((err) => {
    console.error('반응 전송 실패:', err);
  });
}

function getIdleHintHtml(): string {
  const hint = hasCoin
    ? '준비 완료! 잼얘 뽑기를 눌러보세요.'
    : '먼저 오른쪽 코인을 넣어주세요.';
  return `따쮜가 엄선하지 않은 잼얘가 <br/> <b class="idle-hint__count">${poolSize()}개</b> 들어 있어요.<br>${hint}`;
}

function updateIdleHint(): void {
  const hintEl = app.querySelector<HTMLElement>('.idle-hint');
  if (hintEl && poolSize() > 0) hintEl.innerHTML = getIdleHintHtml();
}

function renderLoadingState(): string {
  return `
    <div class="mascot-state">
      <div class="mascot">
        <div class="mascot__face">
          <div class="mascot__eyes">
            <span class="mascot__eye"></span>
            <span class="mascot__eye"></span>
          </div>
          <span class="mascot__mouth"></span>
        </div>
      </div>
      <p class="idle-hint">잼얘 불러오는 중...</p>
    </div>
  `;
}

function renderErrorState(): string {
  return `
    <div class="mascot-state empty-state">
      <p class="idle-hint">자판기 점검 중이에요.<br />잠시 후 다시 시도해주세요.</p>
      <button class="modal-cta" data-action="retry-load">다시 시도</button>
    </div>
  `;
}

function renderMascotOrEmpty(): string {
  if (poolSize() === 0) {
    return `
      <div class="mascot-state empty-state">
        <p class="idle-hint">앗, 자판기가 비었어요!</p>
      </div>
    `;
  }

  return `
    <div class="mascot-state">
      <div class="mascot">
        <div class="mascot__face">
          <div class="mascot__eyes">
            <span class="mascot__eye"></span>
            <span class="mascot__eye"></span>
          </div>
          <span class="mascot__mouth"></span>
        </div>
        <span class="mascot__sparkle">✦</span>
      </div>
      <p class="idle-hint">${getIdleHintHtml()}</p>
    </div>
  `;
}

function renderDrawing(): string {
  return `
    <div class="mascot-state">
      <div class="mascot mascot--drawing">
        <div class="mascot__search-box"></div>
      </div>
      <p class="loading-text" data-loading-text>${LOADING_MESSAGES[0]}</p>
      <div class="loading-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
}

function renderResultOrReacted(): string {
  if (!currentStory) return renderMascotOrEmpty();

  const jamSelected = currentReaction === 'jam';
  const nojamSelected = currentReaction === 'nojam';
  const reacted = state === 'REACTED';

  const jamClass = [
    'reaction-btn',
    'reaction-btn--jam',
    jamSelected ? 'is-selected' : '',
    reacted && !jamSelected ? 'is-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const nojamClass = [
    'reaction-btn',
    'reaction-btn--nojam',
    nojamSelected ? 'is-selected' : '',
    reacted && !nojamSelected ? 'is-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const thanksText = jamSelected
    ? '( 따쮜 상태 : 신남 )'
    : nojamSelected
      ? '( 따쮜 상태 : 슬픔 )'
      : '';

  return `
    <div class="card">
      <div class="card__head">
        <span class="card__title">${currentStory.title ?? '제목 없는 잼얘'}</span>
      </div>
      <p class="card__content">${currentStory.content}</p>
      <p class="card__author">— ${currentStory.author ?? '챗쮜피티'}</p>
    </div>
    <div class="reactions">
      <button class="${jamClass}" data-action="jam" ${reacted ? 'disabled' : ''}>잼 🙂</button>
      <button class="${nojamClass}" data-action="nojam" ${reacted ? 'disabled' : ''}>노잼 🫠</button>
    </div>
    ${reacted ? `<div class="thanks">${thanksText}</div>` : ''}
  `;
}

function getControlsViewModel() {
  const canDraw = hasCoin && state !== 'DRAWING' && loadState === 'ready' && poolSize() > 0;
  const ctaLabel =
    state === 'DRAWING'
      ? '뽑는 중...'
      : state === 'IDLE'
        ? '잼얘 뽑기'
        : '하나 더 뽑기';
  const ctaClass = [
    'cta',
    canDraw ? 'cta--active' : '',
    state === 'DRAWING' ? 'cta--drawing' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const coinSlotClass = `coin-slot ${hasCoin ? 'coin-slot--ready' : ''}`.trim();
  const coinClass = `coin ${hasCoin ? 'coin--ready' : ''}`.trim();
  const coinColor = hasCoin
    ? RAINBOW_COLORS[(coinClickCount - 1) % RAINBOW_COLORS.length]
    : '';
  const coinDisabled = state === 'DRAWING' || loadState !== 'ready';
  const coinLabel = hasCoin ? 'READY' : 'INSERT';
  const coinSlotBg = hasCoin ? hexToRgba(coinColor, 0.32) : '';

  return {
    canDraw,
    ctaLabel,
    ctaClass,
    coinSlotClass,
    coinClass,
    coinColor,
    coinSlotBg,
    coinDisabled,
    coinLabel,
  };
}

function updateControls(): void {
  const vm = getControlsViewModel();
  const cta = app.querySelector<HTMLButtonElement>('[data-action="draw"]');
  const coinBtn = app.querySelector<HTMLButtonElement>('[data-action="coin"]');
  if (!cta || !coinBtn) return;

  cta.className = vm.ctaClass;
  cta.disabled = !vm.canDraw;
  cta.innerHTML = vm.ctaLabel;

  coinBtn.className = vm.coinSlotClass;
  coinBtn.disabled = vm.coinDisabled;
  coinBtn.style.background = vm.coinSlotBg;
  const coinSpan = coinBtn.querySelector<HTMLElement>('.coin');
  if (coinSpan) {
    coinSpan.className = vm.coinClass;
    coinSpan.style.background = vm.coinColor;
  }
  const labelSpan = coinBtn.querySelector<HTMLElement>('.coin-slot__label');
  if (labelSpan) labelSpan.textContent = vm.coinLabel;
}

// ---- modals ----

function renderModalShell(title: string, bodyHtml: string): string {
  return `
    <div class="modal-overlay" data-action="modal-backdrop">
      <div class="modal" role="dialog" aria-modal="true">
        <button class="modal__close" data-action="modal-close" aria-label="닫기">✕</button>
        <h2 class="modal__title">${title}</h2>
        ${bodyHtml}
      </div>
    </div>
  `;
}

function renderResignScene(): string {
  if (!resignSceneOpen) return '';
  return `
    <div class="resign-overlay">
      <div class="resign-scene">
        <p>나는 무거운 눈을 깜빡였다.</p>
        <p class="resign-scene__sfx">위이이이잉!</p>
        <p>기계 돌아가는 소리가 요란하게 난다.<br />나는 고개를 돌렸다.</p>
        <p class="resign-scene__bracket">[ 스티커 제거 ]</p>
        <p>...저게 뭐지?<br />나는 눈을 깜빡였다.<br />그러자 눈 앞에 번뜩이는 패널이 보였다.</p>
        <p><span class="resign-scene__flash">재활용</span></p>
        <p>...아.</p>
        <button class="modal-cta" data-action="resign-confirm">[ 눈 앞의 자판기를 응시하기 ]</button>
      </div>
    </div>
  `;
}

function renderAlertOverlay(): string {
  if (!alertMessage) return '';
  return `
    <div class="alert-overlay" data-action="alert-backdrop">
      <div class="alert-box" role="alertdialog" aria-modal="true">
        <p class="alert-box__message">${alertMessage}</p>
        <button class="modal-cta" data-action="alert-close">확인</button>
      </div>
    </div>
  `;
}

function renderJobModal(): string {
  const infoRows = JOB_INFO.map(
    ([label, value]) =>
      `<div class="job-info__row"><span class="job-info__label">${label}</span><span class="job-info__value">${value}</span></div>`,
  ).join('');

  return renderModalShell(
    '채용공고',
    `
      <span class="job-badge">급 구</span>
      <p class="job-subtitle">쩨리에게 줄 잼얘 채울<br />현장직을 모집합니다</p>
      <div class="job-info">${infoRows}</div>
      <button class="modal-cta" data-action="job-apply">지원하기</button>
    `,
  );
}

function renderFormModal(): string {
  const errorHtml = formError
    ? `<p class="field__hint field__hint--error" data-form-error>${formError}</p>`
    : '';
  return renderModalShell(
    '잼얘 채우기',
    `
      <div class="field">
        <label class="field__label" for="form-author">작업자</label>
        <input class="field__input" id="form-author" maxlength="20" data-field="author" ${formSubmitting ? 'disabled' : ''} />
      </div>
      <div class="field">
        <label class="field__label" for="form-title">제목</label>
        <input class="field__input" id="form-title" maxlength="40" data-field="title" ${formSubmitting ? 'disabled' : ''} />
      </div>
      <div class="field">
        <label class="field__label" for="form-body">
          잼얘 본문 <span class="field__hint">추천: 5문장 이내</span>
        </label>
        <textarea class="field__input field__input--area" id="form-body" rows="5" data-field="body" ${formSubmitting ? 'disabled' : ''}></textarea>
      </div>
      ${errorHtml}
      <button class="modal-cta" data-action="form-submit" disabled>${formSubmitting ? '등록 중...' : '자판기에 넣기'}</button>
    `,
  );
}

function renderDoneModal(): string {
  return renderModalShell(
    '작업 완료',
    `
      <div class="mascot-state">
        <div class="mascot">
          <div class="mascot__face">
            <div class="mascot__eyes">
              <span class="mascot__eye"></span>
              <span class="mascot__eye"></span>
            </div>
            <span class="mascot__mouth"></span>
          </div>
        </div>
        <p class="idle-hint">작업 완료! / 잼얘 하나가 들어갔어요.<br />이제 자판기에서 뽑힐 수 있어요.</p>
      </div>
      <div class="modal-cta-group">
        <button class="modal-cta modal-cta--compact" data-action="done-again">하나 더</button>
        <button class="modal-cta modal-cta--compact modal-cta--secondary" data-action="resign">퇴사하기</button>
      </div>
    `,
  );
}

const MEDALS = ['#F5C542', '#E3DDCB', '#F5A79B'];

function renderRankModal(): string {
  const rows = allStories();
  const totalVotes = rows.reduce((sum, row) => sum + row.jam + row.nojam, 0);

  if (totalVotes === 0) {
    return renderModalShell(
      '잼얘 순위표',
      `
        <p class="modal-subtitle">지금까지 0표가 모였어요</p>
        <div class="empty-box">아직 반응이 없어요</div>
      `,
    );
  }

  const best = [...rows].sort((a, b) => b.jam - a.jam).slice(0, 3);
  const worst = [...rows].sort((a, b) => b.nojam - a.nojam).slice(0, 3);

  const withBody = (group: Story[], countKey: 'jam' | 'nojam') =>
    group
      .map(
        (story, i) => `
          <div class="rank-item">
            <div class="rank-item__head">
              <span class="rank-medal" style="background:${MEDALS[i]}">${i + 1}</span>
              <span class="rank-item__title">${story.title ?? '제목 없는 잼얘'}</span>
              <span class="rank-item__by">by ${story.author ?? '챗쮜피티'}</span>
              <span class="rank-item__count">${story[countKey]}표</span>
            </div>
            <p class="rank-item__body">${story.content}</p>
          </div>
        `,
      )
      .join('');

  return renderModalShell(
    '잼얘 순위표',
    `
      <p class="modal-subtitle">지금까지 ${totalVotes}표가 모였어요</p>
      <div class="rank-group">
        <span class="rank-group__badge rank-group__badge--best">베스트 잼얘</span>
        <div class="rank-stack">${withBody(best, 'jam')}</div>
      </div>
      <div class="rank-group">
        <span class="rank-group__badge rank-group__badge--worst">워스트 잼얘</span>
        <div class="rank-stack">${withBody(worst, 'nojam')}</div>
      </div>
    `,
  );
}

function renderModal(): string {
  if (!modal) return '';
  switch (modal) {
    case 'job':
      return renderJobModal();
    case 'form':
      return renderFormModal();
    case 'done':
      return renderDoneModal();
    case 'rank':
      return renderRankModal();
    default:
      return '';
  }
}

function updateFormModal(): void {
  const modalEl = app.querySelector<HTMLElement>('.modal');
  if (!modalEl) return;
  const submitBtn = modalEl.querySelector<HTMLButtonElement>('[data-action="form-submit"]');
  const authorEl = modalEl.querySelector<HTMLInputElement>('[data-field="author"]');
  const titleEl = modalEl.querySelector<HTMLInputElement>('[data-field="title"]');
  const bodyEl = modalEl.querySelector<HTMLTextAreaElement>('[data-field="body"]');
  for (const el of [authorEl, titleEl, bodyEl]) {
    if (el) el.disabled = formSubmitting;
  }
  if (submitBtn) {
    submitBtn.textContent = formSubmitting ? '등록 중...' : '자판기에 넣기';
    const valid = Boolean(
      authorEl?.value.trim() && titleEl?.value.trim() && bodyEl?.value.trim(),
    );
    submitBtn.disabled = formSubmitting || !valid;
  }
  let errorEl = modalEl.querySelector<HTMLElement>('[data-form-error]');
  if (formError) {
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'field__hint field__hint--error';
      errorEl.setAttribute('data-form-error', '');
      submitBtn?.insertAdjacentElement('beforebegin', errorEl);
    }
    errorEl.textContent = formError;
  } else if (errorEl) {
    errorEl.remove();
  }
}

async function submitForm(): Promise<void> {
  if (formSubmitting) return;
  const authorEl = app.querySelector<HTMLInputElement>('[data-field="author"]');
  const titleEl = app.querySelector<HTMLInputElement>('[data-field="title"]');
  const bodyEl = app.querySelector<HTMLTextAreaElement>('[data-field="body"]');
  const author = authorEl?.value.trim();
  const title = titleEl?.value.trim();
  const body = bodyEl?.value.trim();
  if (!author || !title || !body) return;

  formSubmitting = true;
  formError = undefined;
  updateFormModal();

  try {
    const story = await insertStory({ title, content: body, author });
    stories.push(story);
    formSubmitting = false;
    openModal('done');
  } catch (err) {
    console.error('잼얘 등록 실패:', err);
    formSubmitting = false;
    formError = '어이쿠, 등록에 실패했어요. 다시 시도해주세요.';
    updateFormModal();
  }
}

function bindFormValidation(): void {
  const form = app.querySelector<HTMLElement>('.modal');
  const submitBtn = app.querySelector<HTMLButtonElement>(
    '[data-action="form-submit"]',
  );
  if (!form || !submitBtn) return;

  const checkValid = () => {
    const authorEl = form.querySelector<HTMLInputElement>('[data-field="author"]');
    const titleEl = form.querySelector<HTMLInputElement>('[data-field="title"]');
    const bodyEl = form.querySelector<HTMLTextAreaElement>('[data-field="body"]');
    const valid = Boolean(
      authorEl?.value.trim() && titleEl?.value.trim() && bodyEl?.value.trim(),
    );
    submitBtn.disabled = !valid;
  };

  form.addEventListener('input', checkValid);
}

function render(): void {
  const displayBody =
    loadState === 'loading'
      ? renderLoadingState()
      : loadState === 'error'
        ? renderErrorState()
        : state === 'IDLE'
          ? renderMascotOrEmpty()
          : state === 'DRAWING'
            ? renderDrawing()
            : renderResultOrReacted();

  const { ctaClass, canDraw, ctaLabel, coinSlotClass, coinClass, coinColor, coinSlotBg, coinDisabled, coinLabel } =
    getControlsViewModel();

  app.innerHTML = `
    <div class="page">
      <div class="panel">
        <span class="sparkle sparkle--1">✦</span>
        <span class="sparkle sparkle--2">✦</span>
        <span class="sparkle sparkle--3">✧</span>
        <span class="sparkle sparkle--4">✦</span>
        <span class="sparkle sparkle--5">✧</span>
        <span class="sparkle sparkle--6">✦</span>

        <div class="panel__header">
          <p class="panel__eyebrow">쩨리를 위한</p>
          <h1 class="panel__title">잼얘자판기</h1>
        </div>
        <div class="panel__divider"></div>

        <div class="display">
          ${displayBody}
        </div>

        <div class="controls">
          <button class="${ctaClass}" data-action="draw" ${canDraw ? '' : 'disabled'}>${ctaLabel}</button>
          <button class="${coinSlotClass}" data-action="coin" style="background:${coinSlotBg}" ${coinDisabled ? 'disabled' : ''}>
            <span class="${coinClass}" style="background:${coinColor}"><span class="coin__slit"></span></span>
            <span class="coin-slot__label">${coinLabel}</span>
          </button>
        </div>
      </div>

      <div class="bottom-row">
        <button class="easter-egg" data-action="job">인력급구!인력급구!인력급구!</button>
        <button class="icon-btn" data-action="cleaner-job" aria-label="자판기 청소부 구함">🧹</button>
      </div>
    </div>
    ${renderModal()}
    ${renderResignScene()}
    ${renderAlertOverlay()}
  `;

  app
    .querySelector('[data-action="draw"]')
    ?.addEventListener('click', startDrawing);
  app
    .querySelector('[data-action="coin"]')
    ?.addEventListener('click', insertCoin);
  app
    .querySelector('[data-action="jam"]')
    ?.addEventListener('click', () => handleReaction('jam'));
  app
    .querySelector('[data-action="nojam"]')
    ?.addEventListener('click', () => handleReaction('nojam'));
  app
    .querySelector('[data-action="job"]')
    ?.addEventListener('click', () => openModal('job'));

  app
    .querySelector('[data-action="modal-close"]')
    ?.addEventListener('click', closeModal);
  app
    .querySelector('[data-action="modal-backdrop"]')
    ?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget && modal !== 'form') closeModal();
    });
  app
    .querySelector('[data-action="job-apply"]')
    ?.addEventListener('click', () => openModal('form'));
  app
    .querySelector('[data-action="form-submit"]')
    ?.addEventListener('click', submitForm);
  app
    .querySelector('[data-action="done-again"]')
    ?.addEventListener('click', () => openModal('form'));
  app
    .querySelector('[data-action="retry-load"]')
    ?.addEventListener('click', () => {
      loadStories();
    });
  app
    .querySelector('[data-action="resign"]')
    ?.addEventListener('click', openResignScene);
  app
    .querySelector('[data-action="resign-confirm"]')
    ?.addEventListener('click', closeResignScene);
  app
    .querySelector('[data-action="cleaner-job"]')
    ?.addEventListener('click', () => showAlert(CLEANER_ALERT_TEXT));
  app
    .querySelector('[data-action="alert-close"]')
    ?.addEventListener('click', closeAlert);
  app
    .querySelector('[data-action="alert-backdrop"]')
    ?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeAlert();
    });

  if (modal === 'form') bindFormValidation();
}

loadStories();
