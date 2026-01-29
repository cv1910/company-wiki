import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WhatsAppVoicePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
  senderAvatar?: string;
  senderName?: string;
  isPlayed?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

// Generate consistent waveform data from a seed (URL hash)
function generateWaveformData(seed: string, bars: number = 50): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  const waveform: number[] = [];
  for (let i = 0; i < bars; i++) {
    // Use hash and index to generate pseudo-random but consistent heights
    const value = Math.abs(Math.sin(hash * (i + 1) * 0.1) * Math.cos(hash * (i + 1) * 0.05));
    waveform.push(Math.max(0.15, Math.min(1, value * 1.2)));
  }
  return waveform;
}

export function WhatsAppVoicePlayer({
  url,
  duration: initialDuration,
  isOwn = false,
  senderAvatar,
  senderName,
  isPlayed = false,
  onPlayStateChange,
}: WhatsAppVoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const waveformData = useRef(generateWaveformData(url, 40)).current;

  const formatTime = (seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      onPlayStateChange?.(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [isDragging, onPlayStateChange]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [isPlaying]);

  const handleProgressInteraction = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    if (!audio || !progressBar || !duration) return;

    const rect = progressBar.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, [duration]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleProgressInteraction(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    handleProgressInteraction(e.touches[0].clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleProgressInteraction(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleProgressInteraction(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleEnd);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleEnd);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleEnd);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleEnd);
    };
  }, [isDragging, handleProgressInteraction]);

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Colors based on ownership
  const playButtonBg = isOwn ? "bg-white/20 hover:bg-white/30" : "bg-emerald-500 hover:bg-emerald-600";
  const playButtonText = isOwn ? "text-white" : "text-white";
  const waveformPlayed = isOwn ? "bg-white" : "bg-emerald-600";
  const waveformUnplayed = isOwn ? "bg-white/40" : "bg-emerald-600/30";
  const timeText = isOwn ? "text-white/70" : "text-gray-500";
  const speedButtonBg = isOwn ? "bg-white/20" : "bg-gray-200 dark:bg-gray-700";
  const speedButtonText = isOwn ? "text-white" : "text-gray-600 dark:text-gray-300";
  const micBadgeBg = isOwn ? "bg-white/30" : "bg-emerald-500";

  return (
    <div className="flex items-center gap-3 min-w-[240px] max-w-[320px] select-none">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        playsInline
      />

      {/* Avatar with mic badge - only for received messages */}
      {!isOwn && (
        <div className="relative flex-shrink-0">
          <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-800 shadow-sm">
            <AvatarImage src={senderAvatar} alt={senderName} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
              {senderName?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${micBadgeBg} rounded-full flex items-center justify-center shadow-sm`}>
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
        </div>
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayback}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-all ${playButtonBg} ${playButtonText} shadow-sm active:scale-95`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      {/* Waveform and controls */}
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {/* Waveform */}
        <div
          ref={progressRef}
          className="relative h-8 flex items-center cursor-pointer touch-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="absolute inset-0 flex items-center gap-[2px]">
            {waveformData.map((height, i) => {
              const barProgress = (i / waveformData.length) * 100;
              const isBarPlayed = barProgress <= progress;

              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-100 ${
                    isBarPlayed ? waveformPlayed : waveformUnplayed
                  }`}
                  style={{ height: `${height * 100}%` }}
                />
              );
            })}
          </div>

          {/* Progress indicator dot */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-md transition-transform ${
              isDragging ? "scale-125" : ""
            } ${isOwn ? "bg-white" : "bg-emerald-500"}`}
            style={{ left: `calc(${progress}% - 7px)` }}
          />
        </div>

        {/* Time and speed control */}
        <div className="flex items-center justify-between px-0.5">
          <span className={`text-[11px] font-medium tabular-nums ${timeText}`}>
            {formatTime(currentTime > 0 || isPlaying ? currentTime : duration)}
          </span>

          <button
            onClick={cyclePlaybackRate}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${speedButtonBg} ${speedButtonText}`}
          >
            {playbackRate}×
          </button>
        </div>
      </div>

      {/* Avatar for own messages - on the right */}
      {isOwn && senderAvatar && (
        <div className="relative flex-shrink-0">
          <Avatar className="w-12 h-12 border-2 border-white dark:border-gray-800 shadow-sm">
            <AvatarImage src={senderAvatar} alt={senderName} />
            <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold">
              {senderName?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -bottom-1 -left-1 w-5 h-5 ${micBadgeBg} rounded-full flex items-center justify-center shadow-sm`}>
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// WHATSAPP-STYLE VOICE RECORDER (Hold-to-Record)
// ============================================================================

interface WhatsAppVoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function WhatsAppVoiceRecorder({ onRecordingComplete, onCancel }: WhatsAppVoiceRecorderProps) {
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(30).fill(0.1));
  const [slideToCancel, setSlideToCancel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Start recording on mount
  useEffect(() => {
    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Audio analysis for visualization
        audioContextRef.current = new AudioContext();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        source.connect(analyserRef.current);

        // MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.start(100);

        // Timer
        timerRef.current = setInterval(() => {
          setRecordingTime((t) => t + 1);
        }, 1000);

        // Visualization
        const updateLevels = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            const newLevels = Array(30).fill(0).map((_, i) => {
              const idx = Math.floor((i / 30) * dataArray.length);
              return Math.max(0.1, dataArray[idx] / 255);
            });
            setAudioLevels(newLevels);
          }
          animationRef.current = requestAnimationFrame(updateLevels);
        };
        updateLevels();
      } catch (error) {
        console.error("Microphone access denied:", error);
        onCancel();
      }
    };

    startRecording();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [onCancel]);

  const stopAndSend = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        onRecordingComplete(blob, recordingTime);
      };
      mediaRecorder.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  }, [onRecordingComplete, recordingTime]);

  const cancel = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    onCancel();
  }, [onCancel]);

  // Handle slide-to-cancel gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = startXRef.current - e.touches[0].clientX;
    setSlideToCancel(Math.max(0, Math.min(100, diff)));

    if (diff > 100) {
      cancel();
    }
  };

  const handleTouchEnd = () => {
    if (slideToCancel < 100) {
      setSlideToCancel(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide to cancel indicator */}
      <div
        className="flex items-center gap-2 transition-opacity"
        style={{ opacity: 1 - slideToCancel / 100 }}
      >
        <span className="text-gray-400 text-sm">◀ Zum Abbrechen schieben</span>
      </div>

      {/* Waveform visualization */}
      <div className="flex-1 flex items-center justify-center gap-[2px] h-8">
        {audioLevels.map((level, i) => (
          <div
            key={i}
            className="w-1 bg-red-500 rounded-full transition-all duration-75"
            style={{ height: `${Math.max(4, level * 32)}px` }}
          />
        ))}
      </div>

      {/* Recording time */}
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        <span className="text-red-500 font-mono font-semibold text-sm min-w-[40px]">
          {formatTime(recordingTime)}
        </span>
      </div>

      {/* Stop/Send button */}
      <button
        onClick={stopAndSend}
        className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition-all active:scale-95"
      >
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
    </div>
  );
}
