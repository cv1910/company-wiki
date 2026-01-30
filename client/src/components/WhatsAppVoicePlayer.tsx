import { useState, useRef, useEffect, useCallback } from "react";
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
  const [progress, setProgress] = useState(0); // 0 to 1
  const [duration, setDuration] = useState(initialDuration || 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const waveformData = useRef(generateWaveformData(url)).current;

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize audio
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.playsInline = true;
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      // WebM from MediaRecorder often has Infinity duration
      // Only update if we get a valid duration and don't have one yet
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
      setIsLoaded(true);
    };

    const handleCanPlay = () => setIsLoaded(true);

    const handleTimeUpdate = () => {
      // For webm files, duration might become available during playback
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0 && duration === 0) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(1); // Set to 100% when ended
      setCurrentTime(duration);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    const handleError = (e: Event) => {
      console.error("Audio error:", e);
      setIsLoaded(true);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    audio.src = url;
    audio.load();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.src = "";
    };
  }, [url, duration]);

  // Animation loop for progress
  const updateProgress = useCallback(() => {
    const audio = audioRef.current;
    if (audio && isPlaying) {
      // Update current time always
      setCurrentTime(audio.currentTime);

      // Calculate progress if we have duration
      const effectiveDuration = duration > 0 ? duration : (audio.duration && isFinite(audio.duration) ? audio.duration : 0);
      if (effectiveDuration > 0) {
        const newProgress = Math.min(audio.currentTime / effectiveDuration, 1);
        setProgress(newProgress);
        // Update duration if we got it from audio
        if (duration === 0 && effectiveDuration > 0) {
          setDuration(effectiveDuration);
        }
      }

      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isPlaying, duration]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, updateProgress]);

  const togglePlayback = useCallback(async () => {
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
  }, [isPlaying, playbackRate]);

  const handleSeek = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = percentage * duration;
    setProgress(percentage);
    setCurrentTime(audio.currentTime);
  }, [duration]);

  const cyclePlaybackRate = useCallback(() => {
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  }, [playbackRate]);

  const progressPercent = progress * 100;

  return (
    <div className="flex items-center gap-2 min-w-[180px] py-1">
      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0 ${
          isOwn
            ? "bg-white/25 text-white"
            : "bg-rose-500 text-white shadow-sm"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
        )}
      </button>

      {/* Waveform with Progress */}
      <div className="flex-1 flex flex-col gap-0.5">
        <div
          ref={progressRef}
          className="relative h-7 flex items-center cursor-pointer"
          onClick={handleSeek}
          onTouchStart={handleSeek}
        >
          {/* Waveform Bars */}
          <div className="absolute inset-0 flex items-center gap-px">
            {waveformData.map((height, i) => {
              const barProgress = (i / waveformData.length) * 100;
              const isPlayed = barProgress <= progressPercent;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${height * 100}%`,
                    backgroundColor: isPlayed
                      ? isOwn ? "rgba(255,255,255,1)" : "rgb(244,63,94)"
                      : isOwn ? "rgba(255,255,255,0.35)" : "rgb(209,213,219)",
                    transition: "background-color 0.1s",
                  }}
                />
              );
            })}
          </div>

          {/* Progress Dot */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md z-10"
            style={{
              left: `calc(${progressPercent}% - 6px)`,
              backgroundColor: isOwn ? "white" : "rgb(244,63,94)",
            }}
          />
        </div>

        {/* Time & Speed */}
        <div className="flex items-center justify-between px-0.5">
          <span className={`text-[11px] font-medium tabular-nums ${isOwn ? "text-white/80" : "text-gray-500"}`}>
            {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>
          <button
            onClick={cyclePlaybackRate}
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              isOwn
                ? "bg-white/25 text-white"
                : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
            }`}
          >
            {playbackRate}×
          </button>
        </div>
      </div>
    </div>
  );
}
