import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { trpc } from "@/lib/trpc";
import { 
  Bot, 
  ClipboardList, 
  FileText, 
  Loader2, 
  MessageCircle, 
  Plus, 
  Search as SearchIcon, 
  Send, 
  Sparkles, 
  User,
  Zap
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { nanoid } from "nanoid";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

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

export default function SearchAssistant() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"search" | "assistant">("search");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "articles" | "sops">("all");
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  
  // Chat state
  const [sessionId, setSessionId] = useState(() => nanoid());
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Search queries
  const { data: textResults, isLoading: textLoading } = trpc.search.global.useQuery(
    { query: searchQuery, type: searchType },
    { enabled: searchQuery.length >= 2 && !useSemanticSearch }
  );

  const { data: semanticResults, isLoading: semanticLoading } = trpc.search.semantic.useQuery(
    { query: searchQuery, type: searchType },
    { enabled: searchQuery.length >= 2 && useSemanticSearch }
  );

  const results = useSemanticSearch ? semanticResults : textResults;
  const searchLoading = useSemanticSearch ? semanticLoading : textLoading;
  const totalResults = (results?.articles?.length || 0) + (results?.sops?.length || 0);

  // Chat queries
  const { data: history } = trpc.chat.getHistory.useQuery(
    { sessionId },
    { enabled: !!sessionId && activeTab === "assistant" }
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

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: nanoid(),
      role: "user",
      content: chatInput.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatInput("");
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

  const formatSimilarity = (similarity: number) => {
    return Math.round(similarity * 100);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-transparent border border-purple-500/10 p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Suche & AI</h1>
            </div>
            <p className="text-muted-foreground text-base">
              Durchsuchen Sie die Wissensdatenbank oder fragen Sie den AI-Assistenten
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "search" | "assistant")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="search" className="gap-2 text-base">
            <SearchIcon className="h-4 w-4" />
            Suche
          </TabsTrigger>
          <TabsTrigger value="assistant" className="gap-2 text-base">
            <Bot className="h-4 w-4" />
            AI-Assistent
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-6 space-y-6">
          {/* Search Input */}
          <div className="space-y-4">
            <SearchAutocomplete
              placeholder={useSemanticSearch 
                ? "Stellen Sie eine Frage in natürlicher Sprache..." 
                : "Suchbegriff eingeben (mind. 2 Zeichen)..."}
              onSearch={(q) => setSearchQuery(q)}
              autoFocus={activeTab === "search"}
            />

            {/* Semantic Search Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <Label htmlFor="semantic-search" className="font-medium cursor-pointer">
                    AI-gestützte Suche
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Versteht den Kontext und findet relevante Ergebnisse
                  </p>
                </div>
              </div>
              <Switch
                id="semantic-search"
                checked={useSemanticSearch}
                onCheckedChange={setUseSemanticSearch}
              />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div>
              {results && (
                <div className="flex items-center gap-2 mb-4">
                  {useSemanticSearch ? (
                    <Badge variant="secondary" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Semantische Suche
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1">
                      <Zap className="h-3 w-3" />
                      Textsuche
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">
                    {totalResults} Ergebnis{totalResults !== 1 ? "se" : ""} gefunden
                  </span>
                </div>
              )}

              <Tabs value={searchType} onValueChange={(v) => setSearchType(v as typeof searchType)}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Alle ({totalResults})</TabsTrigger>
                  <TabsTrigger value="articles">Artikel ({results?.articles?.length || 0})</TabsTrigger>
                  <TabsTrigger value="sops">SOPs ({results?.sops?.length || 0})</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {searchLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {results?.articles?.map((article) => (
                        <Card
                          key={article.id}
                          className="card-shadow hover:elevated-shadow transition-all cursor-pointer"
                          onClick={() => setLocation(`/wiki/article/${article.slug}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                                <FileText className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium">{article.title}</h4>
                                  {useSemanticSearch && 'similarity' in article && article.similarity > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {formatSimilarity(article.similarity)}% Relevanz
                                    </Badge>
                                  )}
                                </div>
                                {article.excerpt && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {article.excerpt}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {results?.sops?.map((sop) => (
                        <Card
                          key={sop.id}
                          className="card-shadow hover:elevated-shadow transition-all cursor-pointer"
                          onClick={() => setLocation(`/sops/view/${sop.slug}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="p-2 rounded-lg bg-green-500/10 mt-1">
                                <ClipboardList className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-medium">{sop.title}</h4>
                                  {useSemanticSearch && 'similarity' in sop && sop.similarity > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {formatSimilarity(sop.similarity)}% Relevanz
                                    </Badge>
                                  )}
                                </div>
                                {sop.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {sop.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {totalResults === 0 && (
                        <Card className="card-shadow">
                          <CardContent className="p-8 text-center">
                            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">
                              Keine Ergebnisse für "{searchQuery}" gefunden
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                <TabsContent value="articles" className="space-y-4">
                  {results?.articles?.map((article) => (
                    <Card
                      key={article.id}
                      className="card-shadow hover:elevated-shadow transition-all cursor-pointer"
                      onClick={() => setLocation(`/wiki/article/${article.slug}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10 mt-1">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{article.title}</h4>
                            {article.excerpt && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {article.excerpt}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!results?.articles || results.articles.length === 0) && (
                    <Card className="card-shadow">
                      <CardContent className="p-8 text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Keine Artikel gefunden</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="sops" className="space-y-4">
                  {results?.sops?.map((sop) => (
                    <Card
                      key={sop.id}
                      className="card-shadow hover:elevated-shadow transition-all cursor-pointer"
                      onClick={() => setLocation(`/sops/view/${sop.slug}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-green-500/10 mt-1">
                            <ClipboardList className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium">{sop.title}</h4>
                            {sop.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {sop.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!results?.sops || results.sops.length === 0) && (
                    <Card className="card-shadow">
                      <CardContent className="p-8 text-center">
                        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Keine SOPs gefunden</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Initial State */}
          {searchQuery.length < 2 && (
            <Card className="card-shadow">
              <CardContent className="p-8 text-center">
                <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 w-fit mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-medium mb-2">AI-gestützte Suche</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Stellen Sie Fragen in natürlicher Sprache wie "Wie beantrage ich Urlaub?" 
                  oder "Was ist der Prozess für Kundenreklamationen?"
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="assistant" className="mt-6">
          <Card className="card-shadow overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-medium">AI-Assistent</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleNewChat}>
                <Plus className="h-4 w-4 mr-1" />
                Neuer Chat
              </Button>
            </div>
            
            <ScrollArea ref={scrollRef} className="h-[400px] p-4">
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
                  </p>
                  <div className="grid gap-2 w-full max-w-md">
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => {
                        setChatInput("Welche SOPs gibt es für den Onboarding-Prozess?");
                        inputRef.current?.focus();
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-3 shrink-0" />
                      <span className="text-left text-sm">Welche SOPs gibt es für den Onboarding-Prozess?</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start h-auto py-3 px-4"
                      onClick={() => {
                        setChatInput("Wie funktioniert unser Bestellprozess?");
                        inputRef.current?.focus();
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-3 shrink-0" />
                      <span className="text-left text-sm">Wie funktioniert unser Bestellprozess?</span>
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
                        
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-border/30">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-3 w-3 text-primary" />
                              <span className="text-xs font-medium">Quellen</span>
                            </div>
                            <div className="space-y-1">
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
                                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-background/60 hover:bg-background text-left text-xs"
                                >
                                  {source.type === "article" ? (
                                    <FileText className="h-3 w-3 text-blue-500" />
                                  ) : (
                                    <ClipboardList className="h-3 w-3 text-green-500" />
                                  )}
                                  <span className="truncate">{source.title}</span>
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

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Stellen Sie eine Frage..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
