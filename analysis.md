# Screenshot-Analyse IMG_3010.PNG

## Probleme identifiziert:

1. **Roter/Rosa Streifen rechts**: Ein vertikaler roter/rosa Streifen ist am rechten Rand der Seite sichtbar. Dies könnte von einem Element mit overflow oder einem Hintergrund-Gradient stammen.

2. **Weißer/heller Bereich unten**: Zwischen dem grauen Inhalt (Favoriten-Karte, Onboarding-Fortschritt) und der Bottom Navigation gibt es einen hellen/weißen Bereich.

3. **Bottom Navigation**: Die Navigation am unteren Rand zeigt Icons (Home, Suche, Chat, Aufgaben, Plus, Menü) und darunter eine "Aktualisiert"-Meldung.

## Vermutete Ursachen:

1. **Roter Streifen**: Wahrscheinlich kommt dieser vom WelcomeHero-Gradient oder einem anderen Element mit `from-primary` Farbe, das über den sichtbaren Bereich hinausragt.

2. **Weißer Bereich**: Der Hintergrund des main-Containers oder des SidebarInset endet vor der Bottom Navigation. Die Seite hat möglicherweise nicht genug Inhalt um den gesamten Bereich zu füllen, und der Hintergrund ist nicht korrekt gesetzt.

## Lösung:

1. Sicherstellen dass der gesamte Bildschirm mit `bg-background` gefüllt ist
2. Overflow auf dem Container überprüfen
3. Den rosa/roten Gradient überprüfen und ggf. clippen
