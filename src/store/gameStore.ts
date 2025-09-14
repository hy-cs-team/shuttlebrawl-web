import { create } from 'zustand';
import type { GameState, PlayersMap, ShuttlecocksMap } from '../types/game';

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
	applyGameState: (s) =>
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
