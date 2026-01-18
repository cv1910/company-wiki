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
- [ ] Diff-Ansicht zwischen Versionen

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
- [ ] Suchvorschläge

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
