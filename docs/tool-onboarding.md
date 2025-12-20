# Tool Onboarding Guide

Dieser Guide erklärt, wie du mit den verschiedenen AI-Tools am ARK Repository arbeitest.

---

## 🚀 Schnellstart für jedes Tool

### 1. Repository-URL
```
https://github.com/miscarriage87/ARK.git
```

### 2. Dein Tool-spezifischer Arbeitsbereich

Jedes Tool hat seinen eigenen Bereich:
- **Antigravity**: `/tools/antigravity/`
- **ChatGPT**: `/tools/chatgpt/`
- **KIRO**: `/tools/kiro/`
- **Code-Agent**: `/tools/code-agent/`

### 3. Branch-Naming

Erstelle immer einen Branch nach diesem Muster:
```
tool/<dein-tool-name>/<beschreibung>
```

Beispiele:
- `tool/kiro/initial-setup`
- `tool/chatgpt/add-documentation`
- `tool/antigravity/implement-feature-x`

---

## 📋 Onboarding-Checkliste pro Tool

### Schritt 1: Repository klonen
```bash
git clone https://github.com/miscarriage87/ARK.git
cd ARK
```

### Schritt 2: Aktuellen Stand holen
```bash
git fetch --all
git checkout main
git pull origin main
```

### Schritt 3: Eigenen Branch erstellen
```bash
# Ersetze <tool-name> und <topic> entsprechend
git checkout -b tool/<tool-name>/<topic>
```

Beispiel für KIRO:
```bash
git checkout -b tool/kiro/initial-setup
```

### Schritt 4: Arbeiten im eigenen Ordner
- Ändere **nur** Dateien in `/tools/<dein-tool-name>/`
- Keine Änderungen in `/core/`, `/docs/` oder anderen Tool-Ordnern
- Die CI wird dies automatisch prüfen

### Schritt 5: Änderungen committen
```bash
git add tools/<dein-tool-name>/
git commit -m "tool(<tool-name>): kurze beschreibung"
```

Beispiel:
```bash
git add tools/kiro/
git commit -m "tool(kiro): add initial project structure"
```

### Schritt 6: Branch pushen
```bash
git push origin tool/<tool-name>/<topic>
```

### Schritt 7: Pull Request erstellen
- Gehe zu GitHub: https://github.com/miscarriage87/ARK/pulls
- Klicke "New Pull Request"
- Base: `main` ← Compare: `tool/<tool-name>/<topic>`
- Fülle die PR-Beschreibung aus (siehe unten)

---

## 📝 Pull Request Template

```markdown
## Was wurde geändert?
- [Kurze Beschreibung der Änderungen]

## Welche Dateien / Module?
- `tools/<tool-name>/...`

## Wie testen / verifizieren?
- [Schritte zum Testen]

## Risiken / offene Punkte
- [Bekannte Probleme oder TODOs]
```

---

## 🎯 Tool-spezifische Instruktionen

### Für Cloud-basierte Tools (ChatGPT, Antigravity, etc.)

**Was du dem Tool übergeben solltest:**

1. **Repository-URL**: `https://github.com/miscarriage87/ARK.git`

2. **Dein Arbeitsbereich**: `/tools/<tool-name>/`

3. **Branch-Name**: `tool/<tool-name>/<topic>`

4. **Die 3 goldenen Regeln**:
   ```
   1. Arbeite nur im Branch tool/<tool-name>/...
   2. Ändere nur Dateien in /tools/<tool-name>/...
   3. Erstelle PR nach main (kein Direkt-Push)
   ```

5. **Link zur agents.md**: Gib dem Tool Zugriff auf die vollständigen Regeln:
   ```
   https://github.com/miscarriage87/ARK/blob/main/agents.md
   ```

### Für lokale Tools (KIRO, Code-Agent, etc.)

**Workflow:**

1. Öffne das Repository lokal
2. Erstelle deinen Branch: `tool/<tool-name>/<topic>`
3. Arbeite ausschließlich in `/tools/<tool-name>/`
4. Committe mit: `tool(<tool-name>): beschreibung`
5. Pushe und erstelle PR

---

## ⚠️ Wichtige Einschränkungen

### ❌ NICHT erlaubt:
- Direkter Push nach `main`
- Änderungen in `/core/` (außer explizit beauftragt)
- Änderungen in anderen Tool-Ordnern
- Änderungen außerhalb von `/tools/<dein-tool-name>/`

### ✅ Erlaubt:
- Alles in `/tools/<dein-tool-name>/`
- Mehrere kleine PRs statt einem großen
- Dokumentation im eigenen Tool-Ordner

---

## 🔍 Troubleshooting

### Problem: CI schlägt fehl mit "Path Policy Violation"
**Lösung**: Du hast Dateien außerhalb deines Tool-Ordners geändert. Entferne diese Änderungen oder verschiebe sie in einen separaten PR.

### Problem: Merge-Konflikt
**Lösung**: 
```bash
git fetch origin
git rebase origin/main
# Konflikte lösen
git push --force-with-lease
```

### Problem: Branch existiert schon
**Lösung**: Wähle einen anderen Topic-Namen oder lösche den alten Branch:
```bash
git branch -D tool/<tool-name>/<topic>
git push origin --delete tool/<tool-name>/<topic>
```

---

## 📚 Weitere Ressourcen

- **Vollständige Regeln**: `agents.md`
- **Projektkonzept**: `core/project-concept.md`
- **Repository-Struktur**: `README.md`

---

## 💡 Best Practices

1. **Kleine PRs**: Lieber 3 kleine PRs als 1 großer
2. **Klare Commits**: Beschreibende Commit-Messages
3. **Regelmäßig synchronisieren**: Täglich `git fetch` und `git rebase`
4. **Dokumentation**: README in deinem Tool-Ordner pflegen
5. **Kommunikation**: Bei Unklarheiten nachfragen

---

## 🎉 Ready to go!

Dein Tool ist jetzt bereit, am ARK Repository zu arbeiten. Viel Erfolg!