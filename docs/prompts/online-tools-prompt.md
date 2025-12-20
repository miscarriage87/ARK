# Prompt für Online-Tools (ChatGPT, Antigravity, Code-Agent, etc.)

## 🎯 Copy-Paste Prompt für Online-Tools

```markdown
# ARK Repository - Multi-Agent Workflow

Du arbeitest jetzt am ARK Repository (Digitaler Abreißkalender) mit einem strukturierten Multi-Agent-Workflow.

## Repository-Informationen
- **URL**: https://github.com/miscarriage87/ARK.git
- **Dein Arbeitsbereich**: `/tools/<TOOL-NAME>/` (ersetze <TOOL-NAME> mit deinem Tool-Namen)
- **Projektkonzept**: https://github.com/miscarriage87/ARK/blob/main/core/project-concept.md

## Die 3 goldenen Regeln (NICHT VERHANDELBAR)
1. **Branch**: Arbeite nur im Branch `tool/<TOOL-NAME>/<topic>`
2. **Dateien**: Ändere nur Dateien in `/tools/<TOOL-NAME>/`
3. **Merge**: Erstelle PR nach `main` (kein direkter Push)

## Vollständige Regeln
Lies diese Regeln VOLLSTÄNDIG: https://github.com/miscarriage87/ARK/blob/main/agents.md

## Dein Workflow
1. **Repository klonen**: `git clone https://github.com/miscarriage87/ARK.git`
2. **Branch erstellen**: `git checkout -b tool/<TOOL-NAME>/<topic>`
3. **Arbeiten**: Nur in `/tools/<TOOL-NAME>/` 
4. **Committen**: `git commit -m "tool(<TOOL-NAME>): beschreibung"`
5. **Push**: `git push origin tool/<TOOL-NAME>/<topic>`
6. **PR erstellen**: Via GitHub UI nach `main`

## Commit-Format
```
tool(<TOOL-NAME>): <kurze beschreibung>
```

Beispiele:
- `tool(chatgpt): add content generation templates`
- `tool(antigravity): implement user authentication`
- `tool(code-agent): create responsive calendar component`

## PR-Template
```markdown
## Was wurde geändert?
- [Kurze Beschreibung]

## Tool
- **Tool**: <TOOL-NAME>
- **Branch**: tool/<TOOL-NAME>/<topic>

## Welche Dateien / Module?
- [Liste der Dateien]

## Wie testen / verifizieren?
- [Testschritte]

## Risiken / offene Punkte
- [Bekannte Probleme]
```

## Wichtige Einschränkungen
❌ **NICHT erlaubt**:
- Direkter Push nach `main`
- Änderungen in `/core/`, `/docs/` oder anderen Tool-Ordnern
- Arbeiten außerhalb von `/tools/<TOOL-NAME>/`

✅ **Erlaubt**:
- Alles in `/tools/<TOOL-NAME>/`
- Mehrere kleine PRs
- Eigene Dokumentation im Tool-Ordner

## Projektkontext
Das ARK Projekt ist ein **digitaler Abreißkalender** als Web-Anwendung mit:
- Täglichen KI-generierten Sprüchen
- Personalisierung basierend auf Nutzer-Profilen
- Thematischer Strukturierung (Wochen-/Monatsthemen)
- Mobile-optimierter Bedienung
- Archiv-Funktion für vergangene Sprüche

## Deine spezifische Aufgabe
[HIER DIE KONKRETE AUFGABE EINFÜGEN]

## Bereit?
1. Bestätige, dass du die Regeln verstanden hast
2. Klone das Repository
3. Erstelle deinen Branch
4. Starte mit der Arbeit in deinem Tool-Ordner

Bei Fragen: Verweise auf https://github.com/miscarriage87/ARK/blob/main/docs/tool-onboarding.md
```

---

## 🔧 Anpassungen pro Tool

### Für ChatGPT
Ersetze `<TOOL-NAME>` mit `chatgpt`
Typische Aufgaben: Content-Generierung, Spruch-Kategorisierung, Dokumentation

### Für Antigravity  
Ersetze `<TOOL-NAME>` mit `antigravity`
Typische Aufgaben: Backend-Entwicklung, API-Design, Datenbank-Schema

### Für Code-Agent
Ersetze `<TOOL-NAME>` mit `code-agent`
Typische Aufgaben: Frontend-Entwicklung, UI-Komponenten, JavaScript/TypeScript

### Für andere Tools
Ersetze `<TOOL-NAME>` mit dem entsprechenden Tool-Namen (kleingeschrieben, mit Bindestrichen)