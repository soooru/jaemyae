import type { ReactionMap, ReactionType } from './types'

const REACTIONS_KEY = 'jam-machine:reactions'
const LAST_STORY_KEY = 'jam-machine:lastStoryId'
const DISPENSED_COUNT_KEY = 'jam-machine:dispensedCount'

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage unavailable (private mode, quota, etc). Reactions just
    // won't persist across reloads; the app still works.
  }
}

export function getReactions(): ReactionMap {
  return safeGet<ReactionMap>(REACTIONS_KEY, {})
}

export function getReaction(storyId: string): ReactionType | undefined {
  return getReactions()[storyId]
}

export function setReaction(storyId: string, reaction: ReactionType): void {
  const reactions = getReactions()
  reactions[storyId] = reaction
  safeSet(REACTIONS_KEY, reactions)
}

export function getLastStoryId(): string | undefined {
  return safeGet<string | undefined>(LAST_STORY_KEY, undefined)
}

export function setLastStoryId(storyId: string): void {
  safeSet(LAST_STORY_KEY, storyId)
}

export function getDispensedCount(): number {
  return safeGet<number>(DISPENSED_COUNT_KEY, 0)
}

export function incrementDispensedCount(): number {
  const next = getDispensedCount() + 1
  safeSet(DISPENSED_COUNT_KEY, next)
  return next
}
