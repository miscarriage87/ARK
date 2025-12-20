# 📅 ARK - Digitaler Abreißkalender

> *Ein personalisierter, KI-gestützter Abreißkalender als moderne Web-Anwendung*

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

## 🏗️ **Multi-Agent Entwicklung**

ARK wird mit einem innovativen Multi-Agent-Workflow entwickelt, bei dem verschiedene KI-Tools kollaborativ arbeiten:

```
├── tools/
│   ├── antigravity/     # Backend & API Development
│   ├── chatgpt/         # Content Generation & NLP
│   ├── kiro/            # Frontend & User Experience  
│   └── code-agent/      # Integration & Deployment
```

Jedes Tool arbeitet isoliert in seinem Bereich und trägt via Pull Requests bei - für konfliktfreie, parallele Entwicklung.

---

## 🚀 **Technologie-Stack**

- **Frontend**: Modern Web Technologies (React/Vue/Vanilla)
- **Backend**: RESTful API mit KI-Integration
- **KI**: Content-Generierung und Personalisierung
- **Mobile**: Progressive Web App (PWA)
- **Deployment**: Cloud-native mit CI/CD

---

## 📋 **Entwicklungsregeln**

Alle Entwicklungsregeln und Workflows sind in [`agents.md`](agents.md) definiert.

**Kurz zusammengefasst:**
- Jedes Tool arbeitet nur in seinem `/tools/<name>/` Ordner
- Branch-Pattern: `tool/<name>/<topic>`
- Alle Änderungen via Pull Request nach `main`
- Automatische CI-Durchsetzung der Pfad-Regeln

---

## 🎯 **Zielgruppen**

### 🧘 **Spirituell Interessierte**
*Veit Lindau-inspirierte Inhalte, Achtsamkeit, persönliche Entwicklung*

### 🥋 **Aktive Senioren**
*Kampfsport-Weisheiten, Disziplin, Lebenserfahrung*

### 📚 **Bildungsbegeisterte**
*Sprachen, Geografie, Wissen, lebenslanges Lernen*

### 🌿 **Gesundheitsbewusste**
*Wellness, Heilung, Balance, natürliche Lebensweise*

---

## 🛠️ **Für Entwickler**

### Repository klonen
```bash
git clone https://github.com/miscarriage87/ARK.git
cd ARK
```

### Als Tool beitragen
1. Lies [`agents.md`](agents.md) vollständig
2. Erstelle Branch: `tool/<dein-tool>/<topic>`
3. Arbeite nur in `/tools/<dein-tool>/`
4. Erstelle Pull Request nach `main`

---

## 📈 **Roadmap**

- [ ] **Phase 1**: Grundlegende Web-App mit täglichen Sprüchen
- [ ] **Phase 2**: KI-Integration für Content-Generierung  
- [ ] **Phase 3**: Personalisierungs-System und Profile
- [ ] **Phase 4**: Mobile PWA mit Notifications
- [ ] **Phase 5**: Erweiterte Features und Analytics

---

## 🤝 **Beitragen**

ARK lebt von der Zusammenarbeit verschiedener KI-Tools. Jedes Tool bringt seine Stärken ein:

- **Backend-Entwicklung** → Antigravity
- **Content & NLP** → ChatGPT  
- **Frontend & UX** → KIRO
- **Integration** → Code-Agent

Siehe [`agents.md`](agents.md) für detaillierte Entwicklungsregeln.

---

## 📄 **Lizenz**

*Lizenz wird noch definiert*

---

<div align="center">

**ARK** - *Wo Tradition auf Innovation trifft* 📅✨

</div>
