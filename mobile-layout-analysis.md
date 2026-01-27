# Mobile Layout Analyse - iPhone Screenshot

## Beobachtungen aus Screenshot IMG_3060.PNG

Das Bild zeigt ein iPhone mit:
- Browser-Adressleiste oben
- App-Header "Taps" 
- Chat-Bereich mit Nachrichten
- **Untere Navigation** mit Icons (Home, AI Suche, Taps, Kalender, Aufgaben, How to Work, Mehr)
- **iOS Home-Indicator** ganz unten (die schwarze Leiste)

## Problem
Das Eingabefeld ist fast komplett verdeckt - man sieht nur einen kleinen grauen Streifen über der Navigation.

## Lösung
Die Navigation hat auf dem iPhone:
- h-16 (64px) für die Icons
- pb-safe für die Safe-Area (ca. 34px auf iPhone ohne Home-Button)
- Gesamt: ca. 98-100px

Das Eingabefeld muss mit bottom: 100px oder mehr positioniert werden.

## Alternative Lösung
Statt CSS calc() mit env() zu verwenden, könnte man:
1. Einen festen Wert wie bottom-[100px] verwenden
2. Oder die Navigation-Höhe mit JavaScript messen und als CSS-Variable setzen
