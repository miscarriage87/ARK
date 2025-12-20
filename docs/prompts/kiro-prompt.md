# Prompt für KIRO (lokales Tool)

## 🎯 Copy-Paste Prompt für KIRO

```markdown
# ARK Repository - KIRO Multi-Agent Workflow

Du arbeitest jetzt am ARK Repository mit einem strukturierten Multi-Agent-Workflow. Das Repository ist bereits lokal gecloned und bereit.

## Repository-Status
- **Lokaler Pfad**: [Aktueller Workspace]
- **Dein Arbeitsbereich**: `/tools/kiro/`
- **Branch-Pattern**: `tool/kiro/<topic>`

## Die 3 goldenen Regeln (NICHT VERHANDELBAR)
1. **Branch**: Arbeite nur im Branch `tool/kiro/<topic>`
2. **Dateien**: Ändere nur Dateien in `/tools/kiro/`
3. **Merge**: Erstelle PR nach `main` (kein direkter Push)

## Vollständige Regeln
Die kompletten Regeln findest du in: `agents.md` (im Repository-Root)

## Dein KIRO-Workflow
1. **Aktuellen Stand holen**: 
   ```bash
   git fetch --all
   git checkout main
   git pull origin main
   ```

2. **Neuen Branch erstellen**:
   ```bash
   git checkout -b tool/kiro/<topic>
   ```
   Beispiel: `git checkout -b tool/kiro/initial-setup`

3. **In deinem Ordner arbeiten**:
   - Wechsle zu `/tools/kiro/`
   - Erstelle/bearbeite nur Dateien in diesem Ordner

4. **Änderungen committen**:
   ```bash
   git add tools/kiro/
   git commit -m "tool(kiro): <beschreibung>"
   ```

5. **Branch pushen**:
   ```bash
   git push origin tool/kiro/<topic>
   ```

6. **PR erstellen**: 
   - Via GitHub UI: https://github.com/miscarriage87/ARK/pulls
   - Base: `main` ← Compare: `tool/kiro/<topic>`

## Commit-Format
```
tool(kiro): <kurze beschreibung>
```

Beispiele:
- `tool(kiro): setup development environment`
- `tool(kiro): add webpack configuration`
- `tool(kiro): create project templates`

## Empfohlene Ordnerstruktur für `/tools/kiro/`
```
tools/kiro/
├── README.md              # Deine Tool-Dokumentation
├── config/                # KIRO-spezifische Konfigurationen
├── scripts/               # Automatisierungsscripts
├── templates/             # Code-Templates
├── workflows/             # KIRO-Workflows
└── docs/                  # KIRO-interne Dokumentation
```

## Wichtige Einschränkungen
❌ **NICHT erlaubt**:
- Direkter Push nach `main`
- Änderungen in `/core/`, `/docs/` oder anderen Tool-Ordnern (`/tools/chatgpt/`, `/tools/antigravity/`, etc.)
- Arbeiten außerhalb von `/tools/kiro/`

✅ **Erlaubt**:
- Alles in `/tools/kiro/`
- Mehrere kleine PRs statt einem großen
- Eigene Dokumentation und Konfiguration

## Projektkontext
Das ARK Projekt ist ein **digitaler Abreißkalender** als Web-Anwendung mit:
- Täglichen KI-generierten Sprüchen
- Personalisierung basierend auf Nutzer-Profilen  
- Thematischer Strukturierung (Wochen-/Monatsthemen)
- Mobile-optimierter Bedienung
- Archiv-Funktion für vergangene Sprüche

**Vollständiges Konzept**: `core/project-concept.md`

## Typische KIRO-Aufgaben im ARK Projekt
1. **Projekt-Setup**: Entwicklungsumgebung konfigurieren
2. **Code-Generierung**: Templates für Komponenten erstellen
3. **Build-System**: Webpack, Vite oder ähnliche Tools konfigurieren
4. **Automatisierung**: Scripts für Development und Deployment
5. **Integration**: Verschiedene Tool-Outputs zusammenführen
6. **Code-Review**: Andere Tool-Beiträge reviewen und optimieren

## KIRO-Vorteile
- **Direkter Dateizugriff**: Du siehst alle Änderungen in Echtzeit
- **Integrierte Git-Features**: Nutze deine eingebauten Git-Tools
- **Live-Synchronisation**: Sofortige Sicht auf andere Tool-Änderungen
- **Lokale Entwicklung**: Direktes Testen und Debugging möglich

## Deine spezifische Aufgabe
[HIER DIE KONKRETE AUFGABE EINFÜGEN]

## Bereit?
1. Bestätige, dass du die Regeln verstanden hast
2. Hole den aktuellen `main` Branch
3. Erstelle deinen Branch `tool/kiro/<topic>`
4. Starte mit der Arbeit in `/tools/kiro/`

## Hilfe & Dokumentation
- **Onboarding-Guide**: `docs/tool-onboarding.md`
- **KIRO-Instruktionen**: `docs/tool-instructions/kiro-instructions.md`
- **Vollständige Regeln**: `agents.md`
```

---

## 🔧 Verwendung

1. **Repository ist bereits gecloned** ✅
2. **Prompt an KIRO geben** mit spezifischer Aufgabe
3. **KIRO arbeitet lokal** in `/tools/kiro/`
4. **PR reviewen und mergen**

## 💡 Beispiel-Aufgaben für KIRO
- "Richte die Entwicklungsumgebung für eine React-basierte Web-App ein"
- "Erstelle ein Build-System mit Webpack für den Abreißkalender"
- "Konfiguriere ESLint, Prettier und TypeScript für das Projekt"
- "Erstelle Templates für React-Komponenten"