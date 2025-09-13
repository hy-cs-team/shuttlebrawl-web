import { io, Socket } from 'socket.io-client'
import { SERVER_URL } from '../config'
import type { MovementKeys } from '../types/game'


class SocketManager {
private socket?: Socket
private movementTimer?: number
private keys: MovementKeys = { up: false, down: false, left: false, right: false }


connect() {
if (!this.socket) {
this.socket = io(SERVER_URL, {
transports: ['websocket'],
autoConnect: true,
})
}
return this.socket
}


get instance() {
if (!this.socket) throw new Error('Socket not connected yet')
return this.socket
}


setKeys(next: Partial<MovementKeys>) {
this.keys = { ...this.keys, ...next }
}


startMovementLoop() {
if (this.movementTimer) return
// 60Hz movement emit loop
this.movementTimer = window.setInterval(() => {
this.instance.emit('playerMovement', this.keys)
}, 1000 / 60)
}


stopMovementLoop() {
if (this.movementTimer) {
clearInterval(this.movementTimer)
this.movementTimer = undefined
}
}


joinGame(nickname: string) {
this.instance.emit('joinGame', { nickname })
}


swing(angle: number, button: number) {
this.instance.emit('playerSwing', { angle, button })
}
}


export const socketManager = new SocketManager()