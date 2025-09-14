import { create } from 'zustand';
import type {
	GameState,
	GameStateLegacy,
	PlayersMap,
	ShuttlecocksMap,
	PauseReason,
} from '../types/game';

interface StoreState {
	myId: string;
	nickname: string;
	joined: boolean;
	paused: boolean;
	players: PlayersMap;
	shuttlecocks: ShuttlecocksMap;
	pauseReason: PauseReason | null;
	setMyId: (id: string) => void;
	setNickname: (name: string) => void;
	setJoined: (v: boolean) => void;
	applyGameState: (s: GameState) => void;
	initializeGame: (s: GameStateLegacy) => void;
	openPause: (reason?: PauseReason) => void;
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
	pauseReason: null,

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

	openPause: (reason = 'pause') => set({ paused: true, pauseReason: reason }),
	closePause: () => set({ paused: false, pauseReason: null }),
	togglePause: () => {
		const { paused, pauseReason } = get();
		// When dead, do not allow toggling via ESC
		if (pauseReason === 'dead') return;
		set({ paused: !paused, pauseReason: !paused ? 'pause' : null });
	},

	reset: () =>
		set({
			players: {},
			shuttlecocks: {},
			joined: false,
			paused: false,
			pauseReason: null,
			nickname: '',
			myId: '',
		}),
}));
