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

// Audio player component for voice messages
interface VoiceMessagePlayerProps {
  url: string;
  duration?: number;
  className?: string;
}

export function VoiceMessagePlayer({ url, duration: initialDuration, className }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [url]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;

    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
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

  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg bg-muted/30 ${className}`}>
      {/* Play/Pause button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePlayback}
        className="h-8 w-8 shrink-0"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="flex-1 h-8 flex items-center cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Time display */}
      <span className="text-xs font-mono text-muted-foreground min-w-[5rem] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Playback rate */}
      <Button
        variant="ghost"
        size="sm"
        onClick={cyclePlaybackRate}
        className="h-6 px-1.5 text-xs font-mono"
      >
        {playbackRate}x
      </Button>
    </div>
  );
}
