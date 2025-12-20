# Repository Restructuring - 20.12.2024

## Durchgeführte Änderungen

### Gelöschte Strukturen
- `/core/` - Übergeordneter Ordner entfernt für lean structure
- `/docs/` - Übergeordneter Ordner entfernt, Dokumentation dezentralisiert
- `MIGRATION.md` - Nicht mehr relevant nach Restructuring
- `docs/tool-onboarding.md` - Ersetzt durch agents.md mit Variablen
- `docs/tool-instructions/` - Tool-spezifische Anleitungen entfernt
- `docs/prompts/` - Prompts in agents.md integriert
- Leere Ordner: `core/`, `docs/prompts/`, `docs/tool-instructions/`

### Archivierte Inhalte
- Projektkonzept → In README.md integriert
- Tool-Instruktionen → In agents.md mit Variablen generalisiert
- Onboarding-Guides → Vereinfacht in agents.md

### Neue Struktur (Final)
- Flache Hierarchie: nur `/tools/<agent>/` Ordner
- Universelle agents.md mit Variablen-System und Master-Branch-Konzept
- README.md mit integriertem Projektkonzept und Multi-Tool-Ansatz
- Gleichberechtigte Tool-Struktur: Jedes Tool implementiert komplette App

### Konzeptänderung
- **ALT**: Jedes Tool spezialisiert auf einen Bereich (Frontend/Backend/etc.)
- **NEU**: Jedes Tool implementiert die komplette ARK-Anwendung
- **Grund**: Diversität der Ansätze, Vergleichbarkeit, Innovation

### Branch-Strategie
- Master-Branches pro Tool: `tool/{TOOL_NAME}`
- Feature-Branches: `tool/{TOOL_NAME}/{TOPIC}`
- Bestehende Branches berücksichtigt und in agents.md integriert

### Variablen-System
- Erweiterbare Tool-Liste in agents.md
- Konfigurierbare Branch-Patterns
- Architekt kann neue Tools und Patterns hinzufügen

### Grund der finalen Änderung
- Jedes Tool soll komplette App implementieren (nicht nur Teilbereich)
- Variablen-Definition für Erweiterbarkeit
- Master-Branch-Konzept für dauerhafte Tool-Entwicklung
- Berücksichtigung bestehender Branches im Repository