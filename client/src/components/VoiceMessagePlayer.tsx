import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, FileText, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/hapticToast";

interface VoiceMessagePlayerProps {
  messageId: number;
  url: string;
  duration?: number;
  transcription?: string | null;
  className?: string;
}

export function VoiceMessagePlayer(props: VoiceMessagePlayerProps) {
  const { messageId, url, duration: initialDuration, transcription: initialTranscription, className } = props;
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showTranscription, setShowTranscription] = useState(false);
  const [transcription, setTranscription] = useState(initialTranscription);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const transcribeMutation = trpc.ohweees.transcribeVoiceMessage.useMutation({
    onSuccess: (data) => {
      setTranscription(data.text);
      setShowTranscription(true);
      toast.success("Transkription abgeschlossen");
    },
    onError: (error) => {
      toast.error("Transkription fehlgeschlagen: " + error.message);
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ":" + secs.toString().padStart(2, "0");
  };

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => { setIsPlaying(false); setCurrentTime(0); };
    return () => { audio.pause(); audio.src = ""; };
  }, [url]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audioRef.current.currentTime = percentage * duration;
    setCurrentTime(percentage * duration);
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const handleTranscribe = () => {
    if (transcription) {
      setShowTranscription(!showTranscription);
    } else {
      transcribeMutation.mutate({ ohweeeId: messageId, audioUrl: url });
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`rounded-lg bg-muted/30 ${className || ""}`}>
      <div className="flex items-center gap-2 p-2">
        <Button variant="ghost" size="icon" onClick={togglePlayback} className="h-8 w-8 shrink-0">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div ref={progressRef} className="flex-1 h-8 flex items-center cursor-pointer" onClick={handleProgressClick}>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span className="text-xs font-mono text-muted-foreground min-w-[5rem] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <Button variant="ghost" size="sm" onClick={cyclePlaybackRate} className="h-6 px-1.5 text-xs font-mono">
          {playbackRate}x
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleTranscribe}
          disabled={transcribeMutation.isPending}
          className="h-8 w-8 shrink-0"
          title={transcription ? "Transkription anzeigen" : "Transkribieren"}
        >
          {transcribeMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : transcription ? (
            showTranscription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
        </Button>
      </div>
      {showTranscription && transcription && (
        <div className="px-3 pb-3 pt-1">
          <div className="text-sm text-muted-foreground bg-background/50 rounded p-2 border border-border/50">
            <p className="whitespace-pre-wrap">{transcription}</p>
          </div>
        </div>
      )}
    </div>
  );
}
