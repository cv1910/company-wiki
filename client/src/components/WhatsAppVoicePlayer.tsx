import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface WhatsAppVoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
}

// Generate waveform data from URL
function generateWaveformData(seed: string, bars: number = 40): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    const value = Math.abs(Math.sin(hash * (i + 1) * 0.1) * Math.cos(hash * (i + 1) * 0.05));
    waveform.push(Math.max(0.15, Math.min(1, value * 1.5)));
  }
  return waveform;
}

export function WhatsAppVoicePlayer({
  url,
  duration: initialDuration,
  isOwn = false,
}: WhatsAppVoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);
  const waveformData = useRef(generateWaveformData(url)).current;

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Keep ref in sync with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.playsInline = true;
    audio.src = url;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setCurrentTime(audio.currentTime);
        setProgress(audio.currentTime / audio.duration);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [url]);

  // Animation frame for smoother progress (in addition to timeupdate)
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      const audio = audioRef.current;
      if (audio && isPlayingRef.current && audio.duration > 0) {
        setCurrentTime(audio.currentTime);
        setProgress(audio.currentTime / audio.duration);
      }
      if (isPlayingRef.current) {
        animationId = requestAnimationFrame(animate);
      }
    };

    if (isPlaying) {
      animationId = requestAnimationFrame(animate);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying]);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.playbackRate = playbackRate;
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  };

  const handleSeek = (e: React.MouseEvent | React.TouchEvent) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !audio.duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    audio.currentTime = pct * audio.duration;
    setProgress(pct);
    setCurrentTime(audio.currentTime);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const next = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const progressPct = progress * 100;

  return (
    <div className="flex items-center gap-2 min-w-[180px] py-1">
      {/* Play/Pause */}
      <button
        onClick={togglePlayback}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${
          isOwn ? "bg-white/25 text-white" : "bg-rose-500 text-white shadow-sm"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div
          ref={progressRef}
          className="relative h-7 flex items-center cursor-pointer"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          {/* Bars */}
          <div className="absolute inset-0 flex items-center gap-px">
            {waveformData.map((h, i) => {
              const played = (i / waveformData.length) * 100 <= progressPct;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${h * 100}%`,
                    backgroundColor: played
                      ? (isOwn ? "#fff" : "#f43f5e")
                      : (isOwn ? "rgba(255,255,255,0.35)" : "#d1d5db"),
                  }}
                />
              );
            })}
          </div>

          {/* Dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow z-10"
            style={{
              left: `${progressPct}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: isOwn ? "#fff" : "#f43f5e",
            }}
          />
        </div>

        {/* Time & Speed */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] tabular-nums ${isOwn ? "text-white/80" : "text-gray-500"}`}>
            {formatTime(currentTime > 0 ? currentTime : duration)}
          </span>
          <button
            onClick={cyclePlaybackRate}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isOwn ? "bg-white/25 text-white" : "bg-gray-200 text-gray-600"
            }`}
          >
            {playbackRate}×
          </button>
        </div>
      </div>
    </div>
  );
}
