import { supabase } from './supabaseClient'
import type { ReactionType, Story } from './types'

interface StoryRow {
  id: string
  title: string | null
  content: string
  category: string | null
  author: string
  jam_count: number
  nojam_count: number
}

const STORY_COLUMNS = 'id, title, content, category, author, jam_count, nojam_count'

function toStory(row: StoryRow): Story {
  return {
    id: row.id,
    title: row.title ?? undefined,
    content: row.content,
    category: row.category ?? undefined,
    author: row.author,
    jam: row.jam_count,
    nojam: row.nojam_count,
  }
}

export async function fetchStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select(STORY_COLUMNS)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as StoryRow[]).map(toStory)
}

export async function insertStory(input: {
  title: string
  content: string
  author: string
}): Promise<Story> {
  const { data, error } = await supabase
    .from('stories')
    .insert(input)
    .select(STORY_COLUMNS)
    .single()
  if (error) throw error
  return toStory(data as StoryRow)
}

export async function reactToStory(storyId: string, reaction: ReactionType): Promise<void> {
  const { error } = await supabase.rpc('react_to_story', {
    story_id: storyId,
    reaction,
  })
  if (error) throw error
}
