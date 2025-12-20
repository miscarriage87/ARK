# Cloud Tools - Spezifische Instruktionen
*Für ChatGPT, Antigravity, Code-Agent und andere Cloud-basierte Tools*

## 🎯 Was du dem Tool übergeben solltest

### 1. Repository-Informationen
```
Repository: https://github.com/miscarriage87/ARK.git
Dein Arbeitsbereich: /tools/<tool-name>/
Branch-Pattern: tool/<tool-name>/<topic>
```

### 2. Die 3 goldenen Regeln
```
1. Arbeite nur im Branch tool/<tool-name>/...
2. Ändere nur Dateien in /tools/<tool-name>/...  
3. Erstelle PR nach main (kein Direkt-Push)
```

### 3. Vollständige Regeln-URL
```
https://github.com/miscarriage87/ARK/blob/main/agents.md
```

## 📋 Tool-spezifische Setups

### ChatGPT
**Dein Ordner**: `/tools/chatgpt/`  
**Branch-Beispiel**: `tool/chatgpt/content-generation`

**Typische Aufgaben**:
- Content-Generierung für den Abreißkalender
- Spruch-Kategorisierung
- Persönlichkeitsprofil-Entwicklung
- Dokumentation schreiben

### Antigravity  
**Dein Ordner**: `/tools/antigravity/`  
**Branch-Beispiel**: `tool/antigravity/api-integration`

**Typische Aufgaben**:
- Backend-Entwicklung
- API-Design
- Datenbank-Schema
- Server-Konfiguration

### Code-Agent
**Dein Ordner**: `/tools/code-agent/`  
**Branch-Beispiel**: `tool/code-agent/frontend-components`

**Typische Aufgaben**:
- Frontend-Entwicklung
- UI-Komponenten
- JavaScript/TypeScript Code
- Styling und Layout

## 🔄 Empfohlener Workflow für Cloud-Tools

### Schritt 1: Tool-Briefing
Gib dem Tool diese Informationen:

```markdown
# ARK Repository - Tool Briefing

## Repository
- URL: https://github.com/miscarriage87/ARK.git
- Dein Arbeitsbereich: /tools/<tool-name>/

## Regeln
1. Branch: tool/<tool-name>/<topic>
2. Nur Änderungen in /tools/<tool-name>/
3. PR nach main (kein direkter Push)

## Aufgabe
[Beschreibe hier die spezifische Aufgabe]

## Kontext
- Projekt: Digitaler Abreißkalender (Web-App)
- Vollständige Regeln: https://github.com/miscarriage87/ARK/blob/main/agents.md
- Projektkonzept: https://github.com/miscarriage87/ARK/blob/main/core/project-concept.md
```

### Schritt 2: Repository-Zugriff
Das Tool sollte:
1. Repository klonen oder auf GitHub zugreifen
2. Aktuellen `main` Branch checken
3. Neuen Branch erstellen: `tool/<tool-name>/<topic>`

### Schritt 3: Arbeit durchführen
- Nur in `/tools/<tool-name>/` arbeiten
- Commits mit Format: `tool(<tool-name>): beschreibung`

### Schritt 4: Pull Request
- PR von `tool/<tool-name>/<topic>` nach `main`
- PR-Beschreibung mit Template ausfüllen

## 📝 PR-Template für Cloud-Tools

```markdown
## Was wurde geändert?
- [Kurze Beschreibung der Änderungen]

## Tool
- **Tool**: <tool-name>
- **Branch**: tool/<tool-name>/<topic>
- **Arbeitsbereich**: /tools/<tool-name>/

## Welche Dateien / Module?
- [Liste der geänderten Dateien]

## Wie testen / verifizieren?
- [Schritte zum Testen der Änderungen]

## Risiken / offene Punkte
- [Bekannte Probleme oder TODOs]

## Nächste Schritte
- [Was sollte als nächstes gemacht werden]
```

## 🚨 Häufige Probleme und Lösungen

### Problem: Tool will in `/core/` oder anderen Ordnern arbeiten
**Lösung**: Erkläre dem Tool, dass es nur in `/tools/<tool-name>/` arbeiten darf. Verweise auf die agents.md Regeln.

### Problem: Tool erstellt keinen Branch
**Lösung**: Betone, dass ein Branch mit Pattern `tool/<tool-name>/<topic>` erstellt werden muss.

### Problem: Tool will direkt nach `main` pushen
**Lösung**: Erkläre, dass nur PRs erlaubt sind. Verweise auf die Path-Policy CI.

## 💡 Best Practices für Cloud-Tools

1. **Klare Aufgabendefinition**: Gib dem Tool eine spezifische, abgrenzbare Aufgabe
2. **Kontext bereitstellen**: Verlinke auf relevante Dokumentation
3. **Iterative Entwicklung**: Lieber mehrere kleine PRs als einen großen
4. **Dokumentation**: Lass das Tool ein README in seinem Ordner erstellen
5. **Testing**: Bitte das Tool, Testanweisungen zu hinterlassen

## 🔗 Wichtige Links für Tools

- **Vollständige Regeln**: https://github.com/miscarriage87/ARK/blob/main/agents.md
- **Projektkonzept**: https://github.com/miscarriage87/ARK/blob/main/core/project-concept.md
- **Repository**: https://github.com/miscarriage87/ARK
- **Onboarding-Guide**: https://github.com/miscarriage87/ARK/blob/main/docs/tool-onboarding.md

## 🎉 Tool ist bereit!

Mit diesen Informationen kann jedes Cloud-Tool erfolgreich am ARK Repository arbeiten.