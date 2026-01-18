import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FavoriteButtonProps {
  articleId: number;
  className?: string;
  size?: "sm" | "default" | "lg";
}

export function FavoriteButton({ articleId, className, size = "default" }: FavoriteButtonProps) {
  const utils = trpc.useUtils();
  
  const { data: isFavorite, isLoading } = trpc.favorites.check.useQuery({ articleId });
  
  const addFavorite = trpc.favorites.add.useMutation({
    onMutate: async () => {
      await utils.favorites.check.cancel({ articleId });
      const previous = utils.favorites.check.getData({ articleId });
      utils.favorites.check.setData({ articleId }, true);
      return { previous };
    },
    onError: (err, _, context) => {
      utils.favorites.check.setData({ articleId }, context?.previous);
      toast.error("Fehler beim Hinzufügen zu Favoriten");
    },
    onSuccess: () => {
      toast.success("Zu Favoriten hinzugefügt");
      utils.favorites.list.invalidate();
    },
  });
  
  const removeFavorite = trpc.favorites.remove.useMutation({
    onMutate: async () => {
      await utils.favorites.check.cancel({ articleId });
      const previous = utils.favorites.check.getData({ articleId });
      utils.favorites.check.setData({ articleId }, false);
      return { previous };
    },
    onError: (err, _, context) => {
      utils.favorites.check.setData({ articleId }, context?.previous);
      toast.error("Fehler beim Entfernen aus Favoriten");
    },
    onSuccess: () => {
      toast.success("Aus Favoriten entfernt");
      utils.favorites.list.invalidate();
    },
  });
  
  const handleClick = () => {
    if (isFavorite) {
      removeFavorite.mutate({ articleId });
    } else {
      addFavorite.mutate({ articleId });
    }
  };
  
  const isPending = addFavorite.isPending || removeFavorite.isPending;
  
  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "sm" : size === "lg" ? "lg" : "default"}
      onClick={handleClick}
      disabled={isLoading || isPending}
      className={cn(
        "gap-2 transition-all duration-200",
        isFavorite && "text-yellow-500 hover:text-yellow-600",
        className
      )}
    >
      <Star
        className={cn(
          "w-4 h-4 transition-all duration-200",
          isFavorite && "fill-current",
          isPending && "animate-pulse"
        )}
      />
      <span className="sr-only md:not-sr-only">
        {isFavorite ? "Favorit" : "Favorisieren"}
      </span>
    </Button>
  );
}

export function FavoritesList() {
  const { data: favorites, isLoading } = trpc.favorites.list.useQuery();
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded-lg skeleton-shimmer" />
        ))}
      </div>
    );
  }
  
  if (!favorites || favorites.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Keine Favoriten vorhanden</p>
        <p className="text-xs mt-1">Markieren Sie Artikel mit dem Stern-Symbol</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      {favorites.map((fav) => (
        <a
          key={fav.id}
          href={`/wiki/article/${fav.article?.slug}`}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors group"
        >
          <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
              {fav.article?.title || "Unbekannter Artikel"}
            </p>
            {fav.article?.excerpt && (
              <p className="text-xs text-muted-foreground truncate">
                {fav.article.excerpt}
              </p>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
