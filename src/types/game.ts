// src/types/game.ts
export type Movement = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};

export type PlayerBase = {
  id: string;
  x: number;
  y: number;
  nickname: string;
  hp: number;
  maxHp: number;
  color?: string; // server-provided player color
};

export type Player = PlayerBase &
{
  exp: number;
  level: number;
  movement: Movement;
  racketSize: number;
  swingSpeed: number;
  swingPower: number;
  moveSpeed: number;

  isSwinging: boolean;
  swingAngle: number;
  swingTimer: number;
  swingDirection: number; // 1 or -1
  stunTimer: number;
} &
  Record<string, unknown>;

export type Shuttlecock = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string | null;
};

// Note: the map key is still string because JSON object keys are strings.
export type PlayersMap = Record<string, Player>;
export type ShuttlecocksMap = Record<string, Shuttlecock>;

export type GameStateLegacy = {
  players: PlayersMap;
  shuttlecocks: ShuttlecocksMap;
};

export type MovementKeys = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
};
