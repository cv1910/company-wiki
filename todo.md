# Company Wiki - TODO

## Authentifizierung & Berechtigungen
- [x] Google Workspace SSO Integration (Manus OAuth mit Google Login)
- [x] Granulares Berechtigungssystem (Lesen, Bearbeiten, Admin)
- [x] Berechtigungen auf Artikel- und Kategorieebene
- [x] Automatische Rollenzuweisung bei Erstanmeldung

## Datenbank-Schema
- [x] Categories Tabelle (hierarchisch)
- [x] Articles Tabelle mit Metadaten
- [x] ArticleVersions Tabelle für Versionierung
- [x] Permissions Tabelle für granulare Rechte
- [x] SOPs Tabelle für Scribe-Links
- [x] ChatHistory Tabelle für AI-Assistent

## Wiki-System
- [x] Kategorien CRUD mit hierarchischer Struktur
- [x] Artikel CRUD Operationen
- [x] Rich-Text-Editor für Artikelbearbeitung
- [x] Artikel-Kategoriezuordnung
- [x] Berechtigungsprüfung bei allen Operationen

## Versionierung
- [x] Automatische Versionserstellung bei Änderungen
- [x] Änderungshistorie anzeigen
- [x] Wiederherstellungsfunktion für alte Versionen
- [x] Diff-Ansicht zwischen Versionen

## SOP-Bereich
- [x] SOP-Einträge mit Scribe-Link-Integration
- [x] Vollständige Anzeige eingebetteter Scribe-Inhalte
- [x] SOP-Kategorisierung
- [x] SOP-Suche

## AI-Chat-Assistent
- [x] Chat-Interface als ergänzende Funktion
- [x] Fragen in natürlicher Sprache
- [x] Antworten basierend auf Wiki-Inhalten
- [x] Quellenangaben bei Antworten

## Suche
- [x] Globale Volltextsuche über Artikel und SOPs
- [x] Filteroptionen (Kategorie, Typ)
- [x] Berechtigungsprüfung bei Suchergebnissen
- [x] Suchvorschläge

## Dashboard
- [x] Übersicht mit Schnellzugriff
- [x] Kürzlich bearbeitete Artikel
- [x] Aktivitäts-Feed

## Kollaborative Funktionen
- [ ] Bearbeitungsstatus anzeigen
- [x] Benachrichtigungen bei Änderungen
- [x] Kommentarfunktion für Artikel

## Design (Apple macOS-Stil)
- [x] SF Pro Font Integration
- [x] Subtile Schatten und abgerundete Ecken
- [x] Minimalistisches, cleanes Design
- [x] Responsive Layout
- [x] Sidebar-Navigation im macOS-Stil

## Frontend-Seiten
- [x] Dashboard/Home-Seite mit Übersicht
- [x] Wiki-Übersichtsseite mit Kategorien
- [x] Wiki-Kategorie-Ansicht
- [x] Wiki-Artikel-Ansicht mit Markdown-Rendering
- [x] Wiki-Editor mit Markdown
- [x] SOP-Übersichtsseite
- [x] SOP-Ansicht mit Scribe-Embed
- [x] SOP-Editor
- [x] Globale Suchseite
- [x] AI-Chat-Interface
- [x] Benachrichtigungsseite
- [x] Admin: Kategorieverwaltung
- [x] Admin: Benutzerverwaltung
- [x] Admin: Einstellungen

## Tests
- [x] Backend-Tests für tRPC-Router
- [x] Authentifizierungs-Tests

## Feedback-System
- [x] Datenbank-Tabelle für Artikel-Feedback
- [x] Backend-API für Feedback (erstellen, lesen, aktualisieren)
- [x] Feedback-Widget in der Artikelansicht
- [x] Feedback-Übersicht für Editoren/Admins
- [x] Benachrichtigungen bei neuem Feedback
- [x] Tests für Feedback-Funktionen

## Vorlagen-System
- [x] Datenbank-Tabelle für Artikelvorlagen
- [x] Backend-API für Vorlagen (CRUD)
- [x] Vorlagen-Auswahl beim Erstellen neuer Artikel
- [x] Standard-Vorlagen (Onboarding, Prozessbeschreibung, Meeting-Protokoll, FAQ)
- [x] Admin-Bereich für Vorlagenverwaltung

## Drag & Drop Bildupload
- [x] S3-Integration für Bildupload
- [x] Drag & Drop Zone im Editor
- [x] Bildvorschau und Fortschrittsanzeige
- [x] Automatische Markdown-Bildeinbettung
- [x] Bildgröße-Validierung

## WYSIWYG-Editor
- [x] TipTap Editor Integration
- [x] Toolbar mit Formatierungsoptionen (Bold, Italic, Headings, Listen)
- [x] Bildeinbettung im WYSIWYG-Modus
- [x] Link-Einfügung mit Dialog
- [x] Code-Blöcke und Inline-Code
- [x] Tabellen-Unterstützung
- [x] Markdown-Import/Export Kompatibilität

## Entwürfe & Freigabe-Workflow
- [x] Draft-Status für Artikel (draft, pending_review, published, archived)
- [x] Entwürfe speichern ohne Veröffentlichung
- [x] Review-Anfrage an Editoren/Admins
- [x] Freigabe-/Ablehnungs-Workflow
- [x] Benachrichtigungen bei Status-Änderungen
- [x] Übersicht ausstehender Reviews für Editoren

## Audit-Log
- [x] Datenbank-Tabelle für Audit-Einträge
- [x] Automatische Protokollierung aller wichtigen Aktionen
- [x] Benutzer, Aktion, Zeitstempel, Details speichern
- [x] Admin-Ansicht für Audit-Log mit Filterung
- [ ] Export-Funktion für Compliance

## UX-Verbesserungen
- [x] Favoriten-System für Artikel
- [x] Keyboard-Shortcuts (⌘K für Suche, etc.)
- [x] Dark Mode mit Theme-Switcher
- [x] Zuletzt angesehene Artikel

## Urlaubsantrag-System
- [x] Datenbank-Tabelle für Urlaubsanträge
- [x] Backend-API für Anträge (erstellen, genehmigen, ablehnen)
- [x] Urlaubsantrag-Formular für Mitarbeiter
- [x] Genehmigungsworkflow für Vorgesetzte
- [x] Kalenderübersicht der Abwesenheiten
- [x] Resturlaub-Anzeige
- [x] Benachrichtigungen bei Status-Änderungen

## Design-Polish
- [x] Micro-Animationen für Übergänge
- [x] Glassmorphism-Elemente (macOS-Stil)
- [x] Verbesserte Typografie mit mehr Weißraum
- [x] Hover-Effekte und Loading-States
- [x] Sanfte Farbverläufe
- [x] Leere-Zustände mit Illustrationen

## Semantische AI-Suche
- [x] Datenbank-Tabelle für Vektor-Embeddings
- [x] Embedding-Generierung bei Artikel-Erstellung/Update
- [x] Semantische Suche über Embeddings
- [x] AI-Assistent mit Kontext aus semantischer Suche
- [x] Ähnliche Artikel basierend auf Embeddings
- [x] Tests für semantische Suche

## Diff-Ansicht für Versionen
- [x] Diff-Bibliothek integrieren (diff-match-patch)
- [x] Backend-Endpoint für Versionsvergleich
- [x] Visuelle Diff-Ansicht mit farblicher Hervorhebung
- [x] Nebeneinander- und Inline-Ansicht

## Automatische Embedding-Generierung
- [x] Trigger bei Artikel-Veröffentlichung
- [x] Trigger bei SOP-Veröffentlichung
- [x] Hintergrund-Job für Embedding-Updates

## Suchvorschläge
- [x] Backend-Endpoint für Vorschläge
- [x] Autocomplete-Komponente im Frontend
- [x] Debounced-Suche während der Eingabe
- [x] Anzeige von Artikel-Titeln als Vorschläge

## E-Mail-Benachrichtigungen
- [x] Datenbank-Tabelle für Benachrichtigungseinstellungen
- [x] E-Mail-Service Integration (Manus Notification API)
- [x] E-Mail bei neuem Urlaubsantrag an Vorgesetzte
- [x] E-Mail bei Genehmigung/Ablehnung an Antragsteller
- [x] E-Mail bei Review-Anfragen
- [x] E-Mail bei @Mentions
- [x] Benutzereinstellungen für E-Mail-Präferenzen

## @Mentions
- [x] Datenbank-Tabelle für Mentions
- [x] @-Erkennung im WYSIWYG-Editor
- [x] Benutzer-Autocomplete bei @-Eingabe
- [x] @Mentions in Kommentaren
- [x] Benachrichtigung an erwähnte Personen (In-App + E-Mail)
- [x] Mentions-Übersicht für Benutzer

## Bugfixes
- [x] HTML-Nesting-Fehler: p-Tag enthält div auf Dashboard-Seite

## Dashboard-Verbesserungen
- [x] Dashboard visuell attraktiver gestalten (Hero-Bereich, Navigation-Grid, Stats-Karten)
- [x] Company-wide Announcements Bereich hinzufügen (Datenbank-Tabelle + API + UI)
- [x] Schnellzugriff umbenennen zu "Navigation" und besser darstellen
- [x] Alle Elemente klickbar machen (Stats-Karten, Artikel, Aktivitäten)
- [x] Test-Templates aus der Datenbank entfernen (keine Test-Daten vorhanden)
- [x] Benutzer-Statistik zur Dashboard-Übersicht hinzugefügt
- [x] HTML-Nesting-Fehler: p-Tag enthält div auf Dashboard-Seite (erneut aufgetreten)

## Ankündigungsverwaltung
- [x] Admin-Seite für Ankündigungen erstellen (CRUD)
- [x] Navigation zur Ankündigungsverwaltung hinzufügen

## Bugfixes
- [x] getUserFeedback-Query gibt undefined zurück statt null/leeres Objekt

## Onboarding-Bereich
- [x] Onboarding als eigenen Navigationspunkt in der Sidebar hinzufügen
- [x] Onboarding-Kachel auf dem Dashboard hinzufügen
- [x] Dedizierte Onboarding-Seite erstellen

## Zuweisungssystem
- [x] Datenbank-Schema für Zuweisungen (assignments) erstellen
- [x] API-Endpunkte für Zuweisungen implementieren
- [x] UI für Zuweisung von SOPs und Onboarding-Artikeln an Benutzer (Admin-Seite)
- [x] Fortschrittsverfolgung für zugewiesene Inhalte (auf Onboarding-Seite)

## Kommentarfunktion
- [x] Bestehende Kommentar-Infrastruktur prüfen (Datenbank, API) - bereits vorhanden!
- [x] Kommentar-UI-Komponente erstellen - bereits vorhanden!
- [x] Kommentare in Wiki-Artikel-Seite integrieren - bereits vorhanden!
- [x] Benutzernamen und Avatar in Kommentaren anzeigen
- [x] Antworten auf Kommentare ermöglichen (Thread-Ansicht)
- [x] Kommentare bearbeiten und löschen ermöglichen
- [x] Kommentare als gelöst markieren (für Editoren)

## E-Mail-Benachrichtigungen
- [x] E-Mail-Benachrichtigungen für neue Kommentare aktivieren
- [x] E-Mail-Einstellungen in Benutzereinstellungen konfigurierbar machen (bereits vorhanden)

## @Erwähnungen in Kommentaren
- [x] Prüfen ob @Erwähnungen in Kommentaren funktionieren (Backend bereits implementiert)
- [x] Autocomplete für @Erwähnungen in Kommentar-Textarea hinzufügen
- [x] Erwähnungen visuell hervorheben (in MentionTextarea)
- [x] @Erwähnungen werden automatisch verarbeitet und Benachrichtigungen gesendet

## AI-Assistenten-Erweiterungen
- [x] Konversationsgedächtnis implementieren (Chat-History mit Zusammenfassung)
- [x] Verbesserte Quellenangaben mit direkten Links zu Artikeln
- [x] Zitate aus Originalquellen in Antworten hervorheben (System-Prompt)
- [x] Verwandte Artikel am Ende der Antwort vorschlagen (System-Prompt)

## Urlaubsanspruch-Verwaltung
- [x] API-Endpunkt zum Abrufen aller Mitarbeiter mit Urlaubsanspruch
- [x] API-Endpunkt zum Aktualisieren des individuellen Urlaubsanspruchs
- [x] Admin-UI mit Übersicht aller Mitarbeiter und deren Urlaubsanspruch
- [x] Bearbeitungsdialog für individuellen Urlaubsanspruch

## Urlaubsübertrag ins nächste Jahr
- [x] Backend-Funktion zum Übertragen von Resturlaub ins nächste Jahr
- [x] API-Endpunkt zum manuellen Auslösen des Übertrags (Admin)
- [x] Konfiguration für maximale Übertragstage
- [x] Admin-UI mit Button zum Auslösen des Übertrags
- [x] Anzeige der Übertragstage in der Urlaubsanspruch-Übersicht

## Automatischer Jahresübertrag
- [x] Cron-Job für automatischen Urlaubsübertrag am 1. Januar
- [x] Admin-Einstellungen für automatischen Übertrag (aktivieren/deaktivieren, max. Tage)
- [x] Benachrichtigung an Admin nach erfolgreichem Übertrag

## SOP: Urlaubsantrag
- [x] SOP-Kategorie "HR & Personal" erstellen
- [x] SOP "Urlaubsantrag stellen" mit Schritt-für-Schritt-Anleitung erstellen

## UI-Korrekturen
- [x] Test-Templates aus der Datenbank löschen (keine Test-Templates in DB gefunden)
- [x] Dashboard → Home umbenennen
- [x] Kategorien → Bereiche umbenennen
- [x] SOP-Kategorie-Klick funktioniert nicht - Link hinzufügen (SOPCategory-Seite erstellt)
- [x] SOP zeigt Markdown als Rohtext - Markdown-Rendering mit Streamdown implementieren
- [x] Onboarding als eigenständige Kategorie (bereits als eigener Menüpunkt)

## Premium-Features (Marktführer-Niveau)

### Versionskontrolle (erweitert)
- [x] UI: Versionshistorie-Button in Artikel-Ansicht (bereits vorhanden)
- [x] UI: Versionen-Liste mit Autor, Datum, Zusammenfassung (bereits vorhanden)
- [x] UI: Diff-Ansicht zwischen zwei Versionen (bereits vorhanden mit DiffViewer)
- [x] UI: Version wiederherstellen mit Bestätigung (bereits vorhanden)

### Analytics Dashboard
- [x] Datenbank-Schema für Seitenaufrufe/Events
- [x] Tracking für Artikel-Aufrufe implementieren
- [x] Admin-Dashboard mit Statistiken erstellen
- [x] Beliebte Artikel anzeigen
- [x] Suchbegriffe-Analyse
- [x] Benutzer-Aktivität anzeigen

### Inhaltsverifizierung
- [x] Datenbank-Felder für Verifizierungsstatus und Ablaufdatum
- [x] API-Endpunkte für Verifizierung
- [x] UI: Artikel als "verifiziert" markieren
- [x] UI: Ablaufdatum für Überprüfung setzen
- [x] Benachrichtigung bei abgelaufener Verifizierung
- [x] Übersicht aller Artikel mit Verifizierungsstatus

## Personalisierbare Dashboard-Widgets
- [x] Datenbank-Schema für Widget-Präferenzen (userDashboardSettings)
- [x] API-Endpunkte für Widget-Einstellungen (get, update)
- [x] Widget-Komponenten modular gestalten
- [x] Einstellungs-Dialog zum Ein-/Ausblenden von Widgets
- [x] Drag & Drop für Widget-Anordnung
- [x] Präferenzen persistent speichern
- [x] Tests für Widget-Personalisierung

## Widget-Größenanpassung
- [x] Datenbank-Schema für Widget-Größen erweitern (widgetSizes JSON-Feld)
- [x] Backend-API für Größeneinstellungen implementieren
- [x] Frontend: Größenauswahl-UI im Anpassungs-Dialog
- [x] Widget-Rendering mit verschiedenen Größen (klein, mittel, groß)
- [x] Tests für Widget-Größenanpassung

## Kalender (Hey Calendar-Stil)
- [ ] Hey Calendar Design recherchieren
- [x] Datenbank-Schema für Termine (calendarEvents)
- [x] Backend-API für Termine (CRUD)
- [x] Monatsansicht implementieren
- [x] Wochenansicht implementieren
- [x] Tagesansicht implementieren
- [x] Jahresansicht implementieren
- [x] Termin-Erstellung (Dialog)
- [x] Ganztägige Termine unterstützen
- [x] Mehrtägige Termine unterstützen
- [x] Urlaubs-Integration (genehmigte Urlaube anzeigen)
- [x] Kalender in Sidebar-Navigation hinzufügen
- [x] Tests für Kalender-Funktionalität

## Kalender Import/Export (iCal)
- [x] iCal-Bibliothek (ical.js) installieren
- [x] Backend: Export-Endpunkt für iCal-Dateien
- [x] Backend: Import-Endpunkt für iCal-Dateien
- [x] Frontend: Export-Button im Kalender
- [x] Frontend: Import-Dialog für iCal-Dateien
- [ ] Unterstützung für wiederkehrende Termine beim Import
- [x] Tests für Import/Export-Funktionalität

## Google Calendar-Integration
- [x] Datenbank-Schema für Google-Verbindungen (googleCalendarConnections)
- [x] Google OAuth-Flow implementieren (Verbinden/Trennen)
- [x] Token-Management (Access Token, Refresh Token)
- [x] Import: Google-Termine abrufen und synchronisieren
- [x] Export: Lokale Termine zu Google synchronisieren
- [x] Zwei-Wege-Sync mit Konfliktbehandlung
- [x] Frontend: Verbindungs-UI in Kalender-Einstellungen
- [x] Frontend: Sync-Status und letzte Synchronisation anzeigen
- [x] Tests für Google Calendar-Integration

## Jahreskalender Hey-Style & Erweiterte Termin-Optionen
- [x] Datenbank: Neue Felder für Termine (link, invites, notes, repeat, countdown, isCircleEvent)
- [x] Jahreskalender: Horizontales Scroll-Layout wie Hey Calendar
- [x] Jahreskalender: Wochentage als Zeilen, Tage als Spalten
- [x] Jahreskalender: Mehrtägige Events als horizontale Balken
- [x] Jahreskalender: Monatswechsel-Markierungen
- [x] Termin-Dialog: Link-Option hinzufügen
- [x] Termin-Dialog: Invites-Option hinzufügen (UI vorbereitet)
- [x] Termin-Dialog: Notes-Option hinzufügen
- [x] Termin-Dialog: Repeat-Option hinzufügen
- [x] Termin-Dialog: Countdown-Option hinzufügen
- [x] Termin-Dialog: Circle Event-Option hinzufügen
- [x] Termin-Dialog: Erinnerung/Notify-Option hinzufügen

## Kalender Drag & Drop
- [x] Drag & Drop in Monatsansicht (Termine auf andere Tage ziehen)
- [x] Drag & Drop in Wochenansicht (Termine verschieben)
- [x] Drag & Drop in Tagesansicht (Termine verschieben)
- [ ] Resize-Funktion für Termin-Dauer (Anfang/Ende anpassen) - spätere Erweiterung
- [x] Visuelles Feedback beim Ziehen (Ghost-Element, Drop-Zone Highlight)

## Jahreskalender Hey-Style Korrektur
- [x] Layout exakt wie Hey: Jede Zelle zeigt "WOC TAG" (z.B. "MON 26", "TUE 27")
- [x] Fette Tageszahlen
- [x] Wochentage in Großbuchstaben, klein und grau
- [x] Monatswechsel mit farbigem Label (z.B. "JAN", "FEB")
- [x] Horizontales Scroll-Layout mit Tagen als Spalten

## Jahreskalender Layout-Korrektur v2
- [x] Wochen als horizontale Zeilen (nicht alle Tage in einer Zeile)
- [x] Jede Woche = eine Zeile mit MON bis SUN
- [x] Vertikales Scrollen durch die Wochen des Jahres

## Jahreskalender Bildschirmfüllend
- [x] Zellen über die gesamte Bildschirmbreite (flex-1)
- [x] Keine feste Zellenbreite, responsive Layout
- [x] Wie bei Hey Calendar: volle Breite nutzen

## Jahreskalender Hey-Style KORREKT
- [x] 7 Zeilen für Wochentage (MON, TUE, WED, THU, FRI, SAT, SUN als Zeilen-Header links)
- [x] Tage als Spalten horizontal durchs Jahr (53 Wochen-Spalten)
- [x] Horizontales Scrollen durch das Jahr
- [x] Monatslabels bei Monatswechsel
- [x] Mehrtägige Events als horizontale Balken über Spalten

## Jahreskalender Hey-Style FINAL
- [ ] Jeder Tag = eine eigene Spalte (365 Spalten für das Jahr)
- [ ] Horizontales Scrollen durch ALLE Tage des Jahres (nicht nur Wochen)
- [ ] 7 Zeilen für Wochentage (MON-SUN) als fixierte Zeilen-Header links
- [ ] Monatslabels in der Kopfzeile über den entsprechenden Tagen
- [ ] Schmale Spalten (ca. 24-32px pro Tag) für kompakte Darstellung

## Jahreskalender Bildschirmfüllend (KEIN horizontales Scrollen)
- [ ] 7 Spalten für Wochentage (MON-SUN) über die VOLLE Bildschirmbreite
- [ ] Wochen als Zeilen (vertikales Scrollen durch das Jahr)
- [ ] Jede Zelle zeigt "WOC TAG" (z.B. "MON 26")
- [ ] Kein horizontales Scrollen - alles sofort sichtbar
- [ ] Responsive Layout das sich an Bildschirmbreite anpasst

## Jahreskalender Hey-Style EXAKT (basierend auf Screenshot)
- [ ] Wochen als Zeilen (52-53 Zeilen für das Jahr)
- [ ] Tage fließen horizontal durch die Zeilen (MON 26, TUE 27, WED 28... bis SUN)
- [ ] Gesamtes Jahr auf einem Bildschirm sichtbar (kompakt)
- [ ] Keine Scrollbars - alles bildschirmfüllend
- [ ] Monatslabels bei Monatswechsel (JAN, FEB, MAR, etc.)
- [ ] Mehrtägige Events als horizontale Balken über Tage

## Jahreskalender Vollbild-Modus (exakt wie Hey)
- [ ] Sidebar ausblenden wenn Jahresansicht aktiv ist
- [ ] Zeilen noch kompakter machen (weniger Höhe pro Woche)
- [ ] Gesamtes Jahr ohne Scrollen auf einem Bildschirm sichtbar

## Jahreskalender Styling wie Hey
- [ ] Weißer/heller Hintergrund
- [ ] Keine roten Kästchen um die Zahlen - sauberes Layout
- [ ] Dezente Linien zwischen den Wochen
- [ ] Farbige Monatslabels am Anfang jedes Monats
- [ ] Responsive Design überprüfen und optimieren

## Jahreskalender Feintuning
- [x] Kästchen-Größe ähnlich wie bei Hey (28 Tage pro Zeile)
- [x] Wochenenden grau unterlegt (SAT, SUN)
- [x] Schriftgrößen wie bei Hey (Wochentag kleiner, Datum größer)

## Jahreskalender Quadratische Zellen
- [x] Zellen mit 28 Tagen pro Zeile wie bei Hey
- [x] Trennlinien wie bei Hey (Rahmen um jede Zelle)

## Jahreskalender Dynamische Zeilenhöhe
- [x] Zeilenhöhe dynamisch berechnen basierend auf verfügbarer Bildschirmhöhe
- [x] Alle Zeilen ohne Scrollen in den sichtbaren Bereich passen (nach Publizierung)

## Mehrtägige Events als horizontale Balken
- [ ] Mehrtägige Events als durchgehende horizontale Balken darstellen
- [ ] Balken erstrecken sich über die entsprechenden Tage
- [ ] Event-Titel im Balken anzeigen
- [ ] Farbkodierung für verschiedene Events

## Terminbuchungssystem (Calendly-Stil)
- [ ] Datenbank-Schema für Event-Typen (eventTypes)
- [ ] Datenbank-Schema für Verfügbarkeit (eventTypeAvailability)
- [ ] Datenbank-Schema für Buchungen (eventBookings)
- [ ] Backend-API: Event-Typen CRUD
- [ ] Backend-API: Verfügbare Slots abrufen
- [ ] Backend-API: Buchung erstellen
- [ ] Admin-UI: Scheduling-Seite mit Event-Typen-Übersicht
- [ ] Admin-UI: Event-Typ erstellen/bearbeiten Dialog
- [ ] Admin-UI: Verfügbarkeit konfigurieren (Wochentage, Uhrzeiten)
- [ ] Admin-UI: Datumsspezifische Verfügbarkeit
- [ ] Buchungsseite: Kalenderansicht mit verfügbaren Tagen
- [ ] Buchungsseite: Zeitslot-Auswahl
- [ ] Buchungsseite: Buchungsformular (Name, E-Mail, Notizen)
- [ ] Google Meet-Integration: Automatische Meeting-Link-Generierung
- [ ] Ort-Optionen: Google Meet, Telefonat, Vor-Ort
- [ ] Benachrichtigungen bei neuer Buchung
- [ ] Tests für Terminbuchungssystem

## Google Meet-Integration für Terminbuchung
- [x] Bei Buchung automatisch Google Calendar-Event mit Google Meet-Link erstellen
- [x] Google Meet-Link in Bestätigungsseite anzeigen
- [x] Google Meet-Link in Buchungsdetails speichern

## Bestätigungs-E-Mail mit Google Meet-Link
- [x] Google Meet-Link in Bestätigungs-E-Mail für Gast einfügen
- [x] E-Mail-Benachrichtigung an Host bei neuer Buchung

## Automatische Erinnerungs-E-Mails für Termine
- [x] Datenbank-Schema für Erinnerungseinstellungen (reminderMinutes in eventTypes)
- [x] E-Mail-Funktion für Erinnerungen erstellen
- [x] Scheduler für periodische Prüfung anstehender Termine (alle 5 Minuten)
- [x] Erinnerung an Gast senden (konfigurierbar: 24h und/oder 1h vorher)
- [x] Erinnerung an Host senden
- [x] Tracking welche Erinnerungen bereits gesendet wurden (remindersSent)
- [x] UI für Erinnerungs-Einstellungen im Event-Typ-Dialog

## Terminplanung nur für Admin sichtbar
- [x] Terminplanung in der Navigation nur für Admin-Benutzer anzeigen (unter ADMINISTRATION)

## Buchungszeitraum-UI im Calendly-Stil
- [x] Kombinierte Darstellung: "Gäste können bis zu X Tage in die Zukunft buchen, mit mindestens Y Stunden Vorlaufzeit"
- [x] Inline-Dropdowns wie bei Calendly

## Schedule-Verwaltung (Wiederverwendbare Verfügbarkeitsvorlagen)
- [x] Datenbank-Schema für Schedules (Name, wöchentliche Zeiten, Zeitzone)
- [x] Backend-API für Schedule-CRUD
- [x] Event-Typen mit Schedule verknüpfen (statt eigener Verfügbarkeit)
- [x] Frontend: Schedule-Verwaltungsseite unter Terminplanung ("Verfügbarkeit"-Tab)
- [x] Frontend: Schedule-Auswahl im Event-Typ-Dialog ("Schedule verwenden" oder "Eigene Zeiten")
- [x] Standard-Schedule "Arbeitszeiten" automatisch erstellen

## Ohweees-Messaging-System (Basecamp-Stil)
- [x] Datenbank: Teams-Tabelle (Name, Beschreibung, Farbe)
- [x] Datenbank: Team-Mitgliedschaften (User-Team-Zuordnung)
- [x] Datenbank: Chat-Räume (Team-Räume, Direktnachrichten, Gruppen)
- [x] Datenbank: Ohweees (Nachrichten mit Anhängen, Threads)
- [x] Datenbank: Lesebestätigungen
- [x] Backend-API: Team-CRUD
- [x] Backend-API: Chat-Raum-CRUD
- [x] Backend-API: Ohweee-CRUD (senden, bearbeiten, löschen, anpinnen)
- [x] Backend-API: Ungelesen-Zähler
- [x] Frontend: Team-Verwaltung (Admin unter /admin/teams)
- [x] Frontend: Ohweees-Übersicht mit Avatar-Grid
- [x] Frontend: Chat-Ansicht im Basecamp-Stil (Blasen, Datums-Trenner)
- [x] Frontend: Direktnachrichten starten
- [x] Frontend: Gruppen-Chats erstellen
- [x] Frontend: Datei-/Bild-Upload in Nachrichten (Paperclip-Button, max 10MB)
- [ ] Frontend: @Erwähnungen in Ohweees
  - [ ] Datenbank-Schema für Ohweee-Mentions
  - [ ] Backend: Mentions-Erkennung beim Senden
  - [ ] Backend: Benachrichtigungen an erwähnte Benutzer
  - [ ] Frontend: @-Autocomplete im Eingabefeld
  - [ ] Frontend: Mentions visuell hervorheben
- [ ] Frontend: Threads/Antworten (später)
- [x] PWA: manifest.json für iOS Home-Screen
- [ ] PWA: Service Worker für Offline-Unterstützung (später)
- [ ] PWA: Push-Benachrichtigungen vorbereiten (später)

## Datei-Upload in Ohweees
- [ ] Backend: Datei-Upload-Endpunkt für Ohweees-Anhänge
- [ ] Backend: S3-Integration für Datei-Speicherung
- [ ] Frontend: Upload-Button im Chat-Eingabefeld
- [ ] Frontend: Drag & Drop für Dateien
- [ ] Frontend: Bild-Vorschau in Nachrichten
- [ ] Frontend: Dokument-Download-Links in Nachrichten
- [ ] Frontend: Upload-Fortschrittsanzeige

## Ohweees: Threads, Reaktionen & Echtzeit

### Threads/Antworten
- [ ] Backend: Thread-Antworten abrufen (parentId-basiert)
- [ ] Frontend: Antwort-Button bei Nachrichten
- [ ] Frontend: Thread-Ansicht mit eingeklappten Antworten
- [ ] Frontend: Thread-Zähler bei Nachrichten mit Antworten

### Emoji-Reaktionen
- [ ] Datenbank-Schema für Reaktionen (ohweeeReactions)
- [ ] Backend: Reaktion hinzufügen/entfernen API
- [ ] Frontend: Reaktions-Picker (Standard-Emojis: 👍 ❤️ 😄 😮 😢 🎉)
- [ ] Frontend: Reaktionen unter Nachrichten anzeigen
- [ ] Frontend: Eigene Reaktionen hervorheben

### Echtzeit-Updates
- [ ] Backend: Polling-Endpunkt für neue Nachrichten seit Zeitstempel
- [ ] Frontend: Auto-Refresh alle 3 Sekunden
- [ ] Frontend: Neue Nachrichten sanft einblenden
- [ ] Frontend: "Neue Nachrichten"-Indikator wenn gescrollt

## Ohweees: Push-Benachrichtigungen, Suche, Lesebestätigungen
- [ ] Datenbank-Schema für Lesebestätigungen (ohweeeReadReceipts)
- [ ] Backend: Lesebestätigungen speichern und abrufen
- [ ] Backend: Volltextsuche über Ohweees
- [ ] Frontend: Lesebestätigungen-UI (wer hat gelesen)
- [ ] Frontend: Nachrichtensuche mit Filteroptionen
- [ ] Frontend: Push-Benachrichtigungen (Browser Notifications API)
- [ ] Service Worker für Hintergrund-Benachrichtigungen

## Ohweees: Ungelesen-Markierung und Typing-Indikator
- [x] Datenbank: Feld für manuell als ungelesen markierte Nachrichten
- [x] Datenbank: Tabelle für Typing-Status (wer tippt gerade in welchem Raum)
- [x] Backend: API zum Markieren/Entmarkieren als ungelesen
- [x] Backend: API für Typing-Status (setzen/abrufen)
- [x] Frontend: "Als ungelesen markieren" Option im Nachrichten-Menü
- [x] Frontend: Typing-Indikator Anzeige ("Anna schreibt...")
- [x] Frontend: Typing-Status beim Tippen senden

## Ohweees: Visuelle Ungelesen-Markierung in Raumliste
- [x] Backend: API für Ungelesen-Markierungen pro Raum
- [x] Frontend: Räume mit Ungelesen-Markierungen in Sidebar hervorheben
- [x] Frontend: Badge/Punkt bei Räumen mit ungelesenen Nachrichten

## Ohweees: Erweiterte Emoji-Reaktionen
- [x] Frontend: Emoji-Picker mit mehr Emojis
- [x] Frontend: Emoji-Suche im Picker
- [x] Frontend: Häufig verwendete Emojis anzeigen
- [x] Frontend: Emoji-Kategorien (Smileys, Gesten, Herzen, etc.)

## Ohweees: Nachrichtenvorschau in Raumliste
- [x] Backend: Letzte Nachricht pro Raum in getRooms einbinden
- [x] Frontend: Nachrichtenvorschau unter Raumnamen anzeigen
- [x] Frontend: Zeitstempel der letzten Nachricht anzeigen

## Ohweees: Emoji-Button im Eingabefeld
- [x] Frontend: Emoji-Picker-Button neben Eingabefeld
- [x] Frontend: Emoji in Nachricht einfügen

## Ohweees: Benachrichtigungs-Sound
- [x] Frontend: Sound-Datei für Benachrichtigungen
- [x] Frontend: Sound abspielen bei neuen Nachrichten
- [x] Frontend: Einstellung zum Aktivieren/Deaktivieren des Sounds

## Ohweees: Markdown-Unterstützung
- [x] Frontend: Markdown-Parser für Nachrichten (fett, kursiv, Listen, Code)
- [ ] Frontend: Formatierungs-Toolbar oder Shortcuts (optional)
- [ ] Frontend: Markdown-Vorschau beim Tippen (optional)

## Ohweees: Erweiterte Lesebestätigungen
- [x] Backend: Zugestellt-Status tracken
- [x] Backend: Gelesen-Status pro Nachricht
- [x] Frontend: Häkchen-Icons (✓ zugestellt, ✓✓ gelesen)
- [x] Frontend: Detailansicht wer gelesen hat

## Ohweees: Aufgaben in Chats
- [x] Datenbank: Tabelle für Chat-Aufgaben
- [x] Backend: API zum Erstellen/Bearbeiten/Löschen von Aufgaben
- [x] Backend: API zum Abhaken von Aufgaben
- [x] Frontend: Aufgabe aus Nachricht erstellen
- [x] Frontend: Aufgabenliste im Chat anzeigen
- [x] Frontend: Aufgaben abhaken

## Ohweees: Aufgaben-Erinnerungen
- [x] Backend: API für fällige Aufgaben abrufen
- [x] Frontend: Prüfung auf fällige Aufgaben beim Laden
- [x] Frontend: Browser-Benachrichtigung für fällige Aufgaben
- [x] Frontend: Toast-Benachrichtigung für heute fällige Aufgaben

## Ohweees: Dateivorschau im Chat
- [x] Frontend: Bildvorschau inline anzeigen (statt nur Download)
- [x] Frontend: Lightbox für Vollbildansicht von Bildern
- [x] Frontend: PDF-Vorschau mit Thumbnail
- [x] Frontend: PDF-Viewer Dialog für größere Ansicht

## Ohweees: Sprachnachrichten
- [ ] Backend: Sprachnachrichten al## Ohweees: Sprachnachrichten
- [x] Frontend: Mikrofon-Button im Eingabefeld
- [x] Frontend: Audio-Aufnahme mit Wellenform-Visualisierung
- [x] Frontend: Audio-Player für Sprachnachrichten
- [x] Frontend: Aufnahme abbrechen/senden

## Ohweees: Umfragen im Chat
- [x] Datenbank: Tabellen für Umfragen und Abstimmungen
- [x] Backend: API zum Erstellen von Umfragen
- [x] Backend: API zum Abstimmen
- [x] Backend: API zum Abrufen von Umfrage-Ergebnissen
- [x] Frontend: Umfrage-Erstellungs-Dialog
- [x] Frontend: Umfrage-Anzeige mit Abstimmungs-Buttons
- [x] Frontend: Live-Ergebnis-Anzeige nach Abstimmung

## Ohweees: Nachrichtensuche im Chat
- [x] Backend: API für Volltextsuche in Nachrichten
- [x] Frontend: Suchfeld im Chat-Header
- [x] Frontend: Suchergebnisse mit Hervorhebung anzeigen
- [x] Frontend: Zu Nachricht springen bei Klick auf Ergebnis

## Ohweees: Pinned Messages
- [x] Datenbank: Feld für gepinnte Nachrichten
- [x] Backend: API zum Anheften/Lösen von Nachrichten
- [x] Backend: API zum Abrufen gepinnter Nachrichten
- [x] Frontend: Pin-Option im Nachrichten-Menü
- [x] Frontend: Gepinnte Nachrichten oben im Chat anzeigen

## Umbenennung zu ohwee
- [x] App-Titel von "Company Wiki" zu "ohwee" ändern
- [x] Logo und Branding aktualisieren
- [x] Alle Textreferenzen aktualisieren

## Dark Mode Optimierung
- [x] Farbpalette für Dark Mode verfeinern
- [x] Kontraste verbessern
- [x] Sanftere Übergänge zwischen Farben

## Benachrichtigungs-Einstellungen
- [x] Datenbank: Tabelle für Benutzer-Einstellungen
- [x] Backend: API für Einstellungen speichern/laden
- [x] Frontend: Einstellungs-Dialog mit Optionen
- [x] Optionen: @Mentions, Direktnachrichten, Raum-Updates, Sound

## Erweiterte Mitarbeiter-Profile
- [x] Datenbank: Felder für Skills, Abteilung, Telefon, Position
- [x] Backend: API für Profil-Update
- [x] Frontend: Profil-Bearbeitungs-Dialog
- [x] Frontend: Erweiterte Profilansicht
