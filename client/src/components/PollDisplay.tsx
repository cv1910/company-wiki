import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Check, Users, Lock, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface PollOption {
  id: number;
  text: string;
  votes: number;
  voters: { userId: number; name: string | null; avatarUrl: string | null }[];
}

interface PollDisplayProps {
  ohweeeId: number;
  isOwn: boolean;
  currentUserId: number;
}

export function PollDisplay({ ohweeeId, isOwn, currentUserId }: PollDisplayProps) {
  const [showVoters, setShowVoters] = useState<number | null>(null);
  
  const { data: poll, isLoading, refetch } = trpc.ohweees.getPollByMessage.useQuery(
    { ohweeeId },
    { refetchInterval: 5000 } // Refresh every 5 seconds for live updates
  );
  
  const voteMutation = trpc.ohweees.votePoll.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const closeMutation = trpc.ohweees.closePoll.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Umfrage geschlossen");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2 p-4 rounded-lg bg-muted/30">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded" />
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  const totalVotes = poll.totalVotes;
  const hasVoted = poll.userVotes.length > 0;
  const isCreator = poll.createdById === currentUserId;
  const isClosed = poll.isClosed;
  const isExpired = poll.expiresAt && new Date(poll.expiresAt) < new Date();

  const handleVote = (optionId: number) => {
    if (isClosed || isExpired) {
      toast.error("Diese Umfrage ist geschlossen");
      return;
    }
    voteMutation.mutate({ pollId: poll.id, optionId });
  };

  const handleClose = () => {
    if (confirm("Möchtest du diese Umfrage wirklich schließen?")) {
      closeMutation.mutate({ pollId: poll.id });
    }
  };

  return (
    <div className={`rounded-lg overflow-hidden border ${isOwn ? "border-amber-300/50" : "border-border"}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-3">
        <div className="flex items-center gap-2 text-white">
          <BarChart3 className="h-5 w-5" />
          <span className="font-medium">Umfrage</span>
          {poll.isAnonymous && (
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
              <Lock className="h-3 w-3 mr-1" />
              Anonym
            </Badge>
          )}
          {poll.allowMultiple && (
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
              Mehrfachauswahl
            </Badge>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="p-4 bg-background">
        <h4 className="font-semibold text-base mb-4">{poll.question}</h4>

        {/* Options */}
        <div className="space-y-2">
          {poll.options.map((option: PollOption) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isSelected = poll.userVotes.includes(option.id);
            const canVote = !isClosed && !isExpired;

            return (
              <div key={option.id} className="space-y-1">
                <button
                  onClick={() => canVote && handleVote(option.id)}
                  disabled={!canVote || voteMutation.isPending}
                  className={`w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : canVote
                      ? "border-border hover:border-primary/50 hover:bg-muted/50"
                      : "border-border bg-muted/30"
                  }`}
                >
                  {/* Progress background */}
                  {(hasVoted || isClosed || isExpired) && (
                    <div
                      className={`absolute inset-0 transition-all ${
                        isSelected ? "bg-primary/10" : "bg-muted/50"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  )}

                  <div className="relative flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className={`truncate ${isSelected ? "font-medium" : ""}`}>
                        {option.text}
                      </span>
                    </div>
                    
                    {(hasVoted || isClosed || isExpired) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-medium">{percentage}%</span>
                        <span className="text-xs text-muted-foreground">
                          ({option.votes})
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Voters (non-anonymous) */}
                {!poll.isAnonymous && option.voters.length > 0 && (hasVoted || isClosed || isExpired) && (
                  <div className="ml-2">
                    <button
                      onClick={() => setShowVoters(showVoters === option.id ? null : option.id)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Users className="h-3 w-3" />
                      <span>{option.voters.length} Stimme{option.voters.length !== 1 ? "n" : ""}</span>
                      {showVoters === option.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                    
                    {showVoters === option.id && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {option.voters.map((voter) => (
                          <div
                            key={voter.userId}
                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
                          >
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={voter.avatarUrl || undefined} />
                              <AvatarFallback className="text-[8px]">
                                {getInitials(voter.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{voter.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            <span>{poll.voterCount} Teilnehmer</span>
          </div>
          
          <div className="flex items-center gap-2">
            {isClosed && (
              <Badge variant="secondary" className="text-xs">
                Geschlossen
              </Badge>
            )}
            {isExpired && !isClosed && (
              <Badge variant="secondary" className="text-xs">
                Abgelaufen
              </Badge>
            )}
            {isCreator && !isClosed && !isExpired && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 text-xs"
              >
                Schließen
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
