// components/audio/SoundControls.tsx
import { useEffect, useState } from "react";
import { audio } from "../../lib/AudioManager";

export default function SoundControls() {
  const [bgmVolume, setBgmVolume] = useState(1);
  const [sfxVolume, setSfxVolume] = useState(1);
  const [masterVolume, setMasterVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(audio.isUnlocked());

  // 음소거 이전 볼륨 저장
  const [prevVolumes, setPrevVolumes] = useState({
    master: 1,
    bgm: 1,
    sfx: 1
  });

  // 오디오 언락 상태 감지
  useEffect(() => {
    const unsubscribe = audio.on("unlocked", () => {
      setIsUnlocked(true);
    });

    setIsUnlocked(audio.isUnlocked());

    return () => {
      unsubscribe();
    };
  }, []);

  // 볼륨 변경 시 오디오 매니저에 반영 + 음소거 상태 자동 해제
  useEffect(() => {
    if (isUnlocked) {
      audio.setMasterVolume(masterVolume);
      // 볼륨이 0보다 크면 음소거 해제
      if (masterVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    }
  }, [masterVolume, isUnlocked, isMuted]);

  useEffect(() => {
    if (isUnlocked) {
      audio.setBGMVolume(bgmVolume);
      // 볼륨이 0보다 크면 음소거 해제
      if (bgmVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    }
  }, [bgmVolume, isUnlocked, isMuted]);

  useEffect(() => {
    if (isUnlocked) {
      audio.setSFXVolume(sfxVolume);
      // 볼륨이 0보다 크면 음소거 해제
      if (sfxVolume > 0 && isMuted) {
        setIsMuted(false);
      }
    }
  }, [sfxVolume, isUnlocked, isMuted]);

  // 오디오가 언락되지 않았으면 숨김
  if (!isUnlocked) return null;

  const toggleMute = () => {
    if (isMuted) {
      // 음소거 해제
      setMasterVolume(prevVolumes.master);
      setBgmVolume(prevVolumes.bgm);
      setSfxVolume(prevVolumes.sfx);
      setIsMuted(false);
    } else {
      // 음소거 설정
      setPrevVolumes({
        master: masterVolume,
        bgm: bgmVolume,
        sfx: sfxVolume
      });
      setMasterVolume(0);
      setBgmVolume(0);
      setSfxVolume(0);
      setIsMuted(true);
    }
  };

  const SliderThumb = ({ value }: { value: number }) => (
    <div 
      className="absolute w-4 h-4 bg-cyan-400 rounded-full shadow-lg transform -translate-y-1/2 pointer-events-none"
      style={{
        left: `calc(${value * 100}% - 8px)`,
        top: '50%',
        boxShadow: '0 0 8px rgba(0, 255, 255, 0.5)'
      }}
    />
  );

  if (!isExpanded) {
    return (
      <div className="pointer-events-auto absolute right-3 bottom-3 z-40">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-black/50 p-3 text-cyan-200 hover:bg-black/70 transition-colors backdrop-blur-sm"
          title="Audio Settings"
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.936 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.936l3.447-2.816z" clipRule="evenodd" />
              <path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.936 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.936l3.447-2.816z" clipRule="evenodd" />
              <path d="M11 7a1 1 0 112 0v6a1 1 0 11-2 0V7zM14 9a1 1 0 112 0v2a1 1 0 11-2 0V9z" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute right-3 bottom-3 z-40 flex flex-col gap-3 rounded-lg border border-cyan-400/30 bg-black/80 backdrop-blur-sm p-4 text-xs min-w-[220px]">
      <div className="flex items-center justify-between">
        <span className="text-cyan-200 font-medium">Audio Settings</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className={`p-1 rounded transition-colors ${
              isMuted 
                ? 'text-red-400 hover:text-red-300' 
                : 'text-cyan-400 hover:text-cyan-300'
            }`}
            title={isMuted ? "Unmute" : "Mute All"}
          >
            {isMuted ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.936 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.936l3.447-2.816z" clipRule="evenodd" />
                <path d="M12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.816L4.936 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.936l3.447-2.816z" clipRule="evenodd" />
                <path d="M11 7a1 1 0 112 0v6a1 1 0 11-2 0V7zM14 9a1 1 0 112 0v2a1 1 0 11-2 0V9z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-white w-4 h-4 cursor-pointer"
          >
            X
          </button>
        </div>
      </div>

      {/* Master Volume */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-cyan-200">Master</span>
          <span className="text-gray-300">{Math.round(masterVolume * 100)}%</span>
        </div>
        <div className="relative h-2 bg-gray-700 rounded-lg cursor-pointer">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="h-full bg-cyan-600 rounded-lg transition-all"
            style={{ width: `${masterVolume * 100}%` }}
          />
          <SliderThumb value={masterVolume} />
        </div>
      </div>

      {/* BGM Volume */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-cyan-200">BGM</span>
          <span className="text-gray-300">{Math.round(bgmVolume * 100)}%</span>
        </div>
        <div className="relative h-2 bg-gray-700 rounded-lg cursor-pointer">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={bgmVolume}
            onChange={(e) => setBgmVolume(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="h-full bg-cyan-600 rounded-lg transition-all"
            style={{ width: `${bgmVolume * 100}%` }}
          />
          <SliderThumb value={bgmVolume} />
        </div>
      </div>

      {/* SFX Volume */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-cyan-200">SFX</span>
          <span className="text-gray-300">{Math.round(sfxVolume * 100)}%</span>
        </div>
        <div className="relative h-2 bg-gray-700 rounded-lg cursor-pointer">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={sfxVolume}
            onChange={(e) => setSfxVolume(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div 
            className="h-full bg-cyan-600 rounded-lg transition-all"
            style={{ width: `${sfxVolume * 100}%` }}
          />
          <SliderThumb value={sfxVolume} />
        </div>
      </div>
    </div>
  );
}