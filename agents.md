# Multi-Agent / Multi-Tool GitHub Workflow (Windows + Cloud Tools)

Diese Datei definiert die verbindlichen Regeln, wie verschiedene Tools/Agenten (Windows-Apps und Cloud-Plattformen)
mit diesem Repository arbeiten dürfen.

Ziele:
- Keine Direkt-Pushes nach `main`
- Klare Trennung pro Tool (Branch + Ordner)
- Saubere PRs, nachvollziehbare Commits, minimale Konflikte
- Optional: technische Durchsetzung über CI (Path-Policy)

---

## 1) Grundprinzipien (nicht verhandelbar)

1. `main` ist geschützt.
   - Kein Tool/Agent darf direkt nach `main` pushen.
   - Änderungen kommen ausschließlich via Pull Request (PR).

2. Ein Tool/Agent arbeitet ausschließlich in:
   - dem eigenen Branch-Namespace `tool/<agent_name>/...`
   - und dem eigenen Ordner `/tools/<agent_name>/...`

3. Keine Tool-übergreifenden Änderungen:
   - Ein Tool darf keine Dateien in einem fremden Tool-Ordner ändern.
   - Ein Tool darf keine Dateien unter `/core/**` ändern, sofern nicht explizit beauftragt.

4. Kleine, gut beschriebene PRs:
   - Lieber mehrere kleine PRs als ein großer "Megapush".
   - PRs sollen möglichst isolierte Änderungen enthalten.

---

## 2) Repo-Struktur (Ownership-Zonen)

Top-Level Zonen:
- `/tools/<agent_name>/`  Tool-spezifischer Bereich. Hier darf *nur* das jeweilige Tool Änderungen machen.
- `/core/`  Kern-Logik, gemeinsame Libraries, zentrale Konfiguration.
  Änderungen nur nach expliziter Anweisung und idealerweise durch Menschen-Review.
- `/docs/`  Dokumentation (kann optional für Tools freigegeben werden, falls gewünscht).

Empfohlene Standardordner pro Tool:
- `/tools/antigravity/`
- `/tools/chatgpt/`
- `/tools/kiro/`
- `/tools/code-agent/`

---

## 3) Branch-Konvention (Naming Standard)

Jedes Tool nutzt einen eigenen Branch-Namespace:
- `tool/antigravity/<topic>`
- `tool/chatgpt/<topic>`
- `tool/kiro/<topic>`
- `tool/code-agent/<topic>`

Beispiele:
- `tool/code-agent/folder-structure-init`
- `tool/kiro/gui-widgets`
- `tool/antigravity/refactor-ingestion`

Regeln:
- Branches werden immer von `origin/main` abgeleitet.
- Branches werden kurzlebig gehalten: PR auf, mergen, Branch löschen.

---

## 4) Arbeitsablauf (Workflow)

### 4.1 Start einer Aufgabe (für jedes Tool gleich)

1. Synchronisieren:
   - `git fetch --all`

2. Branch erstellen oder aktualisieren:
   - Neuen Branch von `origin/main` erstellen

3. Änderungen durchführen:
   - Ausschließlich im eigenen Tool-Ordner `/tools/<agent_name>/`

4. Committen:
   - Präzise Commit Message (siehe Abschnitt 5)

5. Push:
   - In den eigenen Branch

6. Pull Request:
   - PR von `tool/<agent_name>/<topic>` nach `main`

### 4.2 Merge nach `main`

- Merge erfolgt nur per PR.
- Optional: Merge nur, wenn Checks (CI) grün sind.
- Nach Merge: Branch löschen.

---

## 5) Commit- und PR-Standards

### 5.1 Commit Messages (empfohlen)

Format:
- `tool(<agent_name>): <kurze beschreibung>`

Beispiele:
- `tool(code-agent): add initial folder structure for codex`
- `tool(kiro): implement settings panel skeleton`
- `tool(antigravity): refactor vector store interface`

### 5.2 Pull Request Beschreibung (Minimum)

Jeder PR enthält:
- Was wurde geändert?
- Welche Dateien / Module?
- Wie testen / verifizieren?
- Risiken / offene Punkte

---

## 6) Harte Durchsetzung (empfohlen): Path-Policy via CI

Um sicherzustellen, dass Tools/Agenten ausschließlich im eigenen Ordner ändern,
wird eine CI-Regel empfohlen:

- PRs aus `tool/code-agent/**` dürfen nur Dateien unter `/tools/code-agent/**` ändern
- PRs aus `tool/kiro/**` dürfen nur Dateien unter `/tools/kiro/**` ändern
- etc.

Wenn ein PR gegen diese Regel verstößt:
- CI Check schlägt fehl
- PR darf nicht gemerged werden

Hinweis:
Die CI-Regel ist tool-unabhängig (Windows-App, Cloud-Agent, CLI — alles gleich).

---

## 7) DeepLink / "Branch-Link"-Regel (praktische Nutzung)

Wenn ein Tool über eine GUI/Plattform arbeitet, wird ihm direkt der Link zum
zugehörigen Branch gegeben (DeepLink), plus diese 3 Arbeitsregeln:

1. Arbeite nur im Branch `tool/<agent_name>/...`
2. Ändere nur `/tools/<agent_name>/...`
3. Erstelle PR nach `main` (kein Direkt-Push nach `main`)

Das reduziert Fehler und verhindert, dass Tools "aus Versehen" in falschen Bereichen arbeiten.

---

## 8) Konfliktvermeidung (Best Practices)

- Pro Tool möglichst eigene, isolierte Module/Dateien.
- Gemeinsame Änderungen (z. B. Build-System, globale Config) nur:
  - in separatem "human" oder "supervisor" Branch,
  - oder mit expliziter Beauftragung und Review.
- PRs klein halten.
- Häufig rebasen/mergen von `origin/main`, wenn PRs länger als 1 Tag offen sind.

---

## 9) Rollenmodell (optional, aber nützlich)

- Mensch/Supervisor:
  - entscheidet über Merge nach `main`
  - verwaltet Strukturänderungen in `/core`
  - kontrolliert globale Konfiguration

- Tool/Agent:
  - implementiert klar abgegrenzte Aufgaben
  - liefert PRs mit sauberer Beschreibung
  - respektiert Pfad- und Branch-Grenzen

---

## 10) Definition "Done" für Tool-Arbeit

Eine Tool-Aufgabe gilt als abgeschlossen, wenn:
- PR erstellt wurde
- Änderungen innerhalb erlaubter Pfade liegen
- Minimale Dokumentation/Notiz im Tool-Ordner existiert (README oder Kommentar)
- Checks/Tests (falls vorhanden) grün sind

---

## 11) Quickstart: Neue Tools hinzufügen

1. Ordner anlegen: `/tools/<new_agent>/`
2. Branch-Namespace verwenden: `tool/<new_agent>/<topic>`
3. Optional CI Path-Policy erweitern
4. Regeln aus dieser Datei an das Tool geben

---