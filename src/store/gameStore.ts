import { create } from 'zustand'
import type { GameState, PlayersMap, ShuttlecocksMap } from '../types/game'


interface StoreState {
  myId: string
  nickname: string
  joined: boolean
  players: PlayersMap
  shuttlecocks: ShuttlecocksMap


  setMyId: (id: string) => void
  setNickname: (name: string) => void
  setJoined: (v: boolean) => void
  applyGameState: (s: GameState) => void
  reset: () => void
}


export const useGameStore = create<StoreState>((set) => ({
  myId: '',
  nickname: '',
  joined: false,
  players: {},
  shuttlecocks: {},


  setMyId: (id) => set({ myId: id }),
  setNickname: (name) => set({ nickname: name }),
  setJoined: (v) => set({ joined: v }),
  applyGameState: (s) => set({ players: s.players ?? {}, shuttlecocks: s.shuttlecocks ?? {} }),
  reset: () => set({ players: {}, shuttlecocks: {}, joined: false, nickname: '', myId: '' }),
}))
