export enum EntityType {
  TEAM = 'TEAM',
  PLAYER = 'PLAYER',
  COACH = 'COACH',
  TROPHY = 'TROPHY',
  NATIONAL_TEAM = 'NATIONAL_TEAM',
  YEAR = 'YEAR'
}

export enum Difficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export interface GameEntity {
  name: string;
  type: EntityType;
  description?: string; // e.g. "2010 World Cup" or "Real Madrid"
  imageUrl?: string;
  color?: string; // Hex code
}

export interface Challenge {
  id: string;
  cardA: GameEntity;
  cardB: GameEntity;
  // We don't store the answer on the client to prevent cheating, 
  // we validate via API, but we keep a hidden hint if needed later.
  possibleAnswers?: string[]; 
}

export enum GameStatus {
  IDLE = 'IDLE',
  LOADING_CHALLENGE = 'LOADING_CHALLENGE',
  PLAYING = 'PLAYING',
  VALIDATING = 'VALIDATING',
  GAME_OVER = 'GAME_OVER'
}

export interface GameState {
  status: GameStatus;
  score: number;
  timeLeft: number;
  currentChallenge: Challenge | null;
  message: string | null;
  difficulty: Difficulty;
  history: {
    question: string;
    answer: string;
    isCorrect: boolean;
  }[];
  seenEntities: string[]; // Track seen entities to avoid repetition
}