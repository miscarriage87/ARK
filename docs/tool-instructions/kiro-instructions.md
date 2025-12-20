# KIRO Tool - Spezifische Instruktionen

## 🎯 Deine Arbeitsumgebung

**Repository**: https://github.com/miscarriage87/ARK.git  
**Dein Ordner**: `/tools/kiro/`  
**Branch-Pattern**: `tool/kiro/<topic>`

## 📋 Schnellstart-Kommandos

```bash
# Repository klonen (falls noch nicht geschehen)
git clone https://github.com/miscarriage87/ARK.git
cd ARK

# Neuen Branch für deine Arbeit erstellen
git checkout -b tool/kiro/initial-setup

# In deinem Ordner arbeiten
cd tools/kiro/

# Änderungen committen
git add .
git commit -m "tool(kiro): add initial project files"

# Branch pushen
git push origin tool/kiro/initial-setup
```

## 🔧 KIRO-spezifische Regeln

Da du als lokales Tool arbeitest:

1. **Direkter Dateizugriff**: Du kannst direkt auf das lokale Repository zugreifen
2. **Integrierte Git-Funktionen**: Nutze deine eingebauten Git-Features
3. **Live-Synchronisation**: Du siehst Änderungen anderer Tools in Echtzeit

## 📁 Empfohlene Ordnerstruktur für `/tools/kiro/`

```
tools/kiro/
├── README.md              # Deine Tool-Dokumentation
├── config/                # KIRO-spezifische Konfigurationen
├── scripts/               # Automatisierungsscripts
├── templates/             # Code-Templates
├── workflows/             # KIRO-Workflows
└── docs/                  # KIRO-interne Dokumentation
```

## 🎯 Typische KIRO-Aufgaben im ARK Projekt

1. **Code-Generierung**: Templates für den Abreißkalender
2. **Projekt-Setup**: Entwicklungsumgebung konfigurieren
3. **Automatisierung**: Build- und Deploy-Scripts
4. **Code-Review**: Andere Tool-Beiträge reviewen
5. **Integration**: Verschiedene Tool-Outputs zusammenführen

## 🔄 Workflow-Beispiel

```bash
# 1. Neue Aufgabe starten
git checkout main
git pull origin main
git checkout -b tool/kiro/setup-dev-environment

# 2. In deinem Ordner arbeiten
cd tools/kiro/
# ... deine Arbeit ...

# 3. Committen und pushen
git add .
git commit -m "tool(kiro): setup development environment with webpack config"
git push origin tool/kiro/setup-dev-environment

# 4. PR erstellen über GitHub UI
# 5. Nach Merge: Branch aufräumen
git checkout main
git pull origin main
git branch -d tool/kiro/setup-dev-environment
```

## 🚨 Wichtige Erinnerungen

- **Nur in `/tools/kiro/` arbeiten**
- **Branch-Namen**: Immer `tool/kiro/<topic>`
- **Commit-Format**: `tool(kiro): <beschreibung>`
- **Keine direkten Pushes nach `main`**

## 🔗 Nützliche Links

- [Vollständige Regeln](../agents.md)
- [Allgemeines Onboarding](../tool-onboarding.md)
- [Projektkonzept](../../core/project-concept.md)