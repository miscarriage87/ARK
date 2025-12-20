# Repository Migration

## Durchgeführte Änderungen

### Neue Struktur erstellt
- ✅ `/tools/` - Tool-spezifische Bereiche mit READMEs
  - `antigravity/`
  - `chatgpt/`
  - `kiro/`
  - `code-agent/`
- ✅ `/core/` - Kern-Logik und gemeinsame Libraries
- ✅ `/docs/` - Zentrale Dokumentation
- ✅ `agents.md` - Verbindliche Workflow-Regeln
- ✅ `.github/workflows/path-policy.yml` - CI Path-Policy Durchsetzung

### Migrierte Inhalte
- ✅ `00 ARCHIVE/Konzept.txt` → `core/project-concept.md`
- ✅ `README.md` aktualisiert mit neuer Struktur

### Alte Struktur (kann nach Bestätigung gelöscht werden)
- `Antigravity/agents.md` (leer)
- `ChatGPT/agents.md` (leer)
- `Code-Agent/agents.md` (leer)
- `KIRO/agents.md` (leer)
- `00 ARCHIVE/` (migriert)

## Nächste Schritte
1. Alte Ordner löschen (nach Bestätigung)
2. Erste Tool-spezifische Branches erstellen
3. Path-Policy testen
4. Tools über neue Struktur informieren