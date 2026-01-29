import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Mic } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WhatsAppVoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
  senderAvatar?: string;
  senderName?: string;
  className?: string;
}

// Generate consistent waveform data from URL (more natural looking)
function generateWaveformData(seed: string, bars: number = 40): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    // Create more natural looking waveform with multiple sine waves
    const base = Math.abs(Math.sin(hash * (i + 1) * 0.1));
    const variation = Math.abs(Math.cos(hash * (i + 2) * 0.15) * 0.3);
    const noise = Math.abs(Math.sin((hash + i) * 0.5) * 0.2);
    const value = base * 0.6 + variation + noise;
    waveform.push(Math.max(0.15, Math.min(1, value)));
  }
  return waveform;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function WhatsAppVoicePlayer({
  url,
  duration: initialDuration,
  isOwn = false,
  senderAvatar,
  senderName = "?",
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
  const waveformData = useRef(generateWaveformData(url, 40)).current;

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
    <div className={`flex items-center gap-2.5 min-w-[240px] py-1 ${className}`}>
      {/* Avatar with Play/Pause overlay - WhatsApp style */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-12 h-12 shadow-sm">
          <AvatarImage src={senderAvatar} />
          <AvatarFallback className={`font-semibold ${
            isOwn
              ? "bg-white/20 text-white"
              : "bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-300"
          }`}>
            {getInitials(senderName)}
          </AvatarFallback>
        </Avatar>

        {/* Play/Pause button overlay */}
        <button
          onClick={togglePlayback}
          disabled={!isLoaded}
          className={`absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
            isOwn
              ? "bg-white text-rose-500"
              : "bg-rose-500 text-white"
          } ${!isLoaded ? "opacity-50" : ""}`}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3" fill="currentColor" />
          ) : (
            <Play className="w-3 h-3 ml-0.5" fill="currentColor" />
          )}
        </button>

        {/* Microphone icon indicator */}
        <div className={`absolute -top-0.5 -left-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
          isOwn ? "bg-white/30" : "bg-rose-100 dark:bg-rose-900"
        }`}>
          <Mic className={`w-3 h-3 ${isOwn ? "text-white" : "text-rose-500"}`} />
        </div>
      </div>

      {/* Waveform and controls */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Waveform */}
        <div
          ref={progressRef}
          className="relative h-8 flex items-center cursor-pointer touch-none"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          <div className="absolute inset-0 flex items-end gap-[1.5px] pb-0.5">
            {waveformData.map((height, i) => {
              const barProgress = (i / waveformData.length) * 100;
              const isBarPlayed = barProgress <= progress;

              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-100 ${
                    isBarPlayed
                      ? isOwn ? "bg-white" : "bg-rose-500"
                      : isOwn ? "bg-white/35" : "bg-rose-200 dark:bg-rose-800/60"
                  }`}
                  style={{
                    height: `${Math.max(12, height * 100)}%`,
                    minHeight: '3px'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Time and speed controls */}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[11px] tabular-nums font-medium ${
            isOwn ? "text-white/80" : "text-gray-500"
          }`}>
            {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>

          {duration > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                cyclePlaybackRate();
              }}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all active:scale-95 ${
                isOwn
                  ? "bg-white/25 text-white hover:bg-white/35"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
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
