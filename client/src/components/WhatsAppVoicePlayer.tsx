import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Mic } from "lucide-react";

interface WhatsAppVoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
  className?: string;
}

// Generate consistent waveform data from URL
function generateWaveformData(seed: string, bars: number = 35): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    const value = Math.abs(Math.sin(hash * (i + 1) * 0.1) * Math.cos(hash * (i + 1) * 0.05));
    waveform.push(Math.max(0.2, Math.min(1, value * 1.3)));
  }
  return waveform;
}

export function WhatsAppVoicePlayer({
  url,
  duration: initialDuration,
  isOwn = false,
  className = "",
}: WhatsAppVoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const waveformData = useRef(generateWaveformData(url, 35)).current;

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.playsInline = true;
    // iOS Safari fix
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");

    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoaded(true);
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setError(true);
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Set source after event listeners
    audio.src = url;
    audio.load();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
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
        // iOS requires user interaction - this should work since it's in a click handler
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback error:", err);
      setError(true);
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const cyclePlaybackRate = useCallback(() => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }, [playbackRate]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className={`flex items-center gap-2 py-1 ${className}`}>
        <Mic className="w-5 h-5 text-gray-400" />
        <span className="text-sm text-gray-500">Audio nicht verfügbar</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 min-w-[220px] ${className}`}>
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        disabled={!isLoaded}
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ${
          isOwn
            ? "bg-white/25 hover:bg-white/35 text-white"
            : "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
        } ${!isLoaded ? "opacity-50" : ""}`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      {/* Waveform */}
      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={progressRef}
          className="relative h-7 flex items-center cursor-pointer"
          onClick={handleSeek}
          onTouchEnd={handleSeek}
        >
          <div className="absolute inset-0 flex items-center gap-[2px]">
            {waveformData.map((height, i) => {
              const barProgress = (i / waveformData.length) * 100;
              const isBarPlayed = barProgress <= progress;

              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors ${
                    isBarPlayed
                      ? isOwn ? "bg-white" : "bg-rose-500"
                      : isOwn ? "bg-white/40" : "bg-rose-200 dark:bg-rose-900/50"
                  }`}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>

          {/* Progress dot */}
          {duration > 0 && (
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow ${
                isOwn ? "bg-white" : "bg-rose-500"
              }`}
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          )}
        </div>

        {/* Time and speed */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] tabular-nums ${
            isOwn ? "text-white/70" : "text-gray-500"
          }`}>
            {formatTime(currentTime > 0 ? currentTime : duration)}
          </span>

          {duration > 0 && (
            <button
              onClick={cyclePlaybackRate}
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                isOwn
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              }`}
            >
              {playbackRate}×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
