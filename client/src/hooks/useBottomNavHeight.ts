import { useEffect, useState } from "react";
import { useIsMobile } from "./useMobile";

// Bottom Navigation Höhe: h-16 (4rem = 64px) + safe-area-bottom
const BASE_NAV_HEIGHT = 64;

export function useBottomNavHeight() {
  const isMobile = useIsMobile();
  const [bottomNavHeight, setBottomNavHeight] = useState(0);

  useEffect(() => {
    if (!isMobile) {
      setBottomNavHeight(0);
      return;
    }

    // Berechne die tatsächliche Höhe inkl. safe-area-bottom
    const calculateHeight = () => {
      // Versuche die safe-area-inset-bottom zu lesen
      const safeAreaBottom = parseInt(
        getComputedStyle(document.documentElement)
          .getPropertyValue("--sab")
          .replace("px", "") || "0",
        10
      );
      
      // Fallback: Prüfe ob env() unterstützt wird
      const testEl = document.createElement("div");
      testEl.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
      document.body.appendChild(testEl);
      const computedPadding = parseInt(getComputedStyle(testEl).paddingBottom, 10) || 0;
      document.body.removeChild(testEl);
      
      const totalHeight = BASE_NAV_HEIGHT + Math.max(safeAreaBottom, computedPadding);
      setBottomNavHeight(totalHeight);
      
      // Setze CSS-Variable für globale Nutzung
      document.documentElement.style.setProperty("--bottom-nav-height", `${totalHeight}px`);
    };

    calculateHeight();
    
    // Recalculate on resize (z.B. bei Rotation)
    window.addEventListener("resize", calculateHeight);
    return () => window.removeEventListener("resize", calculateHeight);
  }, [isMobile]);

  return {
    bottomNavHeight,
    paddingStyle: isMobile ? { paddingBottom: `${bottomNavHeight + 16}px` } : {},
    paddingClass: isMobile ? "pb-[calc(var(--bottom-nav-height,64px)+1rem)]" : "pb-6",
  };
}
