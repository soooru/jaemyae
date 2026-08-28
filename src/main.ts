import './style.css';
import storiesData from './data/stories100.json';
import type { MachineState, ReactionType, Story } from './types';
import {
  getLastStoryId,
  getReaction,
  setLastStoryId,
  setReaction,
} from './storage';

const stories = storiesData as Story[];

const DRAWING_DURATION_MS = 1800;
const LOADING_MESSAGES = [
  '덜컹...',
  '재밌는 얘기 찾는 중...',
  '잼얘 굴러가는 중...',
];
const LOADING_INTERVAL_MS = 700;

const REFILL_ALERT =
  '쩨리에게 줄 잼얘 채울 현장직을 모집합니다\n 대기업 쥐사 / 남해 근무 \n 일당 100?만원 / 숙식제공 ';

let state: MachineState = 'IDLE';
let currentStory: Story | undefined;
let currentReaction: ReactionType | undefined;
let hasCoin = false;
let showRefillAlert = false;
let loadingTimer: ReturnType<typeof setInterval> | undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;

function pickRandomStory(excludeId: string | undefined): Story | undefined {
  if (stories.length === 0) return undefined;
  if (stories.length === 1) return stories[0];
  const candidates = stories.filter((s) => s.id !== excludeId);
  const pool = candidates.length > 0 ? candidates : stories;
  return pool[Math.floor(Math.random() * pool.length)];
}

function insertCoin(): void {
  if (hasCoin || state === 'DRAWING') return;
  hasCoin = true;
  render();
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
  setReaction(currentStory.id, reaction);
  currentReaction = reaction;
  state = 'REACTED';
  render();
}

function renderMascotOrEmpty(): string {
  if (stories.length === 0) {
    return `
      <div class="mascot-state empty-state">
        <p class="idle-hint">앗, 자판기가 비었어요!</p>
      </div>
    `;
  }

  const hint = hasCoin
    ? '준비 완료! 잼얘 뽑기를 눌러보세요.'
    : '먼저 오른쪽 코인을 넣어주세요.';

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
      <p class="idle-hint">따쮜가 엄선하지 않은 잼얘가 <br/> <b class="idle-hint__count">${stories.length}개</b> 들어 있어요.<br>${hint}</p>
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
    ? '반응 고마워!'
    : nojamSelected
      ? '반응 고마워! 다음엔 더 잼있는 걸로.'
      : '';

  return `
    <div class="card">
      <div class="card__head">
        <span class="card__title">${currentStory.title ?? '오늘의 잼얘'}</span>
      </div>
      <p class="card__content">${currentStory.content}</p>
    </div>
    <div class="reactions">
      <button class="${jamClass}" data-action="jam" ${reacted ? 'disabled' : ''}>잼 🙂</button>
      <button class="${nojamClass}" data-action="nojam" ${reacted ? 'disabled' : ''}>노잼 🫠</button>
    </div>
    ${reacted ? `<div class="thanks">${thanksText}</div>` : ''}
  `;
}

function openRefillAlert(): void {
  showRefillAlert = true;
  render();
}

function closeRefillAlert(): void {
  showRefillAlert = false;
  render();
}

function renderRefillAlert(): string {
  if (!showRefillAlert) return '';
  const lines = REFILL_ALERT.trim()
    .split('\n')
    .map((line) => `<p class="alert-box__line">${line}</p>`)
    .join('');

  return `
    <div class="alert-overlay" data-action="alert-backdrop">
      <div class="alert-box" role="alertdialog" aria-modal="true">
        <span class="alert-box__icon">⚠</span>
        <p class="alert-box__title">급구</p>
        <div class="alert-box__body">${lines}</div>
        <button class="alert-box__close" data-action="alert-close">확인</button>
      </div>
    </div>
  `;
}

function render(): void {
  const displayBody =
    state === 'IDLE'
      ? renderMascotOrEmpty()
      : state === 'DRAWING'
        ? renderDrawing()
        : renderResultOrReacted();

  const canDraw = hasCoin && state !== 'DRAWING' && stories.length > 0;
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
          <button
            class="coin-slot ${hasCoin ? 'coin-slot--ready' : ''}"
            data-action="coin"
            ${hasCoin || state === 'DRAWING' ? 'disabled' : ''}
          >
            <span class="coin ${hasCoin ? 'coin--ready' : ''}"><span class="coin__slit"></span></span>
            <span class="coin-slot__label">${hasCoin ? 'READY' : 'INSERT'}</span>
          </button>
        </div>
      </div>

      <button class="easter-egg" data-action="refill">인력급구!인력급구!인력급구!</button>
    </div>
    ${renderRefillAlert()}
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
    .querySelector('[data-action="refill"]')
    ?.addEventListener('click', openRefillAlert);
  app
    .querySelector('[data-action="alert-close"]')
    ?.addEventListener('click', closeRefillAlert);
  app
    .querySelector('[data-action="alert-backdrop"]')
    ?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeRefillAlert();
    });
}

render();
