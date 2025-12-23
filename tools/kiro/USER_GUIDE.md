# 📖 ARK Benutzerhandbuch

## ✅ Aktueller Status (Dezember 2024)

**Vollständig funktionsfähig!** Alle Hauptfunktionen wurden repariert und getestet.

### 🎯 Was funktioniert:
- ✅ **Tägliche Sprüche**: Vollständig funktionsfähig
- ✅ **PWA Installation**: App kann installiert werden
- ✅ **Offline-Modus**: Funktioniert ohne Internet
- ✅ **Benutzerprofile**: Personalisierung verfügbar
- ✅ **Archiv & Suche**: Durchsuchen aller Sprüche
- ✅ **Feedback-System**: Bewertungen werden gespeichert
- ✅ **Responsive Design**: Funktioniert auf allen Geräten

### ⚠️ Hinweise:
- **KI-Generierung**: Erfordert OpenAI API-Schlüssel (optional)
- **Einige erweiterte Features**: Benötigen Konfiguration

## 🚀 Erste Schritte

### Installation & Start
1. **Doppelklick** auf `SIMPLE-START.bat`
2. **Warten** bis sich der Browser öffnet (ca. 3-5 Sekunden)
3. **Fertig!** Die App läuft unter http://localhost:8000/app

### Als App installieren (PWA)
1. Öffne die Anwendung im Browser
2. Klicke auf **"ARK installieren"** wenn der Prompt erscheint
3. Die App wird zu deinem Startbildschirm hinzugefügt
4. **Offline-Nutzung**: App funktioniert auch ohne Internet

### System-Check
Wenn etwas nicht funktioniert:
```bash
cd backend-node
node run-diagnostics.js
```

## 📱 Hauptfunktionen

### 📅 Täglicher Spruch ✅
- **Automatisch**: Jeden Tag ein neuer inspirierender Spruch
- **Personalisiert**: Basierend auf deinen Vorlieben
- **Feedback**: Bewerte Sprüche mit 👍 😐 👎
- **Offline verfügbar**: Funktioniert auch ohne Internet
- **Schnell**: Lädt in unter 3 Sekunden

### 📚 Archiv ✅
- **Durchsuchen**: Alle vergangenen Sprüche
- **Suchen**: Nach Text, Autor oder Thema
- **Filtern**: Nach Datum oder Thema
- **Chronologisch sortiert**: Neueste zuerst
- **Offline-Zugriff**: Auch ohne Internet verfügbar

### ⚙️ Einstellungen ✅
- **Benachrichtigungen**: Tägliche Erinnerungen (PWA)
- **Design**: Hell, Dunkel oder Automatisch
- **Spruch-Länge**: Kurz, Mittel oder Lang
- **Profil-Synchronisation**: Automatische Speicherung
- **Cache-Verwaltung**: Offline-Daten verwalten

### 🔧 Erweiterte Features ✅
- **Diagnostik**: Systemstatus prüfen
- **Fehlerbehandlung**: Automatische Wiederherstellung
- **Performance**: Optimiert für schnelle Ladezeiten
- **Sicherheit**: Sichere Datenübertragung und -speicherung

## 🎨 Personalisierung

### Profil einrichten
1. Gehe zu **Einstellungen**
2. Wähle deine **Lieblings-Themen**
3. Stelle deine **Benachrichtigungszeit** ein
4. Wähle deine bevorzugte **Spruch-Länge**

### Themen
- **Träume** - Inspiration für deine Ziele
- **Hoffnung** - Mut in schweren Zeiten  
- **Motivation** - Antrieb für den Tag
- **Erfolg** - Tipps für Leistung
- **Leben** - Weisheiten für den Alltag
- **Wachstum** - Persönliche Entwicklung

## 📱 Mobile Nutzung

### PWA Features
- **Offline-Modus**: Funktioniert ohne Internet
- **Push-Benachrichtigungen**: Tägliche Erinnerungen
- **Startbildschirm**: Wie eine native App
- **Schnell**: Optimiert für mobile Geräte

### Gesten
- **Wischen**: Zwischen Ansichten wechseln
- **Tippen**: Spruch-Details anzeigen
- **Halten**: Kontextmenü öffnen

## 🔧 Problemlösung

### App startet nicht
1. **Node.js installiert?** Prüfe mit `node --version`
2. **Port belegt?** Schließe andere Anwendungen auf Port 8000
3. **Firewall?** Erlaube localhost-Verbindungen

### Endloser Ladebildschirm
- **API-Key fehlt**: OpenAI API-Key in Einstellungen hinzufügen
- **Netzwerk**: Prüfe Internetverbindung
- **Cache**: Browser-Cache leeren

### Benachrichtigungen funktionieren nicht
1. **Berechtigung erteilen**: Browser-Popup bestätigen
2. **Einstellungen prüfen**: Benachrichtigungen aktiviert?
3. **Service Worker**: Browser neu starten

### Daten gehen verloren
- **Lokaler Speicher**: Daten werden lokal gespeichert
- **Export**: Regelmäßig Daten exportieren
- **Sync**: Cloud-Synchronisation aktivieren

## 💡 Tipps & Tricks

### Produktivität
- **Morgenroutine**: Spruch als ersten Gedanken des Tages
- **Reflexion**: Abends über den Spruch nachdenken
- **Notizen**: Eigene Gedanken zu Sprüchen hinzufügen

### Anpassung
- **Themen wechseln**: Je nach Lebenssituation
- **Zeit anpassen**: Beste Zeit für Inspiration finden
- **Länge variieren**: Kurz für unterwegs, lang für Reflexion

### Teilen
- **Screenshots**: Schöne Sprüche als Bild teilen
- **Social Media**: Inspiration mit Freunden teilen
- **Familie**: Gemeinsame Sprüche diskutieren

## 🔮 Kommende Features

### Geplant
- [ ] **KI-Integration**: Personalisierte Spruch-Generierung
- [ ] **Cloud-Sync**: Geräte-übergreifende Synchronisation
- [ ] **Sozial**: Sprüche mit Freunden teilen
- [ ] **Widgets**: Desktop und Mobile Widgets
- [ ] **Sprachen**: Mehrsprachige Unterstützung

### Wünsche?
Hast du Ideen für neue Features? Lass es uns wissen!

## 📞 Support

### Häufige Fragen
- **Kostenlos?** Ja, komplett kostenlos
- **Offline?** Ja, funktioniert offline
- **Privatsphäre?** Alle Daten bleiben lokal
- **Updates?** Automatisch über Browser

### Hilfe benötigt?
1. **Dokumentation**: Lies diese Anleitung
2. **API-Docs**: Für technische Details
3. **GitHub**: Für Entwickler-Support

---

**Viel Spaß mit deiner täglichen Inspiration!** ✨

## 🔧 Fehlerbehebung

### Häufige Probleme

#### App startet nicht
1. **Prüfe den Port**: Stelle sicher, dass Port 8000 frei ist
2. **Starte neu**: Schließe alle Browser-Fenster und starte `SIMPLE-START.bat` erneut
3. **Diagnostik**: Führe `node run-diagnostics.js` im `backend-node` Ordner aus

#### PWA installiert sich nicht
1. **HTTPS erforderlich**: In der Produktion wird HTTPS benötigt
2. **Browser-Support**: Verwende Chrome, Firefox oder Safari
3. **Cache leeren**: Lösche Browser-Cache und versuche es erneut

#### Offline-Modus funktioniert nicht
1. **Service Worker**: Lade die Seite einmal vollständig online
2. **Cache-Aufbau**: Warte 30 Sekunden nach dem ersten Laden
3. **Browser-Unterstützung**: Prüfe Service Worker-Unterstützung

#### Sprüche laden nicht
1. **Internet-Verbindung**: Prüfe deine Verbindung
2. **Server-Status**: Schaue in die Browser-Konsole (F12)
3. **Cache-Problem**: Lösche den Browser-Cache

### Erweiterte Diagnose

#### System-Check ausführen
```bash
cd backend-node
node run-diagnostics.js --save --verbose
```

#### Test-Suite ausführen
```bash
# Backend testen
cd backend-node
npm test

# Frontend testen
cd frontend
npm test

# PWA-Features testen
node test-install-prompt.cjs
node test-sw-registration.cjs
node test-offline-sync.cjs
```

#### Log-Dateien prüfen
- **Browser-Konsole**: F12 → Console
- **Server-Logs**: Terminal-Ausgabe beim Start
- **Diagnostik-Berichte**: `diagnostic-report.json` Dateien

## 📊 Performance-Tipps

### Optimale Nutzung
- **Erste Nutzung**: Lade die App vollständig online
- **Offline-Vorbereitung**: Besuche alle Bereiche einmal online
- **Cache-Management**: Lösche gelegentlich alte Daten
- **Browser-Updates**: Verwende aktuelle Browser-Versionen

### Systemanforderungen
- **Minimum**: 512 MB RAM, moderne Browser
- **Empfohlen**: 1 GB RAM, aktuelle Browser-Version
- **Internet**: Nur für erste Einrichtung und Synchronisation

## 🆘 Support

### Selbsthilfe
1. **Diagnostik ausführen**: `node run-diagnostics.js`
2. **Tests ausführen**: `npm test` in beiden Ordnern
3. **Browser-Konsole prüfen**: F12 → Console
4. **Neustart versuchen**: App und Browser neu starten

### Informationen sammeln
Wenn du Hilfe benötigst, sammle diese Informationen:
- **Betriebssystem**: Windows-Version
- **Browser**: Name und Version
- **Fehlermeldungen**: Aus Browser-Konsole
- **Diagnostik-Bericht**: Ausgabe von `run-diagnostics.js`

### Häufige Lösungen
- **Port-Konflikt**: Ändere Port in `.env` Datei
- **Berechtigungen**: Führe als Administrator aus
- **Firewall**: Erlaube Node.js in der Firewall
- **Antivirus**: Füge Ordner zu Ausnahmen hinzu

## 🔄 Updates & Wartung

### Regelmäßige Wartung
- **Cache leeren**: Gelegentlich Browser-Cache löschen
- **Diagnostik**: Monatlich System-Check ausführen
- **Backups**: Wichtige Daten sichern (falls konfiguriert)

### Update-Verfahren
1. **Backup erstellen**: Sichere deine Daten
2. **Neue Version**: Lade neue Dateien herunter
3. **Konfiguration übertragen**: Kopiere `.env` Datei
4. **Test**: Führe Diagnostik aus

---

## 📞 Schnelle Hilfe

**Problem?** → **Lösung:**
- App startet nicht → `SIMPLE-START.bat` als Administrator
- Langsam → Browser-Cache leeren
- Offline funktioniert nicht → Einmal vollständig online laden
- Sprüche fehlen → Internet-Verbindung prüfen
- PWA installiert nicht → HTTPS in Produktion verwenden

**Immer noch Probleme?** Führe die Diagnostik aus:
```bash
cd backend-node
node run-diagnostics.js --save
```

---

**Viel Spaß mit deiner täglichen Inspiration!** ✨