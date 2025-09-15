import { useEffect, useRef } from "react";
import JoinUI from "./components/JoinUI";
import GameCanvas from "./components/GameCanvas";
import { useGameStore } from "./store/gameStore";
import { socketManager } from "./lib/SocketManager";
import Minimap from "./components/Minimap";
import PlayerList from "./components/PlayerList";
import UpgradeUI from "./components/UpgradeUI";
import PauseDialog from "./components/PauseDialog";
import ExpHUD from "./components/ExpHUD";
import SoundControls from "./components/audio/SoundControls";
import AudioGate from "./components/audio/AudioGate";
import { audio } from "./lib/AudioManager";

export default function App() {
  const joined = useGameStore(s => s.joined);
  const paused = useGameStore(s => s.paused);
  const pauseReason = useGameStore(s => s.pauseReason);
  const openPause = useGameStore(s => s.openPause);
  const closePause = useGameStore(s => s.closePause);
  const togglePause = useGameStore(s => s.togglePause);
  const reset = useGameStore(s => s.reset);

  const applyGameState = useGameStore(s => s.applyGameState);
  const applyInitializeGame = useGameStore(s => s.initializeGame);
  const setMyId = useGameStore(s => s.setMyId);
  const myId = useGameStore(s => s.myId);
  const myHp = useGameStore(s => s.players[myId]?.hp);

  // 0) Init audio manifest once
  useEffect(() => {
    audio.init({
      bgm_lobby: { url: "/audio/bgm_lobby.mp3", volume: 0.7, loop: true },
      bgm_game: { url: "/audio/bgm_game.mp3", volume: 0.7, loop: true },
      sfx_swing: { url: "/audio/sfx_swing.mp3", volume: 0.9 },
      sfx_hit: { url: "/audio/sfx_hit.mp3", volume: 0.9 },
      sfx_damage: { url: "/audio/sfx_damage.mp3", volume: 1.0 },
      sfx_death: { url: "/audio/sfx_death.mp3", volume: 1.0 },
    });
    
    // Preload bgm upfront to avoid first-play hitch
    audio.preload(["bgm_lobby", "bgm_game"]);
    
    // Try to resume on first pointer to satisfy autoplay policies
    const resume = async () => {
      await audio.resume();
      // 오디오 언락 후 초기 BGM 시작
      if (!joined) {
        audio.playBGM("bgm_lobby", { fadeSec: 0.3 });
      }
    };
    
    window.addEventListener("pointerdown", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    
    return () => {
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [joined]);

  // 1) BGM: lobby <-> game crossfade on "joined" toggle
  useEffect(() => {
    if (!audio.isUnlocked()) return; // wait until user gesture
    if (joined) {
      audio.playBGM("bgm_game", { fadeSec: 0.8 });
    } else {
      audio.playBGM("bgm_lobby", { fadeSec: 0.8 });
    }
  }, [joined]);

  // 2) Duck BGM when paused (including death dialog); restore on resume
  useEffect(() => {
    audio.setDucked(paused);
  }, [paused]);

  // ESC: toggle pause, but ignore when dead
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (!joined) return;
      if (pauseReason === "dead") return; // cannot close death dialog via ESC
      togglePause();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [joined, pauseReason, togglePause]);

  // Start/stop movement emit loop based on joined/paused
  useEffect(() => {
    if (!joined) {
      socketManager.stopMovementLoop();
      return;
    }
    if (paused) socketManager.stopMovementLoop();
    else socketManager.startMovementLoop();
    return () => {
      socketManager.stopMovementLoop();
    };
  }, [joined, paused]);

  // 3) Socket wiring (추가: optional SFX hooks if your server emits these)
  useEffect(() => {
    const socket = socketManager.connect();

    // ---- existing handlers ----
    const onConnect = () => setMyId(socket.id!);
    const onGameState = (state: any) => applyGameState(state);
    const initializeGame = (state: any) => applyInitializeGame(state);

    socket.on("connect", onConnect);
    socket.on("gameState", onGameState);
    socket.on("initializeGame", initializeGame);
    socket.on("playerJoined", (p: any) => console.info("[playerJoined]", p));
    socket.on("playerLeft", (d: any) => console.info("[playerLeft]", d));

    // ---- new optional SFX hooks (emit these on your server if possible) ----
    const onShuttleHit = () => {
      // Slight randomization to reduce ear fatigue
      audio.playSFX("sfx_hit", { playbackRate: 0.96 + Math.random() * 0.08, throttleMs: 50 });
    };
    const onPlayerDamaged = () => {
      audio.playSFX("sfx_damage", { throttleMs: 80 });
    };
    socket.on("shuttleHit", onShuttleHit);
    socket.on("playerDamaged", onPlayerDamaged);

    return () => {
      socket.off("connect", onConnect);
      socket.off("initializeGame", initializeGame);
      socket.off("gameState", onGameState);
      socket.off("playerJoined");
      socket.off("playerLeft");
      socket.off("shuttleHit", onShuttleHit);
      socket.off("playerDamaged", onPlayerDamaged);
    };
  }, [applyGameState, applyInitializeGame, setMyId]);

  // Detect death: when myHp transitions to <= 0, open death dialog
  const prevHpRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!joined) {
      prevHpRef.current = undefined;
      return;
    }
    const hp = typeof myHp === "number" ? myHp : undefined;
    const prev = prevHpRef.current;
    
    // HP 변화 감지
    if (hp !== undefined && prev !== undefined) {
      // 사망 감지 (HP가 0 이하로 떨어짐)
      if (hp <= 0 && prev > 0) {
        audio.playSFX("sfx_death", { throttleMs: 300 });
        openPause("dead");
        socketManager.stopMovementLoop();
        socketManager.setKeys({ up: false, down: false, left: false, right: false });
      }
      // 데미지 감지 (HP가 감소했지만 아직 살아있음)
      else if (hp < prev && hp > 0) {
        audio.playSFX("sfx_damage", { throttleMs: 100 });
      }
    }
    
    prevHpRef.current = hp;
  }, [joined, myHp, openPause]);

  // 5) Exit to main -> switch BGM back to lobby
  const exitToMain = () => {
    socketManager.leaveGame();
    socketManager.stopMovementLoop();
    reset();
    // Switch back (if audio unlocked)
    if (audio.isUnlocked()) audio.playBGM("bgm_lobby", { fadeSec: 0.6 });
    closePause();
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-[#0d0d0d] text-white select-none">
      <div className="relative h-screen w-screen shadow-[0_0_20px_rgba(0,255,255,0.5)]">
        <GameCanvas />
        {joined && (
          <>
            <Minimap />
            <PlayerList />
            <UpgradeUI />
            <ExpHUD />
          </>
        )}
        {!joined && <JoinUI />}
        {/* Audio UI overlays */}
        <SoundControls />
        <AudioGate />
        <PauseDialog
          open={joined && paused}
          mode={pauseReason === "dead" ? "dead" : "pause"}
          onResume={pauseReason === "dead" ? undefined : closePause}
          onExit={exitToMain}
        />
      </div>
    </div>
  );
}