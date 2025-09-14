import { create } from 'zustand';
import type { GameState, GameStateLegacy, PlayersMap, ShuttlecocksMap } from '../types/game';

interface StoreState {
  myId: string;
  nickname: string;
  joined: boolean;
  paused: boolean;
  players: PlayersMap;
  shuttlecocks: ShuttlecocksMap;

  setMyId: (id: string) => void;
  setNickname: (name: string) => void;
  setJoined: (v: boolean) => void;
  applyGameState: (s: GameState) => void;
  initializeGame: (s: GameStateLegacy) => void;
  openPause: () => void;
  closePause: () => void;
  togglePause: () => void;
  reset: () => void;
}

export const useGameStore = create<StoreState>((set, get) => ({
  myId: '',
  nickname: '',
  joined: false,
  paused: false,
  players: {},
  shuttlecocks: {},

  setMyId: (id) => set({ myId: id }),
  setNickname: (name) => set({ nickname: name }),
  setJoined: (v) => set({ joined: v }),
  applyGameState: (delta) => {
    set((state) => {
      const newPlayers = { ...state.players };
      const newShuttlecocks = { ...state.shuttlecocks };

      if (delta.players) {
        for (const id in delta.players) {
          const partialData = delta.players[id];
          if (partialData === null) {
            delete newPlayers[id];
          } else {
            newPlayers[id] = { ...newPlayers[id], ...partialData };
          }
        }
      }

      if (delta.shuttlecocks) {
        for (const id in delta.shuttlecocks) {
          const partialData = delta.shuttlecocks[id];
          if (partialData === null) {
            delete newShuttlecocks[id];
          } else {
            newShuttlecocks[id] = { ...newShuttlecocks[id], ...partialData };
          }
        }
      }

      return { players: newPlayers, shuttlecocks: newShuttlecocks };
    });
  },
  initializeGame: (s) =>
    set({ players: s.players ?? {}, shuttlecocks: s.shuttlecocks ?? {} }),

  openPause: () => set({ paused: true }),
  closePause: () => set({ paused: false }),
  togglePause: () => set({ paused: !get().paused }),

  reset: () =>
    set({
      players: {},
      shuttlecocks: {},
      joined: false,
      paused: false,
      nickname: '',
      myId: '',
    }),
}));
