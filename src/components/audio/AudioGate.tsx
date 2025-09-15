// components/audio/AudioGate.tsx
import { useEffect, useState } from "react";
import { audio } from "../../lib/AudioManager";

export default function AudioGate() {
  const [isUnlocked, setIsUnlocked] = useState(audio.isUnlocked());

  useEffect(() => {
    // 오디오 언락 상태 리스너 등록
    const unsubscribe = audio.on("unlocked", () => {
      setIsUnlocked(true);
    });

    // 초기 상태 확인
    setIsUnlocked(audio.isUnlocked());

    return () => {
      unsubscribe();
    };
  }, []);

  // 오디오가 이미 언락되었으면 아무것도 렌더링하지 않음
  if (isUnlocked) return null;

  const handleEnableSound = async () => {
    try {
      await audio.resume();
      setIsUnlocked(true);
    } catch (error) {
      console.error("Failed to enable audio:", error);
    }
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-cyan-300/40 bg-cyan-900/30 p-8 text-center shadow-lg">
        <div className="text-lg font-semibold text-cyan-100">
          Audio Activation Required
        </div>
        <div className="text-sm text-cyan-200/80 max-w-xs">
          Browser policy requires user interaction to enable audio.
          Click to activate game sounds.
        </div>
        <button
          onClick={handleEnableSound}
          className="rounded-lg border border-cyan-300 bg-cyan-600 px-6 py-3 text-white font-medium hover:bg-cyan-500 transition-colors shadow-md"
        >
          Enable Sound
        </button>
      </div>
    </div>
  );
}