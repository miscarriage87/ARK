# Multi-Tool Workflow Rules

> **Universelle Regeln für alle Tools im ARK Repository**

---

## 🔧 **Variablen-Definition**

Diese Datei verwendet Variablen, die vom Architekten angepasst werden können:

```yaml
# Verfügbare Tools (erweitere nach Bedarf)
AVAILABLE_TOOLS:
  - antigravity
  - chatgpt  
  - kiro
  - code-agent
  # Neue Tools hier hinzufügen

# Branch-Patterns
MASTER_BRANCH_PATTERN: "tool/{TOOL_NAME}"
FEATURE_BRANCH_PATTERN: "tool/{TOOL_NAME}/{TOPIC}"

# Repository-Struktur
TOOL_WORKSPACE: "/tools/{TOOL_NAME}/"
MAIN_BRANCH: "main"
```

---

## 🎯 **Deine Tool-Identität**

**Du bist**: `{TOOL_NAME}` *(wähle: antigravity, chatgpt, kiro, code-agent)*  
**Dein Arbeitsbereich**: `/tools/{TOOL_NAME}/`  
**Dein Master-Branch**: `tool/{TOOL_NAME}`  
**Deine Feature-Branches**: `tool/{TOOL_NAME}/{TOPIC}`

---

## 🚨 **Die 3 Goldenen Regeln (NICHT VERHANDELBAR)**

### 1️⃣ **Branch-Isolation**
```bash
# Master-Branch für dein Tool:
tool/{TOOL_NAME}

# Feature-Branches für spezifische Aufgaben:
tool/{TOOL_NAME}/{TOPIC}

# Beispiele:
tool/kiro                    # KIRO Master-Branch
tool/kiro/setup-frontend     # KIRO Feature-Branch
tool/chatgpt                 # ChatGPT Master-Branch
tool/chatgpt/ai-integration  # ChatGPT Feature-Branch
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
/00 ARCHIVE/
```

### 3️⃣ **Merge-Isolation**
```bash
# Erstelle IMMER Pull Request nach main
# NIEMALS direkter Push nach main
git push origin tool/{TOOL_NAME}
git push origin tool/{TOOL_NAME}/{TOPIC}
# → Dann PR via GitHub UI
```

---

## 🌳 **Branch-Strategie**

### **Master-Branch pro Tool**
Jedes Tool hat einen dauerhaften Master-Branch:
```bash
tool/antigravity    # Antigravity Hauptentwicklung
tool/chatgpt        # ChatGPT Hauptentwicklung  
tool/kiro           # KIRO Hauptentwicklung
tool/code-agent     # Code-Agent Hauptentwicklung
```

### **Feature-Branches**
Für spezifische Aufgaben oder Experimente:
```bash
tool/{TOOL_NAME}/setup
tool/{TOOL_NAME}/frontend
tool/{TOOL_NAME}/backend
tool/{TOOL_NAME}/ai-integration
tool/{TOOL_NAME}/deployment
```

### **Branch-Lifecycle**
1. **Master-Branch**: Dauerhaft, enthält stabile Version
2. **Feature-Branch**: Temporär, für spezifische Features
3. **Merge**: Feature → Master → PR nach `main`

---

## 🔄 **Dein Standard-Workflow**

### **Schritt 1: Repository Setup**
```bash
# Repository klonen (falls noch nicht geschehen)
git clone https://github.com/miscarriage87/ARK.git
cd ARK

# Aktuellen Stand holen
git fetch --all
git checkout main
git pull origin main
```

### **Schritt 2: Master-Branch erstellen/nutzen**
```bash
# Prüfen ob Master-Branch existiert
git checkout tool/{TOOL_NAME} 2>/dev/null || git checkout -b tool/{TOOL_NAME}

# Falls Branch existiert, aktualisieren
git pull origin tool/{TOOL_NAME}
```

### **Schritt 3: Feature-Branch (optional)**
```bash
# Für spezifische Features
git checkout -b tool/{TOOL_NAME}/{TOPIC}

# Beispiele:
git checkout -b tool/kiro/setup-webpack
git checkout -b tool/chatgpt/content-generation
```

### **Schritt 4: Entwicklung**
```bash
# Wechsle in deinen Ordner
cd tools/{TOOL_NAME}/

# Implementiere die KOMPLETTE ARK-Anwendung:
# - Frontend (UI/UX, Components)
# - Backend (API, Datenbank)  
# - KI-Integration (Content-Generierung)
# - Mobile Features (PWA, Notifications)
# - Deployment (CI/CD, Hosting)
```

### **Schritt 5: Committen**
```bash
# Änderungen hinzufügen
git add tools/{TOOL_NAME}/

# Commit mit Standard-Format
git commit -m "tool({TOOL_NAME}): {KURZE_BESCHREIBUNG}"

# Beispiele:
git commit -m "tool(kiro): implement complete ARK frontend"
git commit -m "tool(chatgpt): add AI content generation system"
```

### **Schritt 6: Push & PR**
```bash
# Branch pushen
git push origin tool/{TOOL_NAME}
# oder
git push origin tool/{TOOL_NAME}/{TOPIC}

# PR erstellen via GitHub UI:
# https://github.com/miscarriage87/ARK/pulls
# → Base: main ← Compare: tool/{TOOL_NAME}
```

---

## 📝 **PR-Template**

```markdown
## Tool: {TOOL_NAME}
**Branch**: `tool/{TOOL_NAME}` oder `tool/{TOOL_NAME}/{TOPIC}`

## Implementation Status
- [ ] Frontend (UI/UX)
- [ ] Backend (API/DB)
- [ ] KI-Integration
- [ ] Mobile Features
- [ ] Deployment

## Was wurde geändert?
- [Beschreibung der Implementierung]

## Tech-Stack
- **Frontend**: [React/Vue/Vanilla/etc.]
- **Backend**: [Node.js/Python/etc.]
- **Database**: [PostgreSQL/MongoDB/etc.]
- **KI**: [OpenAI/Anthropic/etc.]

## Demo/Testing
- **URL**: [falls deployed]
- **Lokaler Start**: [Anweisungen]

## Nächste Schritte
- [Was fehlt noch / geplante Verbesserungen]
```

---

## ⚠️ **Wichtige Einschränkungen**

### ❌ **VERBOTEN**
- Direkter Push nach `main`
- Änderungen außerhalb von `/tools/{TOOL_NAME}/`
- Änderungen in anderen Tool-Ordnern
- Änderungen an Repository-Konfiguration (außer explizit beauftragt)

### ✅ **ERLAUBT**
- Komplette App-Implementation in `/tools/{TOOL_NAME}/`
- Eigener Tech-Stack und Architektur-Entscheidungen
- Mehrere Branches pro Tool (Master + Features)
- Eigene Dokumentation und Deployment-Strategien

---

## 🛠️ **Tool-Aufgaben**

**Jedes Tool implementiert die KOMPLETTE ARK-Anwendung:**

### **Alle Tools** (`/tools/{TOOL_NAME}/`)
- ✅ **Frontend**: Benutzeroberfläche, Komponenten, Styling
- ✅ **Backend**: API, Datenbank, Server-Logik
- ✅ **KI-Integration**: Content-Generierung, Personalisierung
- ✅ **Mobile**: PWA, Notifications, Offline-Funktionalität
- ✅ **Deployment**: CI/CD, Hosting, Monitoring

**Jedes Tool wählt seinen eigenen Ansatz und Tech-Stack frei.**

---

## 🔍 **Automatische Durchsetzung**

Das Repository hat eine **Path-Policy CI**, die automatisch prüft:

```yaml
# Wenn dein Branch: tool/kiro/* 
# Dann dürfen nur Dateien in: tools/kiro/
# geändert werden.

# Bei Verstoß: ❌ CI schlägt fehl
# Bei Einhaltung: ✅ CI ist grün
```

---

## 🚀 **Schnellstart für {TOOL_NAME}**

```bash
# 1. Repository klonen
git clone https://github.com/miscarriage87/ARK.git
cd ARK

# 2. Master-Branch erstellen/nutzen
git checkout tool/{TOOL_NAME} 2>/dev/null || git checkout -b tool/{TOOL_NAME}

# 3. In deinen Ordner wechseln
cd tools/{TOOL_NAME}/

# 4. Komplette ARK-App implementieren
# [Deine Implementation hier]

# 5. Committen und pushen
git add .
git commit -m "tool({TOOL_NAME}): implement complete ARK application"
git push origin tool/{TOOL_NAME}

# 6. PR erstellen via GitHub UI
```

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

### **Master-Branch existiert nicht**
```bash
git checkout -b tool/{TOOL_NAME}
git push origin tool/{TOOL_NAME}
```

### **Merge-Konflikt**
```bash
git fetch origin
git rebase origin/main
# Konflikte lösen, dann:
git push --force-with-lease
```

### **Branch existiert schon**
```bash
git checkout tool/{TOOL_NAME}
git pull origin tool/{TOOL_NAME}
```

---

## ✅ **Definition of Done**

Eine Tool-Implementation ist abgeschlossen, wenn:
- [ ] **Komplette Funktionalität**: Alle ARK-Features implementiert
- [ ] **Lauffähig**: Anwendung kann gestartet und genutzt werden
- [ ] **Dokumentiert**: README mit Setup- und Start-Anweisungen
- [ ] **Deployed**: (Optional) Live-Demo verfügbar
- [ ] **PR erstellt**: Merge-Request nach `main` eingereicht
- [ ] **CI grün**: Alle automatischen Checks bestanden

---

## 🔧 **Für Architekten: Variablen erweitern**

```yaml
# Neue Tools hinzufügen:
AVAILABLE_TOOLS:
  - antigravity
  - chatgpt
  - kiro  
  - code-agent
  - neues-tool        # Hier hinzufügen

# Neue Branch-Patterns:
CUSTOM_PATTERNS:
  - "tool/{TOOL_NAME}/experimental/{FEATURE}"
  - "tool/{TOOL_NAME}/release/{VERSION}"
```

---

<div align="center">

**Bereit? Implementiere die komplette ARK-App in deinem Stil!** 🚀

`git checkout tool/{TOOL_NAME}`

</div>