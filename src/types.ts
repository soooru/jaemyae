export interface Story {
  id: string
  title?: string
  content: string
  category?: string
  author?: string
  jam: number
  nojam: number
}

export type MachineState = 'IDLE' | 'DRAWING' | 'RESULT' | 'REACTED'

export type ReactionType = 'jam' | 'nojam'

export type ReactionMap = Record<string, ReactionType>

export type ModalKind = 'job' | 'form' | 'done' | 'rank'

export type LoadState = 'loading' | 'ready' | 'error'
