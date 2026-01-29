import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

interface WhatsAppVoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
}

// Generate waveform data from URL
function generateWaveformData(seed: string, bars: number = 28): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    const value = Math.abs(Math.sin(hash * (i + 1) * 0.1) * Math.cos(hash * (i + 1) * 0.05));
    waveform.push(Math.max(0.2, Math.min(1, value * 1.5)));
  }
  return waveform;
}

export function WhatsAppVoicePlayer({
  url,
  duration: initialDuration,
  isOwn = false,
}: WhatsAppVoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const waveformData = useRef(generateWaveformData(url)).current;

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", () => setIsLoaded(true));
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    audio.src = url;
    audio.load();

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback error:", err);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = percentage * duration;
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const cyclePlaybackRate = useCallback(() => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  }, [playbackRate]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 min-w-[200px] py-0.5">
      {/* Play/Pause */}
      <button
        onClick={togglePlayback}
        disabled={!isLoaded}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
          isOwn
            ? "bg-white/20 text-white"
            : "bg-rose-500 text-white"
        } ${!isLoaded ? "opacity-50" : ""}`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={progressRef}
          className="relative h-6 flex items-center cursor-pointer"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div className="absolute inset-0 flex items-center gap-[2px]">
            {waveformData.map((height, i) => {
              const isPlayed = (i / waveformData.length) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isPlayed
                      ? isOwn ? "bg-white" : "bg-rose-500"
                      : isOwn ? "bg-white/40" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Time & Speed */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] ${isOwn ? "text-white/70" : "text-gray-500"}`}>
            {formatTime(currentTime > 0 ? currentTime : duration)}
          </span>
          <button
            onClick={cyclePlaybackRate}
            className={`text-[10px] font-bold px-1.5 rounded ${
              isOwn ? "bg-white/20 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
            }`}
          >
            {playbackRate}×
          </button>
        </div>
      </div>
    </div>
  );
}
