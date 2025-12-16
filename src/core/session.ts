import { GameState } from "./GameState.ts";

let activeGameState: GameState | null = null;

export function setActiveGameState(state: GameState): void {
  activeGameState = state;
}

export function getActiveGameState(): GameState | null {
  return activeGameState;
}

export function clearActiveGameState(): void {
  activeGameState = null;
}
