# Multi-Agent Workflow Rules

> **Universelle Regeln für alle Tools/Agenten im ARK Repository**

---

## 🎯 **Deine Tool-Identität**

**Du bist**: `{TOOL_NAME}` *(ersetze mit: antigravity, chatgpt, kiro, oder code-agent)*  
**Dein Arbeitsbereich**: `/tools/{TOOL_NAME}/`  
**Dein Branch-Pattern**: `tool/{TOOL_NAME}/{TOPIC}`

---

## 🚨 **Die 3 Goldenen Regeln (NICHT VERHANDELBAR)**

### 1️⃣ **Branch-Isolation**
```bash
# Arbeite NUR in diesem Branch-Pattern:
tool/{TOOL_NAME}/{TOPIC}

# Beispiele:
tool/kiro/setup-frontend
tool/chatgpt/content-generation
tool/antigravity/api-development
```

### 2️⃣ **Pfad-Isolation** 
```bash
# Ändere NUR Dateien in:
/tools/{TOOL_NAME}/

# NIEMALS in:
/tools/andere-tools/
/.github/
/README.md
/agents.md
```

### 3️⃣ **Merge-Isolation**
```bash
# Erstelle IMMER Pull Request nach main
# NIEMALS direkter Push nach main
git push origin tool/{TOOL_NAME}/{TOPIC}
# → Dann PR via GitHub UI
```

---

## 🔄 **Dein Standard-Workflow**

### **Schritt 1: Vorbereitung**
```bash
# Repository klonen (falls noch nicht geschehen)
git clone https://github.com/miscarriage87/ARK.git
cd ARK

# Aktuellen Stand holen
git fetch --all
git checkout main
git pull origin main
```

### **Schritt 2: Branch erstellen**
```bash
# Neuen Branch erstellen
git checkout -b tool/{TOOL_NAME}/{TOPIC}

# Beispiel für KIRO:
git checkout -b tool/kiro/setup-webpack
```

### **Schritt 3: Arbeiten**
```bash
# Wechsle in deinen Ordner
cd tools/{TOOL_NAME}/

# Arbeite nur hier - erstelle/bearbeite Dateien
# Beispiel-Struktur:
tools/{TOOL_NAME}/
├── README.md
├── src/
├── config/
└── docs/
```

### **Schritt 4: Committen**
```bash
# Änderungen hinzufügen
git add tools/{TOOL_NAME}/

# Commit mit Standard-Format
git commit -m "tool({TOOL_NAME}): {KURZE_BESCHREIBUNG}"

# Beispiele:
git commit -m "tool(kiro): setup webpack configuration"
git commit -m "tool(chatgpt): add content generation templates"
```

### **Schritt 5: Push & PR**
```bash
# Branch pushen
git push origin tool/{TOOL_NAME}/{TOPIC}

# Dann via GitHub UI:
# https://github.com/miscarriage87/ARK/pulls
# → "New Pull Request"
# → Base: main ← Compare: tool/{TOOL_NAME}/{TOPIC}
```

---

## 📝 **PR-Template**

```markdown
## Tool: {TOOL_NAME}
**Branch**: `tool/{TOOL_NAME}/{TOPIC}`

## Was wurde geändert?
- [Kurze Beschreibung der Änderungen]

## Geänderte Dateien
- `tools/{TOOL_NAME}/...`

## Wie testen?
- [Schritte zum Testen]

## Nächste Schritte
- [Was sollte als nächstes gemacht werden]
```

---

## ⚠️ **Wichtige Einschränkungen**

### ❌ **VERBOTEN**
- Direkter Push nach `main`
- Änderungen außerhalb von `/tools/{TOOL_NAME}/`
- Änderungen in anderen Tool-Ordnern
- Änderungen an Repository-Konfiguration (außer explizit beauftragt)

### ✅ **ERLAUBT**
- Alles in `/tools/{TOOL_NAME}/`
- Mehrere kleine PRs statt einem großen
- Eigene Dokumentation im Tool-Ordner
- Koordination mit anderen Tools via Issues/Discussions

---

## 🛠️ **Tool-spezifische Rollen**

### **Antigravity** (`/tools/antigravity/`)
- Backend-Entwicklung & API-Design
- Datenbank-Schema & Server-Logik
- Authentication & Security

### **ChatGPT** (`/tools/chatgpt/`)
- Content-Generierung & NLP
- Spruch-Kategorisierung & Templates
- Personalisierungs-Algorithmen

### **KIRO** (`/tools/kiro/`)
- Frontend-Entwicklung & UI/UX
- Build-System & Development-Tools
- Progressive Web App Features

### **Code-Agent** (`/tools/code-agent/`)
- Integration & Deployment
- Testing & Quality Assurance
- CI/CD & Automation

---

## 🔍 **Automatische Durchsetzung**

Das Repository hat eine **Path-Policy CI**, die automatisch prüft:

```yaml
# Wenn dein Branch: tool/kiro/feature
# Dann dürfen nur Dateien in: tools/kiro/
# geändert werden.

# Bei Verstoß: ❌ CI schlägt fehl
# Bei Einhaltung: ✅ CI ist grün
```

---

## 🚀 **Schnellstart für {TOOL_NAME}**

1. **Klone Repository**: `git clone https://github.com/miscarriage87/ARK.git`
2. **Erstelle Branch**: `git checkout -b tool/{TOOL_NAME}/initial-setup`
3. **Arbeite in**: `/tools/{TOOL_NAME}/`
4. **Committe**: `git commit -m "tool({TOOL_NAME}): initial setup"`
5. **Push & PR**: `git push origin tool/{TOOL_NAME}/initial-setup`

---

## 📚 **Projektkontext**

**ARK** ist ein digitaler Abreißkalender mit:
- Täglichen KI-generierten Sprüchen
- Personalisierung basierend auf Nutzer-Profilen
- Mobile-First Progressive Web App
- Thematischer Strukturierung (Wochen-/Monatsthemen)

**Vollständige Projektbeschreibung**: Siehe [README.md](README.md)

---

## 🆘 **Bei Problemen**

### **CI schlägt fehl mit "Path Policy Violation"**
→ Du hast Dateien außerhalb von `/tools/{TOOL_NAME}/` geändert

### **Merge-Konflikt**
```bash
git fetch origin
git rebase origin/main
# Konflikte lösen, dann:
git push --force-with-lease
```

### **Branch existiert schon**
```bash
git branch -D tool/{TOOL_NAME}/{TOPIC}
git push origin --delete tool/{TOOL_NAME}/{TOPIC}
```

---

## ✅ **Definition of Done**

Eine Aufgabe ist abgeschlossen, wenn:
- [ ] PR erstellt und gemerged
- [ ] Alle Änderungen in `/tools/{TOOL_NAME}/`
- [ ] CI-Checks sind grün
- [ ] Minimale Dokumentation im Tool-Ordner vorhanden

---

<div align="center">

**Bereit? Dann leg los mit deinem ersten Branch!** 🚀

`git checkout -b tool/{TOOL_NAME}/getting-started`

</div>