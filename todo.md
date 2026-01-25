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

## Globale Suche (Spotlight-Stil)
- [x] Backend: Such-API über Artikel, SOPs, Ohweees, Personen
- [x] Frontend: Spotlight-Dialog mit Cmd+K / Ctrl+K
- [x] Frontend: Kategorisierte Suchergebnisse
- [x] Frontend: Schnellaktionen (Neuer Artikel, Nachricht an...)
- [x] Frontend: Tastaturnavigation in Ergebnissen

## Mobile-Optimierung State of the Art
- [x] Mobile Navigation: Bottom-Tab-Bar für Hauptbereiche
- [x] Mobile Sidebar: Slide-in Drawer mit Swipe-Geste
- [x] Touch-optimierte Buttons und Abstände
- [x] Pull-to-Refresh für Listen (CSS vorbereitet)
- [x] Swipe-Aktionen für Listenelemente (CSS vorbereitet)
- [x] Native-ähnliche Übergänge und Animationen
- [x] Safe-Area Unterstützung (Notch, Home-Indicator)

## PWA-Optimierung
- [x] Manifest mit App-Icons in allen Größen
- [x] Splash-Screen für App-Start (Meta-Tags vorbereitet)
- [x] iOS-spezifische Meta-Tags
- [x] Add-to-Homescreen Unterstützung

## Mobile Chat-Design (Basecamp/Hey-Stil)
- [x] Chat-Übersicht: Horizontale Avatar-Leiste für Schnellzugriff
- [x] Chat-Übersicht: Benachrichtigungs-Liste mit Avatar, Badge, Vorschau
- [x] Chat-Ansicht: Minimalistischer Header (Zurück, Name zentriert, Menü)
- [x] Chat-Ansicht: Datums-Trenner als Pill ("HEUTE"/"GESTERN")
- [x] Chat-Ansicht: Große runde Avatare (48px), Name+Zeit+Menü in einer Zeile
- [x] Chat-Ansicht: Nachrichten ohne Bubble-Hintergrund
- [x] Chat-Ansicht: Reaktionen als Avatar+Emoji unter Nachricht
- [x] Eingabefeld: Attachment-Icon links, abgerundetes Textfeld
- [x] Responsive Erkennung: Automatischer Wechsel Desktop/Mobile bei 768px
- [x] Mobile-spezifische Dialoge für Suche, Aufgaben, Threads, Emoji-Picker

## Mobile Kalender-Design Bugfix
- [x] Header-Überlappung beheben (Januar 2026 nicht lesbar)
- [x] Filter-Buttons (Team, Urlaub, Tag, W) unter Monatsanzeige verschieben
- [x] Mobile-optimiertes Layout für Kalender-Header
- [x] Visuell ansprechendes Design für mobile Ansicht

## Mobile AI-Assistent Bugfix
- [x] Header-Überlappung beheben (Titel + "Neuer Chat" Button)
- [x] Mobile-optimiertes Layout für AI-Assistent-Header

## Mobile Überlappungen prüfen
- [x] Wiki-Seite: Header-Layout für mobile Ansicht optimieren
- [x] SOPs-Seite: Header-Layout für mobile Ansicht optimieren
- [x] Onboarding-Seite: Header-Layout für mobile Ansicht optimieren

## Bottom Navigation Optimierung
- [x] Icons vergrößert (28px, h-7 w-7)
- [x] Touch-Targets auf 44px erhöht (min-h-[44px])
- [x] Aktiver Tab visuell hervorgehoben (scale-110, font-bold)
- [x] Active-State Animation (scale-95, bg-accent/50)

## Pull-to-Refresh
- [x] Pull-to-Refresh Hook implementieren (usePullToRefresh)
- [x] PullToRefresh UI-Komponente erstellt
- [x] Visuelles Feedback beim Ziehen (Spinner + Arrow)

## Umfassendes Design-Upgrade (Slack/Basecamp/Asana-Stil)
- [x] Farbpalette: Warmes Orange als Primärfarbe (oklch 0.65 0.19 45)
- [x] Schatten: Weiche, mehrschichtige Schatten (card-shadow)
- [x] Spacing: Größerer Radius (1rem statt 0.75rem)
- [x] Cards: Abgerundete Ecken, dezente Hover-Effekte
- [x] Buttons: Weichere Ecken, btn-interactive Klasse
- [x] Micro-Interactions: Sanfte Übergänge (animate-fade-in, animate-scale-in)
- [x] Focus-Ring und Gradient-Text auf Orange aktualisiert

## Premium Design-Upgrade (Asana/Monday-Stil)
- [x] Farbpalette: Vibrant Orange (oklch 0.68 0.21 38), Teal, Purple, Green
- [x] Typografie: Inter Font, größere Überschriften (text-3xl, text-4xl)
- [x] Cards: Premium-Schatten mit Hover-Lift, abgerundete Ecken (rounded-xl)
- [x] Sidebar: Größere Icons (18px), Icon-Container mit Hover-Effekten
- [x] Icons: Gradient-Hintergründe mit Rotate-Animation bei Hover
- [x] Buttons: btn-gradient Klasse mit Schatten und Hover-Effekten
- [x] Spacing: Großzügigere Abstände (p-6, gap-5)
- [x] Animationen: Rotate-6, Scale-110, translateY bei Hover
- [x] Dashboard: Welcome-Hero mit Gradienten, Stats mit Gradient-Icons

## Mobile Navigation-Cards Optimierung
- [x] Gradient-Icons auf mobilen Geräten (aktiver Tab mit Gradient-Background)
- [x] Touch-Targets auf 52px erhöht (min-h-[52px])
- [x] Icon-Container mit 44px (w-11 h-11)
- [x] Premium Sheet-Menü mit Gradient-Header und Icon-Container

## Premium-Design für weitere Seiten
- [x] Wiki-Seite: Gradient-Header mit Icon, farbige Kategorie-Cards, Premium-Artikel-Liste
- [x] SOPs-Seite: Grüner Gradient-Header, farbige Kategorie-Cards, Premium-SOP-Liste
- [x] Kalender-Seite: Lila Gradient-Header, Segmented Control für View-Mode
- [x] Einheitliche Gradient-Icons und Schatten auf allen Seiten

## Ohweees Premium-Design
- [x] Gradient-Header mit MessageCircle-Icon (Orange-Stil passend zur App)
- [x] Chat-Übersicht mit Premium-Cards und Hover-Effekten
- [x] Farbige Avatare mit Gradient-Hintergründen (8 verschiedene Farben basierend auf Name-Hash)
- [x] Mobile Chat-Ansicht mit Premium-Styling (Header, Input, Room-List)
- [x] Einheitliche Schatten und Animationen (scale-95 active, shadow-lg)

## Onboarding Premium-Design
- [x] Farbige Progress-Balken mit Gradient
- [x] Gradient-Icons für Checklisten-Items
- [x] Premium-Cards mit Hover-Effekten
- [x] Animierte Fortschrittsanzeige

## Profil-Seite Verbesserungen
- [x] Größerer Avatar mit Gradient-Fallback
- [x] Benutzer-Statistiken (Artikel, SOPs, Aktivität)
- [x] Aktivitäts-Feed mit Timeline
- [x] Premium-Layout mit Cards

## Organigramm-Feature (Trainual-Stil)
- [x] Datenbank-Schema für Organigramm (Positionen, Beziehungen)
- [x] Backend-Routen für CRUD-Operationen
- [x] Visuelle Baumstruktur mit Verbindungslinien
- [x] Mitarbeiter-Cards mit Avatar, Name, Position
- [x] Zoom-Kontrolle (50-150%)
- [x] Suche nach Mitarbeitern/Positionen
- [x] Expand/Collapse für Unterebenen
- [x] Navigation im Sidebar hinzugefügt

## Organigramm Beispiel-Daten
- [x] CEO-Position erstellen (Geschäftsführer)
- [x] Abteilungsleiter-Positionen (HR, IT, Marketing, Vertrieb, Finanzen)
- [x] Team-Lead-Positionen unter Abteilungsleitern
- [x] Seed-Button im leeren Zustand für Beispieldaten

## Organigramm Drag-and-Drop
- [x] Drag-and-Drop-Bibliothek integriert (@dnd-kit/core, @dnd-kit/sortable)
- [x] Position-Cards draggable (useDraggable Hook)
- [x] Drop-Zonen für Neupositionierung (useDroppable Hook)
- [x] Visuelles Feedback beim Ziehen (ring-4, scale-105, opacity-50)
- [x] Backend-Update bei Position-Änderung (movePosition Mutation)

## Team-Verzeichnis
- [x] Neue Seite für Team-Verzeichnis erstellen (/team)
- [x] Mitarbeiter-Cards mit Avatar, Name, Position, Abteilung
- [x] Kontaktdaten (E-Mail, Telefon)
- [x] Direktnachricht-Button (Link zu Ohweees mit ?dm=userId)
- [x] Filter nach Abteilung/Team
- [x] Suche nach Namen, E-Mail, Position
- [x] Navigation im Sidebar hinzugefügt
- [x] Grid- und Listen-Ansicht mit Toggle
- [x] Premium-Design mit Gradient-Avataren

## Erweitertes Mitarbeiter-Profil
- [x] Datenbank: Neue Felder (phone, location, bio) zur users-Tabelle
- [x] Backend: API-Endpunkte für Profil-Update (users.updateProfile)
- [x] Profil-Seite: Bearbeitungs-Dialog für alle Felder
- [x] Profil-Seite: Anzeige von Telefon, Standort, Bio
- [x] Team-Verzeichnis: Telefon und Standort in Cards anzeigen

## Organigramm-Export
- [x] Export als PNG-Bild (html2canvas)
- [x] Export-Dropdown im Organigramm-Header
- [x] Visuelles Feedback während Export (Loading-Spinner)

## Profil-Foto-Upload
- [x] Backend: Upload-Route für Profilbilder (S3-Integration mit storagePut)
- [x] Backend: avatarUrl-Feld in users-Tabelle nutzen (updateUserAvatarUrl)
- [x] Frontend: Foto-Upload-Komponente mit Vorschau
- [x] Frontend: Klick auf Avatar zum Hochladen (Camera-Overlay)
- [x] Frontend: Bildgröße-Validierung (max 5MB)
- [x] Profil-Seite: Upload-Button beim Avatar mit Loading-Spinner
- [x] Team-Verzeichnis: Hochgeladene Bilder anzeigen (object-cover)
- [x] Organigramm: Hochgeladene Bilder anzeigen (object-cover)

## Bild-Cropping vor Upload
- [x] react-image-crop Bibliothek installiert
- [x] Cropping-Dialog mit kreisförmiger Vorschau (ImageCropper-Komponente)
- [x] Aspect Ratio 1:1 für quadratische Avatare
- [x] Zoom-Slider für Bildausschnitt (50-200%)
- [x] Vorschau des zugeschnittenen Bildes mit Reset-Button

## WebP-Konvertierung
- [x] Canvas-basierte Konvertierung zu WebP (in ImageCropper integriert)
- [x] Fallback auf JPEG für ältere Browser (automatisch)
- [x] Qualitätseinstellung (85% für gute Balance)
- [x] Feste Ausgabegröße 256x256px für optimale Avatare

## Profil-Vollständigkeits-Anzeige
- [x] Berechnung der Profil-Vollständigkeit (7 Felder mit Gewichtung)
- [x] Animierte Progress-Bar mit Farbverlauf (rot/gelb/orange/grün)
- [x] Tipps welche Felder noch fehlen (erstes fehlendes Feld)
- [x] Belohnung/Badge bei 100% Vollständigkeit (Award-Icon + Erfolgsmeldung)
- [x] Klickbare fehlende Felder öffnen Edit-Dialog

## Mobile UI-Bugs (Januar 2026)
- [x] Ohweees-Icon: Brief-Symbol zu Sprechblase (MessageCircle) ändern
- [x] Wiki "Neuer Artikel": Buttons umbrechen statt abschneiden (responsive mit Icon-only auf Mobile)
- [x] Jahreskalender: Komplett unleserlich - Zahlen überlappen (neue Mobile-Ansicht mit 12 Mini-Kalender-Karten)
- [x] Suche X-Button: Wird vom Suchfeld überdeckt (pr-12 Padding + Button hinzugefügt)
- [x] Wochenansicht: Sonntag-Spalte wird abgeschnitten (horizontales Scrollen + kompaktere Darstellung)

## Pull-to-Refresh (Januar 2026)
- [x] PullToRefresh-Komponente prüfen und anpassen (bereits vorhanden und funktional)
- [x] Pull-to-Refresh in Home-Seite integrieren
- [x] Pull-to-Refresh in Wiki-Seite integrieren
- [ ] Pull-to-Refresh in Ohweees/Chat-Seite integrieren (Ohweees hat eigene Scroll-Logik)
- [x] Pull-to-Refresh in Kalender-Seite integrieren
- [x] Mobile Ansicht testen (Screenshot verifiziert)

## UX-Verbesserungen (Januar 2026)
- [x] Haptic Feedback beim Pull-to-Refresh (Vibration auf iOS/Android)
- [x] Skeleton Loading während des Refreshs anzeigen
- [x] Chat-Design wie Basecamp: Beige/cremefarbene Nachrichten anderer, blaue eigene Nachrichten
- [x] Emoji-Reaktionen mit Avatar wie Basecamp (Avatar + Emoji in Pill-Form)
- [x] Datums-Separator wie Basecamp (TODAY Badge)

## Chat-Features (Januar 2026)
- [x] Emoji-Picker: Vollständiger Emoji-Picker für Reaktionen (bereits vorhanden)
- [x] Lesebestätigungen: Anzeige wer die Nachricht gelesen hat (WhatsApp-Style mit Doppel-Haken + Avatare)
- [x] Swipe-Gesten: Wischen nach links/rechts für schnelle Aktionen (rechts = Antworten, links = Löschen/Reagieren)

## Farbkonzept & Chat-Features (Januar 2026)
- [x] Neues Farbkonzept: #ff614e (Primary), #f865d4 (Accent), #fdcfff (Light), #fcb52d (Warning), #ad7f11 (Muted), #2e93c1 (Info)
- [x] Nachrichtensuche im Chat mit Sprung zur gefundenen Nachricht
- [x] Sprachnachrichten-Transkription (automatische Textumwandlung)
- [x] Nachrichtenweiterleitung an andere Chats

## Push-Benachrichtigungen (Januar 2026)
- [x] Service Worker für Push-Notifications erstellen
- [x] Push-Subscription im Frontend implementieren
- [x] Backend-Endpunkt zum Speichern von Push-Subscriptions (bereits vorhanden)
- [x] Push-Nachrichten bei neuen Chat-Nachrichten senden
- [x] Benutzer-Opt-in UI für Benachrichtigungen
- [x] Benachrichtigungs-Einstellungen pro Benutzer (bereits vorhanden, erweitert)

## VAPID-Keys Konfiguration (Januar 2026)
- [x] VAPID-Keys generieren
- [x] Keys als Secrets konfigurieren (hardcoded als Fallback)
- [x] Frontend VAPID Public Key einbinden

## Umbenennung (Januar 2026)
- [x] Ohweees → Taps umbenennen (Navigation, Texte, UI)

## Bug-Fixes (Januar 2026)
- [x] Kalender, Home, Wiki laden nicht (PullToRefresh md:hidden fix - Desktop-Version hinzugefügt)
- [x] Chat-Symbol (MessageCircle) für Taps in Navigation (bereits korrekt)

## SOP-Editor Verbesserungen (Januar 2026)
- [x] Kategorie erstellen: Option zum Erstellen neuer Kategorien direkt im Dropdown (Plus-Button)
- [x] Sortierung: Sortierungsfeld war bereits sichtbar
- [x] Scribe Embed-Code Feld entfernt (URL reicht)

## SOPs Mobile Layout Bug (Januar 2026)
- [x] Kategorie-Karten rutschen hoch und rechts auf Mobile (grid-cols-1 auf Mobile)
- [x] Layout nicht korrekt ausgerichtet (flex-shrink-0 für Icons, w-full für Karten)

## SOP PDF-Upload & Scribe (Januar 2026)
- [x] PDF-Upload für SOPs ermöglichen (Datenbankfeld, Upload-Funktion, Anzeige)
- [x] Scribe-Vorschau ohne Login-Anforderung (Embed-URL wird automatisch aus Share-URL generiert)

## Organigramm Bug (Januar 2026)
- [x] React Error #301: Maximum update depth exceeded - setExpandedNodes aus useMemo entfernt

## Organigramm Zoom (Januar 2026)
- [x] Zoom-Stufen-Buttons für schrittweise Verkleinerung/Vergrößerung (50%, 75%, 100%, 125%, 150% + Feinabstimmung)

## Organigramm Pinch-to-Zoom (Januar 2026)
- [x] Pinch-to-Zoom Touch-Gesten für Mobilgeräte aktivieren

## Organigramm Vollbild & Doppeltipp (Januar 2026)
- [x] Vollbildmodus-Button für bessere Übersicht (CSS-Fullscreen mit Zoom-Controls im Header)
- [x] Doppeltipp zum Zoomen auf eine Position (wechselt zwischen 100% und 150%)

## Erweiterte Organigramm-Navigation (Januar 2026)
- [x] Positions-Fokus: Doppeltipp zentriert die angeklickte Position im Viewport (mit Zoom-Wechsel und Smooth-Scroll)
- [x] Minimap: Übersichtskarte im Vollbildmodus für bessere Navigation in großen Organigrammen (zeigt alle Positionen hierarchisch mit Farbcodierung)
- [x] Tastaturnavigation: Pfeiltasten zum Navigieren zwischen Positionen im Vollbildmodus (↑↓←→ + Enter/Esc, mit Hilfe-Panel)

## Touch-Gesten für Organigramm-Navigation (Januar 2026)
- [x] Swipe-Gesten für Navigation zwischen Positionen auf Mobilgeräten (im Vollbildmodus mit fokussierter Position)
- [x] Swipe links/rechts für Geschwister-Navigation
- [x] Swipe hoch/runter für Eltern/Kind-Navigation
- [x] Visuelles Feedback bei Swipe-Gesten (Position wird zentriert und fokussiert)

## UI-Konsolidierung (Januar 2026)
- [x] Wiki und SOPs zu einem Bereich "Wissensdatenbank" zusammenfassen (Tabs für Wiki/SOPs)
- [x] Suche und AI-Assistent zu einem Feature zusammenfassen (SearchAssistant-Seite mit Tabs)
- [x] Onboarding als eigenständigen Nav-Punkt (nicht mehr unter Wiki)
- [x] Prozessbeschreibung-Template mit echtem Inhalt füllen (Urlaubsantrag-Beispiel)
- [x] Benachrichtigungen klickbar machen - Navigation zum jeweiligen Inhalt (Leave, Wiki, Onboarding)
- [x] Urlaubsverwaltung Mobile-Design verbessern (Mobile-first Layout mit Flex-Buttons)

## Folge-Features (Januar 2026)
- [x] Wissensdatenbank-Suche: Suchfeld innerhalb der Wissensdatenbank für Wiki und SOPs (mit Treffer-Anzeige)
- [x] Benachrichtigungs-Badge: Ungelesene Benachrichtigungen als Badge auf dem Glocken-Icon (Desktop + Mobile)
- [x] Urlaubskalender-Integration: Genehmigte Urlaube automatisch im Kalender als ganztägige Events anzeigen (bereits implementiert)

## Navigation Vereinfachung (Januar 2026)
- [x] Home-Seite: Wiki+SOPs Karten zu einer "Wissensdatenbank" Karte zusammenfassen
- [x] Home-Seite: Suche+AI-Assistent zu "AI Suche" umbenennen
- [x] Navigation: Fokussierte Navigation mit "Mehr"-Menü für zusätzliche Punkte
- [x] Sidebar und Mobile-Navigation entsprechend anpassen (Home, AI Suche, Wissensdatenbank, Kalender, Team + Mehr)

## AI-Suchfeld auf Home-Seite (Januar 2026)
- [x] Prominentes AI-Suchfeld direkt auf der Home-Seite für schnellen Zugriff (mit Gradient-Design und Tastatur-Hinweis)

## Navigation & Dashboard Umstrukturierung (Januar 2026)
- [x] Navigation: AI Suche, How to Work, Taps (mit @-Erwähnungen), Kalender, Einsatzplan POS, Team (Organigramm), Urlaub
- [x] Wissensdatenbank umbenennen zu "How to Work"
- [x] Taps-Seite: @-Erwähnungen als Tab integriert (Chats/Erwähnungen)
- [x] Dashboard: Nur Willkommen-Banner mit AI-Suche und angepinnte Ankündigungen (weitere Widgets über Einstellungen aktivierbar)

## Schnellaktions-Buttons (Januar 2026)
- [x] Schnellaktions-Buttons unter AI-Suchfeld: "Urlaub beantragen" (grün) und "Neues Tap erstellen" (blau)

## UI-Bereinigung (Januar 2026)
- [x] "Neuer Artikel"-Button aus Willkommens-Banner entfernen
- [x] "Neues Tap erstellen" umbenennen in "Chat"

## Mobile-Layout & Schnellaktionen (Januar 2026)
- [x] Mobile-Layout des Willkommens-Banners korrigieren (Suchfeld bündig, responsive Padding)
- [x] Kalender-Termin erstellen als Schnellaktion hinzufügen (orange Button)
- [x] Personalisierte Begrüßung (Guten Morgen/Tag/Abend basierend auf Uhrzeit)
- [x] Mobile-Layout komplett geprüft und optimiert

## Bugfix (Januar 2026)
- [x] Kalender-Dialog: DialogTitle für Accessibility hinzufügen (VisuallyHidden)

## Visuelle Qualität auf Basecamp/Monday/Asana-Niveau (Januar 2026)

### Micro-Interactions & Animationen
- [ ] Sanfte Hover-Transitions für alle interaktiven Elemente
- [ ] Skeleton-Loading für Daten statt Spinner
- [ ] Smooth Page Transitions
- [ ] Subtle Feedback-Animationen bei Aktionen (Buttons, Toggles)

### Typografie & Spacing
- [ ] Größere, mutigere Headlines
- [ ] Mehr Whitespace zwischen Elementen
- [ ] Konsistentere vertikale Rhythmen
- [ ] Optimierte Zeilenhöhen für bessere Lesbarkeit

### Navigation & Orientierung
- [ ] Breadcrumbs für tiefe Seiten
- [ ] Spotlight-Stil Suche verbessern
- [ ] Kontextuelle Aktionen

### Empty States & Onboarding
- [ ] Illustrationen für leere Zustände
- [ ] Bessere Tooltips für neue Features
- [ ] Fortschrittsanzeigen

### Visuelle Hierarchie
- [ ] Subtile Schatten und Tiefe
- [ ] Farbige Akzente strategischer einsetzen
- [ ] Bessere Trennung von Bereichen

## Visuelle Qualität - Basecamp/Monday/Asana Level (Januar 2026)
- [x] Micro-Interactions: Hover-Effekte, sanfte Transitions, Feedback-Animationen
- [x] Typografie: Größere Headlines, mehr Whitespace, bessere Lesbarkeit
- [x] Navigation: Breadcrumbs im Desktop-Header
- [x] Empty States: Wiederverwendbare EmptyState-Komponente mit Presets
- [x] Visuelle Hierarchie: Section Dividers, Card Grid, Glass Effect, Status Indicators


## Aufgaben-System (Januar 2026)
- [x] Datenbank-Schema für Aufgaben (tasks) mit Zuweisung
- [x] Backend-API für Aufgaben (CRUD, Zuweisung)
- [x] Schnellaktion "+ Aufgabe" auf Home-Seite
- [x] Aufgaben-Seite mit Tabs (Alle, Mir zugewiesen, Von mir erstellt)
- [x] Aufgaben erstellen mit Titel, Beschreibung, Priorität, Fälligkeitsdatum
- [x] Aufgaben an Teammitglieder zuweisen
- [x] Aufgaben-Status ändern (Offen, In Bearbeitung, Erledigt, Abgebrochen)
- [x] Aufgaben löschen
- [x] Benachrichtigung bei Aufgabenzuweisung
- [x] Unit-Tests für Aufgaben-Modul


## Aufgaben-System Erweiterungen Phase 2 (Januar 2026)
- [ ] Datenbank-Schema für Aufgaben-Kommentare (task_comments)
- [ ] Datenbank-Schema für wiederkehrende Aufgaben (recurrence_pattern in tasks)
- [ ] Backend-API für Kommentare (CRUD)
- [ ] Backend-API für wiederkehrende Aufgaben
- [ ] Kommentar-UI auf der Aufgaben-Seite
- [ ] Wiederkehrende Aufgaben-UI (täglich, wöchentlich, monatlich)
- [ ] Erweiterte Filter (Priorität, Status, Fälligkeitsdatum)


## Aufgaben-System Erweiterungen Phase 2 (Januar 2026)
- [x] Aufgaben-Kommentare (Kommentarfunktion für Diskussionen)
- [x] Wiederkehrende Aufgaben (täglich, wöchentlich, monatlich)
- [x] Erweiterte Filter (Priorität und Status kombiniert)
- [x] Kommentar-Dialog mit Benutzer-Avatar und Zeitstempel
- [x] Wiederholungs-Optionen im Aufgaben-Erstellungsdialog
- [x] Wiederholungs-Badge auf Aufgaben-Karten
- [x] Kommentar-Button auf Aufgaben-Karten
- [x] Benachrichtigungen bei neuen Kommentaren


## Aufgaben-Erinnerungen (Januar 2026)
- [ ] Datenbank-Schema für Erinnerungseinstellungen (reminderDays-Feld in tasks)
- [ ] Backend-API für Erinnerungen (Cron-Job für tägliche Prüfung)
- [ ] E-Mail-Benachrichtigung bei bevorstehenden Aufgaben
- [ ] In-App-Benachrichtigung bei bevorstehenden Aufgaben
- [ ] Erinnerungs-Dropdown im Aufgaben-Erstellungsdialog
- [ ] Tests für Erinnerungsfunktion


## Einsatzplan-Integration (Januar 2026)
- [ ] Einsatzplan POS aus der Sidebar entfernen
- [ ] Einsatzplan in den Kalender integrieren
- [ ] Einsatzplan nur für POS- und Versand-Teams sichtbar machen


## Kalender-Verbesserungen (Januar 2026)
- [ ] Sidebar-Bug beheben (vollständiges Ausblenden wenn eingeklappt)
- [ ] Mehrtägige Termine optisch zusammenhängend darstellen (durchgehender Balken)
- [ ] Circle Event Funktion reparieren
- [ ] POS und Versand Teams erstellen
- [ ] Schichtplan-Ansicht für Teammitglieder implementieren
- [ ] Schicht-Benachrichtigungen per E-Mail implementieren


## Team-Mitgliedschaft (Januar 2026)
- [x] Datenbank-Schema für Team-Mitgliedschaft prüfen/erstellen
- [x] Backend-API für Team-Mitgliedschaft (hinzufügen, entfernen, auflisten)
- [x] UI für Team-Mitgliedschaft in Team-Verwaltung
- [x] Mitarbeiter den POS/Versand Teams zuordnen können


## Schicht-System Erweiterungen (Januar 2026)
- [x] Datenbank-Schema für Schicht-Vorlagen (shiftTemplates)
- [x] Datenbank-Schema für Schicht-Tausch (shiftSwapRequests)
- [x] Backend-API für Schicht-Vorlagen (CRUD)
- [x] Backend-API für Schicht-Tausch (Anfrage, Genehmigung, Ablehnung)
- [x] Schicht-Vorlagen UI im Kalender
- [x] Schicht-Tausch UI mit Genehmigungsworkflow
- [x] Team-Statistiken Dashboard-Widget (Teamgröße, aktive Schichten, Auslastung)


## Schicht-Auswertungen (Januar 2026)
- [x] Backend-API für Schicht-Auswertungen (Stunden pro Mitarbeiter/Monat)
- [x] Schicht-Auswertungen Seite mit monatlicher Übersicht
- [x] Export-Funktion für Auswertungen (CSV)
- [x] Navigation zur Schicht-Auswertungen Seite


## Schicht-Benachrichtigungen (Januar 2026)
- [x] E-Mail-Benachrichtigung bei Schichtzuweisung
- [x] E-Mail-Benachrichtigung bei Schichtänderung
- [x] E-Mail-Benachrichtigung bei Schichtstornierung
- [x] E-Mail-Benachrichtigung bei Schicht-Tausch-Anfragen
- [x] E-Mail-Einstellungen für Schicht-Benachrichtigungen in Benutzereinstellungen


## Überstunden-Tracking (Januar 2026)
- [x] Datenbank-Schema für Soll-Arbeitsstunden pro Mitarbeiter
- [x] Datenbank-Schema für Überstunden-Salden
- [x] Backend-API für Soll-Stunden (CRUD)
- [x] Backend-API für Überstunden (Berechnung, Historie, Genehmigung)
- [x] Überstunden-Berechnung (Ist - Soll) mit Übertrag
- [x] Admin-UI für Soll-Stunden-Verwaltung
- [x] Admin-UI für Überstunden-Tracking mit Genehmigungsworkflow
- [x] CSV-Export für Überstunden-Daten


## UI-Anpassungen (Januar 2026)
- [x] Statistik-Karten (Artikel, SOPs, Kategorien, Benutzer) von Startseite entfernen
- [x] Aktivitäten-Widget von Startseite entfernen


## Dashboard-Verbesserungen (Januar 2026)
- [x] Persönliches Überstunden-Widget auf Dashboard
- [x] Anpassbare Schnellzugriff-Buttons (dynamisch aus Einstellungen)
- [x] Personalisierter Begrüßungstext (Tageszeit, Wochentag, Rolle)


## Aufgaben-Verbesserungen (Januar 2026)
- [x] Uhrzeitauswahl bei Aufgabenerstellung hinzufügen
- [x] Aufgaben nachträglich bearbeiten können (Titel, Beschreibung, Datum, Uhrzeit, Priorität, Zuweisung)


## Mobile UI Fixes (Januar 2026)
- [x] Sidebar nach Klick auf Menüpunkt automatisch schließen (Mobile)
- [x] Pull-to-Refresh auf mobilen Geräten (bereits implementiert)
- [x] Bottom Navigation Bar für schnellen Zugriff
- [x] Swipe-Gesten zum Öffnen/Schließen der Sidebar


## Mobile Erweiterungen (Januar 2026)
- [x] Haptic Feedback bei Interaktionen (Vibration bei Navigation, Swipe-Gesten)
- [x] Push-Benachrichtigungen (Browser Push Notifications, bereits implementiert)


## Bug Fixes (Januar 2026)
- [x] Bottom Navigation: Suche und Kalender Pfade korrigieren (404 Fehler)
- [x] Bottom Navigation: Ändern zu AI Suche, Taps, Aufgaben
- [x] Aufgaben-Details: Layout bündig ausrichten (flex-wrap)


## Bottom Navigation Erweiterungen (Januar 2026)
- [x] Badge für ungelesene Taps-Nachrichten auf Icon anzeigen
- [x] Badge für offene/überfällige Aufgaben auf Aufgaben-Icon
- [x] Benachrichtigungs-Badge im Desktop-Header (Summe aus Benachrichtigungen, Taps, Aufgaben)
- [x] Sound-Benachrichtigungen (optional, in Einstellungen aktivierbar mit Lautstärkeregler)


## Benachrichtigungs-Erweiterungen (Januar 2026)
- [x] Benachrichtigungs-Zentrale: Unified Dropdown mit allen Benachrichtigungen (Taps, Aufgaben, System)
- [x] Aufgaben-Erinnerungen: Automatische Erinnerung vor Fälligkeit (bereits implementiert mit reminderDays)
- [x] Schnellaktionen per Wisch: In Aufgabenliste durch Wischen erledigen (rechts) / verschieben (links)


## Aufgaben-UI Verbesserungen (Januar 2026)
- [x] Layout-Fix: "Fällig am" Feld wird abgeschnitten im Dialog
- [x] Layout-Fix: Tabs "Mir zugewiesen" / "Von mir erstellt" überlappen
- [x] Layout-Fix: "Alle Prioritäten" Filter wird abgeschnitten
- [x] Flexible Erinnerungen: Minuten, Stunden oder Tage frei wählbar (nicht nur Tage)


## Aufgaben-Erweiterungen (Januar 2026)
- [x] Erinnerungs-Schnellauswahl: Buttons für häufige Zeiten (15 Min, 1 Std, 1 Tag)
- [x] Mehrere Erinnerungen pro Aufgabe: Datenbank-Schema für task_reminders Tabelle
- [x] Mehrere Erinnerungen pro Aufgabe: Backend-API für CRUD
- [x] Mehrere Erinnerungen pro Aufgabe: Frontend-UI mit Hinzufügen/Entfernen
- [x] Kalender-Integration: Aufgaben mit Fälligkeit im Kalender anzeigen
- [x] Kalender-Integration: Aufgaben-Badge/Markierung an Tagen mit Aufgaben

## Aufgaben-Erweiterungen Teil 2 (Januar 2026)
- [x] Push-Benachrichtigungen: Browser Notification API Hook
- [x] Push-Benachrichtigungen: Berechtigungsabfrage im Frontend (Banner)
- [x] Push-Benachrichtigungen: Erinnerungen als Browser-Notifications anzeigen
- [x] Kalender: Toggle zum Ein-/Ausblenden von Aufgaben
- [x] Kalender: Drag & Drop für Aufgaben zum Verschieben der Fälligkeit
- [x] Kalender: Aufgaben-Fälligkeit per Drag & Drop ändern

## PWA-Layout-Fix (Januar 2026)
- [x] Safe-Area-Insets für PWA-Modus: Header wird oben abgeschnitten
- [x] Viewport-Meta-Tag für iOS PWA anpassen

## PWA Splash-Screen (Januar 2026)
- [x] Animierte Splash-Screen Komponente erstellen
- [x] Logo-Animation mit Fade-In und Scale-Effekt
- [x] Splash-Screen beim App-Start anzeigen
- [x] Automatisches Ausblenden nach Ladezeit

## Pull-to-Refresh Verbesserungen (Januar 2026)
- [x] Schnellere Aktualisierung (kürzere Animation)
- [x] Nach Aktualisierung automatisch nach oben scrollen

## Layout-Fix Bottom Navigation (Januar 2026)
- [x] Bottom Navigation überlappt Inhalt - mehr Padding unten (pb-24 → pb-32)

## Haptic Feedback Optimierung (Januar 2026)
- [x] Haptic Feedback Hook erweitern (mehr Feedback-Typen: impact, notification, rigid, soft)
- [x] Haptic bei Navigation und Tab-Wechsel (BottomNavigation)
- [x] Haptic bei Button-Klicks (Button-Komponente mit haptic prop)
- [x] Haptic bei Erfolgs- und Fehlermeldungen (hapticToast Wrapper)
- [x] iOS Taptic Engine Unterstützung hinzugefügt

## Layout-Fix Bottom Navigation Teil 2 (Januar 2026)
- [x] Bottom Navigation überlappt Inhalt noch - pb-32 auf pb-40 erhöht (10rem)

## Layout-Fix Home-Seite (Januar 2026)
- [x] Home-Seite: pb-24 zum Mobile-Container hinzugefügt

## Layout-Fix Alle Seiten (Januar 2026)
- [x] Alle Seiten auf Überlappungsprobleme mit Bottom Navigation prüfen und beheben
- [x] pb-24 md:pb-6 zu allen Seiten hinzugefügt: Calendar, Wiki, Aufgaben, Chat, Leave, Notifications, Onboarding, OrgChart, Profile, SOPCategory, SOPEditor, SOPView, SOPs, Search, SearchAssistant, TeamDirectory, Teams, WikiArticle, WikiCategory, WikiEditor

## Swipe-Navigation (Januar 2026)
- [x] Swipe-Navigation Hook erstellen (useSwipeNavigation)
- [x] Swipe-Gesten für Links/Rechts Navigation
- [x] Visuelle Feedback-Animation beim Swipen
- [x] Integration in die Hauptseiten (DashboardLayout)

## Layout-Fix Home-Seite Teil 2 (Januar 2026)
- [x] Home-Seite: pb-24 auf pb-40 erhöht (10rem)

## Layout-Fix Bottom Navigation Teil 3 (Januar 2026)
- [x] Schwarzer Bereich zwischen Inhalt und Bottom Navigation entfernen
- [x] Padding auf pb-20 (5rem) reduziert - ausreichend für Bottom Navigation

## Dynamisches Bottom-Padding (Januar 2026)
- [x] Hook für dynamisches Bottom-Padding erstellen (useBottomNavHeight)
- [x] CSS-Variable für Bottom Navigation Höhe setzen (--bottom-nav-height)
- [x] Alle Seiten auf dynamisches Padding umgestellt (pb-[calc(var(--bottom-nav-height,64px)+1rem)])

## Layout-Fix Weißer Bereich (Januar 2026)
- [x] Weißer Bereich zwischen Inhalt und Bottom Navigation entfernen
- [x] Hintergrundfarbe konsistent machen (bg-background auf main und Container)

## Layout-Fix Mobile (Januar 2026) - Endgültig
- [x] Weißer/heller Bereich zwischen Inhalt und Bottom Navigation auf Mobile beheben
- [x] Roter Streifen rechts auf Mobile-Ansicht entfernen

## Layout-Fix Mobile (Januar 2026) - Neuer Ansatz
- [x] Weißer/heller Bereich zwischen Inhalt und Bottom Navigation endgültig beheben
- [x] Roter Streifen rechts endgültig entfernen

## Optimierungen (Januar 2026)
- [x] Cache-Handling und Service Worker verbessern für automatisches Cache-Busting
- [x] Dark Mode Layout-Fixes überprüfen und optimieren
- [x] Layout-Fixes auf alle anderen Seiten anwenden (nicht nur Home)

## Layout-Fixes auf alle Seiten (Januar 2026)
- [x] Taps-Seite Layout-Fix (keine problematischen Elemente gefunden)
- [x] Aufgaben-Seite Layout-Fix (keine problematischen Elemente gefunden)
- [x] Search-Seite Layout-Fix (SearchAssistant.tsx dekoratives Element verkleinert)
- [x] Leave-Seite Layout-Fix (keine problematischen Elemente gefunden)
- [x] Notifications-Seite Layout-Fix (keine problematischen Elemente gefunden)
- [x] OrgChart-Seite Layout-Fix (keine problematischen Elemente gefunden)
- [x] Profile-Seite Layout-Fix (keine problematischen Elemente gefunden)
- [x] SOPs-Seite Layout-Fix (dekoratives Element verkleinert)
- [x] Alle anderen Seiten geprüft - keine weiteren problematischen Elemente

## Layout-Probleme Mobile - Nachhaltige Behebung (Januar 2026)
- [x] Rosa/roter Streifen links und rechts auf AI Suche und Taps-Seite
- [x] Weißer/heller Bereich zwischen Inhalt und Bottom Navigation
- [x] Rosa Bereich rechts unten neben "Mehr"-Button
- [x] Grundlegende Layout-Überarbeitung für alle Mobile-Seiten

## Layout-Probleme Mobile - Finale Behebung (Januar 2026)
- [x] Exakte Ursache der rosa/roten Streifen identifizieren (SwipeNavigationWrapper Edge-Indikatoren)
- [x] Problematische Elemente direkt in den Komponenten entfernen
- [x] Alle dekorativen Gradient-Elemente auf Mobile deaktivieren (Home, Wiki, SOPs, SearchAssistant)

## Layout-Fix Taps-Seite (Januar 2026)
- [x] Weißer/heller Bereich zwischen Inhalt und Bottom Navigation auf Taps-Seite beheben

## Layout-Fix Bottom Navigation (Januar 2026)
- [x] Roter Streifen unten rechts neben dem Mehr-Button beheben (blur-Effekt vom Plus-Button entfernt)

## Layout-Fix Home-Seite Hintergrund (Januar 2026)
- [x] Weißer/heller Bereich zwischen Inhalt und Bottom Navigation auf Home-Seite beheben (pb-48 und bottom-nav-height auf 76px erhöht)

## Layout-Fix Weißer Bereich - Radikaler Ansatz (Januar 2026)
- [x] Weißer Bereich zwischen Inhalt und Bottom Navigation endgültig beheben (html::before Overlay hinzugefügt)
- [x] Alle Container mit gleichem Hintergrund versehen (radikale CSS-Fixes in index.css)

## Layout-Fix - Inline-Styles Ansatz (Januar 2026)
- [x] Festes Hintergrund-Element direkt im HTML-Body hinzugefügt (div#bg-fix)
- [x] Inline-Styles für sofortige Anwendung verwendet
- [x] JavaScript für Dark Mode Hintergrund-Synchronisation hinzugefügt

## Layout-Fix - Scroll-Overflow-Problem (Januar 2026)
- [x] Inhalt scrollt zu weit und wird unter der Bottom Navigation sichtbar
- [x] Scroll-Container mit korrektem Padding-Bottom versehen (pb-[120px])
- [x] Bottom Navigation mit solidem Hintergrund ohne Transparenz

## Layout-Fix - Dark Mode Hintergrund (Januar 2026)
- [x] Heller/grauer Streifen oben auf der Taps-Seite im Dark Mode beheben (Gradient-Hintergrund entfernt)

## Layout-Fix - Bündigkeit und Menüleiste (Januar 2026)
- [x] Inhalt oben links nicht bündig mit dem Rand (-m-6 entfernt)
- [x] Elemente hinter der Menüleiste sichtbar (Hintergrund-Overlay hinzugefügt)

## Layout-Fix - Elemente unter Bottom Navigation (Januar 2026)
- [x] Elemente links und rechts unter dem unteren Menü sichtbar auf allen Seiten
- [x] Rotes/rosa Element links unten hinter der Bottom Navigation sichtbar (Screenshot zeigt Home-Icon mit rotem Hintergrund)
