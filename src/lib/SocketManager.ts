import { io, Socket } from "socket.io-client";
import { SERVER_URL } from "../config";
import type { MovementKeys } from "../types/game";

class SocketManager {
  private socket?: Socket;
  private movementTimer?: number;
  private keys: MovementKeys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  private previousKeys: MovementKeys = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  connect() {
    if (!this.socket) {
      this.socket = io(SERVER_URL, {
        transports: ["websocket"],
        autoConnect: true,
      });
    }
    return this.socket;
  }

  get instance() {
    if (!this.socket) throw new Error("Socket not connected yet");
    return this.socket;
  }

  setKeys(next: Partial<MovementKeys>) {
    this.keys = { ...this.keys, ...next };
  }

  startMovementLoop() {
    if (this.movementTimer) return;

    this.movementTimer = window.setInterval(() => {
      if (
        this.keys.up !== this.previousKeys.up ||
        this.keys.down !== this.previousKeys.down ||
        this.keys.left !== this.previousKeys.left ||
        this.keys.right !== this.previousKeys.right
      ) {
        this.instance.emit("playerMovement", this.keys);
        this.previousKeys = { ...this.keys };
      }
    }, 1000 / 60);
  }

  stopMovementLoop() {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = undefined;
    }
  }

  joinGame(nickname: string) {
    this.instance.emit("joinGame", { nickname });
  }

  leaveGame() {
    this.socket?.emit("leaveGame");
  }

  swing(angle: number, button: number) {
    this.instance.emit("playerSwing", { angle, button });
  }

  upgrade(type: number) {
    this.instance.emit("playerUpgrade", { type });
  }

  use(useId: string) {
    this.instance.emit("playerUse", { useId });
  }
}

export const socketManager = new SocketManager();
