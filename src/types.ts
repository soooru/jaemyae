export interface Story {
  id: string
  title?: string
  content: string
  category?: string
}

export type MachineState = 'IDLE' | 'DRAWING' | 'RESULT' | 'REACTED'

export type ReactionType = 'jam' | 'nojam'

export type ReactionMap = Record<string, ReactionType>
