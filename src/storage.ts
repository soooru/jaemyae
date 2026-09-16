import type { ReactionMap, ReactionType, StatsMap, Story } from './types'

const REACTIONS_KEY = 'jam-machine:reactions'
const LAST_STORY_KEY = 'jam-machine:lastStoryId'
const CUSTOM_STORIES_KEY = 'jaemyae.custom.v1'
const STATS_KEY = 'jaemyae.stats.v1'

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

export function getCustomStories(): Story[] {
  return safeGet<Story[]>(CUSTOM_STORIES_KEY, [])
}

export function addCustomStory(story: Story): void {
  const stories = getCustomStories()
  stories.push(story)
  safeSet(CUSTOM_STORIES_KEY, stories)
}

export function removeCustomStory(storyId: string): void {
  const stories = getCustomStories().filter((story) => story.id !== storyId)
  safeSet(CUSTOM_STORIES_KEY, stories)
}

export function getStats(): StatsMap {
  return safeGet<StatsMap>(STATS_KEY, {})
}

export function bumpStat(storyId: string, reaction: ReactionType): void {
  const stats = getStats()
  const entry = stats[storyId] ?? { jam: 0, nojam: 0 }
  entry[reaction] += 1
  stats[storyId] = entry
  safeSet(STATS_KEY, stats)
}

export function resetStats(): void {
  safeSet(STATS_KEY, {})
}
