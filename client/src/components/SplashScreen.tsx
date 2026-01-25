import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface SplashScreenProps {
  onComplete?: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 1500 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    // Mindestanzeigedauer bevor der Splash-Screen ausgeblendet wird
    const timer = setTimeout(() => {
      setIsAnimatingOut(true);
      // Nach der Ausblende-Animation den Callback aufrufen
      setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 500); // Dauer der Ausblende-Animation
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500",
        isAnimatingOut && "opacity-0"
      )}
    >
      {/* Logo Container mit Animation */}
      <div className="relative flex flex-col items-center gap-6">
        {/* Animated Glow Ring */}
        <div className="absolute -inset-8 animate-pulse">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-secondary-accent/20 to-primary/20 blur-2xl" />
        </div>
        
        {/* Logo Icon */}
        <div 
          className={cn(
            "relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary-accent shadow-2xl",
            "animate-in zoom-in-50 duration-700 ease-out"
          )}
        >
          {/* Sparkle Icon */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-12 h-12 text-white animate-in spin-in-180 duration-1000"
          >
            <path
              d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z"
              fill="currentColor"
            />
          </svg>
        </div>

        {/* App Name */}
        <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary via-secondary-accent to-primary bg-clip-text text-transparent">
            ohwee
          </h1>
          <p className="text-sm text-muted-foreground">
            Dein Team-Hub
          </p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center gap-1.5 mt-4 animate-in fade-in duration-700 delay-500">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
        </div>
      </div>

      {/* Bottom Branding */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1 animate-in fade-in duration-700 delay-700">
        <p className="text-xs text-muted-foreground/60">
          Powered by
        </p>
        <p className="text-sm font-medium text-muted-foreground">
          Company Wiki
        </p>
      </div>
    </div>
  );
}

// Hook um zu prüfen ob die App als PWA läuft
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Prüfe ob die App im Standalone-Modus läuft (als PWA installiert)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true
      || document.referrer.includes('android-app://');
    
    setIsPWA(isStandalone);
  }, []);

  return isPWA;
}

// Hook für den Splash-Screen State
export function useSplashScreen(showOnlyInPWA = true) {
  const isPWA = useIsPWA();
  const [showSplash, setShowSplash] = useState(() => {
    // Prüfe ob der Splash-Screen bereits in dieser Session gezeigt wurde
    const hasShown = sessionStorage.getItem('splash-shown');
    if (hasShown) return false;
    
    // Zeige Splash nur beim ersten Laden
    return true;
  });

  const hideSplash = () => {
    setShowSplash(false);
    sessionStorage.setItem('splash-shown', 'true');
  };

  // Wenn nur in PWA angezeigt werden soll und nicht PWA, dann nicht anzeigen
  const shouldShow = showOnlyInPWA ? (isPWA && showSplash) : showSplash;

  return { showSplash: shouldShow, hideSplash, isPWA };
}
