import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { Bot, FileText, Loader2, MessageCircle, Plus, Send, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";

interface ChatSource {
  type: string;
  id: number;
  title: string;
  slug: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  createdAt: Date;
}

export default function Chat() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState(() => nanoid());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: history } = trpc.chat.getHistory.useQuery(
    { sessionId },
    { enabled: !!sessionId }
  );

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: data.message,
          sources: data.sources as ChatSource[],
          createdAt: new Date(),
        },
      ]);
      setIsLoading(false);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: nanoid(),
          role: "assistant",
          content: "Entschuldigung, es ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut.",
          createdAt: new Date(),
        },
      ]);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (history && history.length > 0 && messages.length === 0) {
      setMessages(
        history.map((msg) => ({
          id: msg.id.toString(),
          role: msg.role,
          content: msg.content,
          sources: msg.sources as ChatSource[] | undefined,
          createdAt: new Date(msg.createdAt),
        }))
      );
    }
  }, [history, messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    sendMessage.mutate({
      sessionId,
      message: userMessage.content,
    });
  };

  const handleNewChat = () => {
    setSessionId(nanoid());
    setMessages([]);
    inputRef.current?.focus();
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI-Assistent</h1>
          <p className="text-muted-foreground mt-1">
            Stellen Sie Fragen zu Wiki-Inhalten und SOPs
          </p>
        </div>
        <Button variant="outline" onClick={handleNewChat}>
          <Plus className="h-4 w-4 mr-2" />
          Neuer Chat
        </Button>
      </div>

      {/* Chat Container */}
      <Card className="card-shadow flex-1 flex flex-col overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="p-4 rounded-2xl bg-primary/10 mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-medium mb-2">
                Willkommen beim AI-Assistenten
              </h2>
              <p className="text-muted-foreground max-w-md mb-6">
                Ich kann Ihnen bei Fragen zu Wiki-Artikeln und SOPs helfen. 
                Stellen Sie einfach eine Frage in natürlicher Sprache.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    setInput("Welche SOPs gibt es für den Onboarding-Prozess?");
                    inputRef.current?.focus();
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-3 shrink-0" />
                  <span className="text-left">Welche SOPs gibt es für den Onboarding-Prozess?</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    setInput("Wie funktioniert unser Bestellprozess?");
                    inputRef.current?.focus();
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-3 shrink-0" />
                  <span className="text-left">Wie funktioniert unser Bestellprozess?</span>
                </Button>
                <Button
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => {
                    setInput("Zeige mir die wichtigsten Unternehmensrichtlinien");
                    inputRef.current?.focus();
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-3 shrink-0" />
                  <span className="text-left">Zeige mir die wichtigsten Unternehmensrichtlinien</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose-wiki text-sm">
                        <Streamdown>{message.content}</Streamdown>
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    
                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-2">Quellen:</p>
                        <div className="flex flex-wrap gap-2">
                          {message.sources.map((source, idx) => (
                            <button
                              key={idx}
                              onClick={() =>
                                setLocation(
                                  source.type === "article"
                                    ? `/wiki/article/${source.slug}`
                                    : `/sops/view/${source.slug}`
                                )
                              }
                              className="inline-flex items-center gap-1 text-xs bg-background/50 hover:bg-background px-2 py-1 rounded-full transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              {source.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="p-2 rounded-lg bg-primary h-fit">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="p-2 rounded-lg bg-primary/10 h-fit">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <CardContent className="p-4 border-t">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Stellen Sie eine Frage..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
