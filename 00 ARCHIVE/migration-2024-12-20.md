# Repository Restructuring - 20.12.2024

## Durchgeführte Änderungen

### Gelöschte Strukturen
- `/core/` - Übergeordneter Ordner entfernt für lean structure
- `/docs/` - Übergeordneter Ordner entfernt, Dokumentation dezentralisiert
- `MIGRATION.md` - Nicht mehr relevant nach Restructuring
- `docs/tool-onboarding.md` - Ersetzt durch agents.md mit Variablen
- `docs/tool-instructions/` - Tool-spezifische Anleitungen entfernt
- `docs/prompts/` - Prompts in agents.md integriert

### Archivierte Inhalte
- Projektkonzept → In README.md integriert
- Tool-Instruktionen → In agents.md mit Variablen generalisiert
- Onboarding-Guides → Vereinfacht in agents.md

### Neue Struktur
- Flache Hierarchie: nur `/tools/<agent>/` Ordner
- Universelle agents.md mit Variablen-System
- README.md mit integriertem Projektkonzept
- Gleichberechtigte Tool-Struktur ohne Hierarchien

### Grund der Änderung
- Lean/Clean Prinzip
- Gleichberechtigung aller Tools
- Weniger Verwirrung durch flache Struktur
- Einheitliche Ausgangslage für alle Agenten