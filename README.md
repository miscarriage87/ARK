# 📅 ARK - Digitaler Abreißkalender

> *Ein personalisierter, KI-gestützter Abreißkalender als moderne Web-Anwendung in deutscher(!) Sprache*

---

## 🎯 **Vision**

ARK verwandelt den klassischen Abreißkalender in eine intelligente, personalisierte Web-Erfahrung. Jeden Tag ein neuer, auf dich zugeschnittener Spruch - generiert von KI, inspiriert von deiner Persönlichkeit.

---

## ✨ **Kernfunktionen**

### 📱 **Tägliche Inspiration**
- **KI-generierte Sprüche** täglich neu und personalisiert
- **Thematische Struktur** mit Wochen- und Monatsthemen
- **Tägliche Überraschungen** innerhalb der Themenwelten

### 👤 **Personalisierung**
- **Persönlichkeitsprofile** basierend auf Fragenkatalog
- **Zielgruppen-spezifisch**: Spiritualität, Sport, Bildung, Gesundheit
- **Individuelle Anpassung** für jeden Nutzer

### 📚 **Archiv & Navigation**
- **Spruch-Archiv** mit allen vergangenen Inhalten
- **Kategorisierung** nach Themen und Persönlichkeit
- **Intuitive Suche** und Wiederauffindung

### 📲 **Mobile-First**
- **Progressive Web App** mit App-ähnlicher Bedienung
- **Tägliche Erinnerungen** und Push-Notifications
- **Offline-Funktionalität** für unterbrechungsfreie Nutzung

---

## 🎨 **Design-Prinzipien**

- **Schlicht & Funktional** - Fokus auf Inhalt, nicht auf Ablenkung
- **Intuitiv** - Keine Einarbeitungszeit erforderlich
- **Nicht überfrachtet** - Wenige, aber durchdachte Features
- **Mobile-optimiert** - Perfekt für den täglichen Gebrauch

---

## 🏗️ **Multi-Tool Entwicklung**

ARK wird mit einem innovativen Multi-Tool-Ansatz entwickelt, bei dem **jedes Tool die komplette Anwendung implementiert** - aber mit seinem eigenen Ansatz und Technologie-Stack:

```
├── tools/
│   ├── antigravity/     # Vollständige ARK-Implementation
│   ├── chatgpt/         # Vollständige ARK-Implementation
│   ├── kiro/            # Vollständige ARK-Implementation
│   └── code-agent/      # Vollständige ARK-Implementation
```

**Jedes Tool entwickelt:**
- ✅ **Frontend** (UI/UX, Components, Styling)
- ✅ **Backend** (API, Datenbank, Server-Logik)
- ✅ **KI-Integration** (Content-Generierung, Personalisierung)
- ✅ **Mobile Features** (PWA, Notifications, Offline)
- ✅ **Deployment** (CI/CD, Hosting, Monitoring)

**Warum dieser Ansatz?**
- **Diversität**: Verschiedene Technologie-Stacks und Ansätze
- **Vergleichbarkeit**: Welcher Ansatz funktioniert am besten?
- **Redundanz**: Mehrere funktionierende Versionen
- **Innovation**: Jedes Tool kann experimentieren
- **Lernen**: Verschiedene Implementierungsstrategien

---

## 🚀 **Technologie-Vielfalt**

Jedes Tool kann seinen eigenen Tech-Stack wählen:

### **Frontend-Optionen**
- React, Vue, Svelte, Angular, Vanilla JS
- CSS, SCSS, Tailwind, Styled-Components
- Webpack, Vite, Parcel, Rollup

### **Backend-Optionen**  
- Node.js, Python, Go, Rust, PHP
- Express, FastAPI, Gin, Actix, Laravel
- PostgreSQL, MongoDB, SQLite, Firebase

### **KI-Integration**
- OpenAI API, Anthropic, Local Models
- Langchain, Custom Prompts, Fine-tuning
- Vector Databases, Embeddings

### **Deployment**
- Vercel, Netlify, AWS, Google Cloud
- Docker, Kubernetes, Serverless
- GitHub Actions, GitLab CI, Jenkins

---

## 🧑‍💻 **Entwicklungsregeln**

Alle Entwicklungsregeln und Workflows sind in [`agents.md`](agents.md) definiert.

**Kurz zusammengefasst:**
- Jedes Tool arbeitet nur in seinem `/tools/<name>/` Ordner
- Branch-Pattern: `tool/<name>/<topic>` oder `tool/<name>` (Master-Branch)
- Alle Änderungen via Pull Request nach `main`
- Automatische CI-Durchsetzung der Pfad-Regeln

---

## 🎯 **Personalisierungs-System**

### 📊 **Dynamisches Nutzer-Profiling**
ARK erstellt automatisch personalisierte Profile durch:

**Initiales Setup** (Minimal-Aufwand):
- Kurzer Fragenkatalog (5-7 Fragen) zur Grundcharakterisierung
- Schnelle Einschätzung von Interessen und Präferenzen
- Optionale demografische Angaben

**Kontinuierliche Anpassung** (Automatisch):
- Tägliches Feedback: "Gefällt dir der heutige Spruch?" 
  - 👍 **Gefällt mir** / 😐 **Neutral** / 👎 **Gefällt mir nicht**
- Automatische Profil-Anpassung basierend auf Bewertungen
- Lernende Algorithmen für bessere Personalisierung
- Keine aufwendigen Fragebögen oder komplexe Einstellungen

**Profil-Kategorien** (Beispiele):
- **Spiritualität & Achtsamkeit**: Meditation, persönliche Entwicklung
- **Sport & Disziplin**: Motivation, Durchhaltevermögen, Kampfgeist
- **Bildung & Wissen**: Sprachen, Geschichte, Wissenschaft
- **Gesundheit & Wellness**: Balance, Heilung, natürliche Lebensweise
- **Humor & Leichtigkeit**: Aufmunterung, positive Energie
- **Philosophie & Weisheit**: Tiefere Gedanken, Lebenserfahrung

Das System lernt kontinuierlich und passt die Spruch-Auswahl automatisch an die sich entwickelnden Präferenzen an.

---

## 🛠️ **Für Entwickler**

### Repository klonen
```bash
git clone https://github.com/miscarriage87/ARK.git
cd ARK
```

### Als Tool beitragen
1. Lies [`agents.md`](agents.md) vollständig
2. Erstelle/nutze Branch: `tool/<dein-tool>` oder `tool/<dein-tool>/<topic>`
3. Arbeite nur in `/tools/<dein-tool>/`
4. Implementiere die **komplette ARK-Anwendung**
5. Erstelle Pull Request nach `main`

---

## 🤝 **Beitragen**

ARK lebt von der Vielfalt verschiedener Implementierungsansätze. Jedes Tool bringt seine einzigartige Perspektive und Herangehensweise ein.

Siehe [`agents.md`](agents.md) für detaillierte Entwicklungsregeln.

---

## 🏆 **Erfolg messen**

Jede Implementation wird bewertet nach:
- **Funktionalität**: Erfüllt alle Kernfunktionen
- **Benutzerfreundlichkeit**: Intuitive Bedienung
- **Performance**: Schnell und responsive
- **Code-Qualität**: Wartbar und erweiterbar
- **Innovation**: Neue Ansätze und Ideen

---

## 📄 **Lizenz**

*Lizenz wird noch definiert*

---

<div align="center">

**ARK** - *Wo verschiedene Ansätze zur besten Lösung führen* 📅✨

</div>
