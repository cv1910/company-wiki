import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Send, X, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      
      // Set up MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4",
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        setRecordedBlob(blob);
      };
      
      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      
      // Start audio level visualization
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Mikrofon-Zugriff nicht möglich. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setDuration((d) => d + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  }, [isRecording, isPaused]);

  const handleSend = useCallback(() => {
    if (recordedBlob) {
      onRecordingComplete(recordedBlob, duration);
    }
  }, [recordedBlob, duration, onRecordingComplete]);

  const handleCancel = useCallback(() => {
    stopRecording();
    setRecordedBlob(null);
    setDuration(0);
    onCancel();
  }, [stopRecording, onCancel]);

  const togglePlayback = useCallback(() => {
    if (!recordedBlob) return;
    
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(URL.createObjectURL(recordedBlob));
        audioRef.current.onended = () => setIsPlaying(false);
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [recordedBlob, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // Auto-start recording when component mounts
  useEffect(() => {
    startRecording();
  }, [startRecording]);

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border">
      {/* Cancel button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="h-8 w-8 text-muted-foreground hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Recording indicator / Playback */}
      <div className="flex-1 flex items-center gap-3">
        {isRecording ? (
          <>
            {/* Recording animation */}
            <div className="relative flex items-center justify-center">
              <div
                className="absolute w-8 h-8 bg-red-500/30 rounded-full animate-ping"
                style={{ animationDuration: "1.5s" }}
              />
              <div
                className="w-4 h-4 bg-red-500 rounded-full"
                style={{
                  transform: `scale(${1 + audioLevel * 0.5})`,
                  transition: "transform 0.1s ease-out",
                }}
              />
            </div>

            {/* Waveform visualization */}
            <div className="flex-1 flex items-center gap-0.5 h-8">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-red-500 rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(4, (Math.sin(i * 0.5 + Date.now() * 0.005) + 1) * audioLevel * 16 + 4)}px`,
                  }}
                />
              ))}
            </div>

            {/* Duration */}
            <span className="text-sm font-mono text-red-500 min-w-[3rem]">
              {formatDuration(duration)}
            </span>

            {/* Pause button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={pauseRecording}
              className="h-8 w-8"
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>

            {/* Stop button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={stopRecording}
              className="h-8 w-8 text-red-500 hover:text-red-600"
            >
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </>
        ) : recordedBlob ? (
          <>
            {/* Playback controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlayback}
              className="h-8 w-8"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>

            {/* Static waveform */}
            <div className="flex-1 flex items-center gap-0.5 h-8">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 bg-primary/60 rounded-full"
                  style={{
                    height: `${Math.max(4, Math.abs(Math.sin(i * 0.7)) * 20 + 4)}px`,
                  }}
                />
              ))}
            </div>

            {/* Duration */}
            <span className="text-sm font-mono text-muted-foreground min-w-[3rem]">
              {formatDuration(duration)}
            </span>

            {/* Send button */}
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              className="h-8 w-8 bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Mic className="h-4 w-4 mr-2" />
            <span className="text-sm">Aufnahme wird vorbereitet...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// WhatsApp-style Voice Message Player with iOS compatibility
interface VoiceMessagePlayerProps {
  url: string;
  duration?: number;
  isOwn?: boolean;
  senderAvatar?: string;
  senderName?: string;
  className?: string;
}

export function VoiceMessagePlayer({ 
  url, 
  duration: initialDuration, 
  isOwn = false,
  senderAvatar,
  senderName,
  className 
}: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number) => {
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
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((error) => {
        console.error("Audio playback failed:", error);
      });
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

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

  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const height = Math.abs(Math.sin(i * 0.8) * Math.cos(i * 0.3)) * 100;
    return Math.max(15, Math.min(100, height + 20));
  });

  return (
    <div className={`flex items-center gap-2 p-2 min-w-[280px] ${className || ""}`}>
      <audio 
        ref={audioRef} 
        src={url} 
        preload="metadata"
        playsInline
      />

      {!isOwn && senderAvatar && (
        <div className="relative shrink-0">
          <img 
            src={senderAvatar} 
            alt={senderName || "Sender"}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
        </div>
      )}

      <button
        onClick={togglePlayback}
        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isOwn 
            ? "bg-white/20 hover:bg-white/30 text-white" 
            : "bg-primary/10 hover:bg-primary/20 text-primary"
        }`}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          className="relative h-8 flex items-center gap-[2px] cursor-pointer"
          onClick={handleProgressClick}
          onTouchStart={handleProgressClick}
        >
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isPlayed = barProgress <= progress;
            
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${
                  isPlayed
                    ? isOwn ? "bg-white" : "bg-blue-500"
                    : isOwn ? "bg-white/40" : "bg-gray-300 dark:bg-gray-600"
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
          
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md ${
              isOwn ? "bg-white" : "bg-blue-500"
            }`}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs ${isOwn ? "text-white/70" : "text-muted-foreground"}`}>
            {formatTime(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>
          
          <button
            onClick={cyclePlaybackRate}
            className={`text-xs px-1.5 py-0.5 rounded ${
              isOwn 
                ? "bg-white/20 hover:bg-white/30 text-white" 
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            }`}
          >
            {playbackRate}×
          </button>
        </div>
      </div>

      {isOwn && senderAvatar && (
        <div className="relative shrink-0">
          <img 
            src={senderAvatar} 
            alt={senderName || "You"}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
