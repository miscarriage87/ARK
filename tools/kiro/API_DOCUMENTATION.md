# 📚 ARK API Dokumentation

## Basis-URL
```
http://localhost:8000
```

## Authentifizierung
Aktuell keine Authentifizierung erforderlich (Entwicklungsversion).

## Endpunkte

### 🏠 Allgemein

#### GET /
Basis-API-Informationen
```json
{
  "message": "ARK Digitaler Kalender API",
  "status": "läuft",
  "version": "1.0.0",
  "endpoints": [...]
}
```

#### GET /health
Gesundheitscheck der API
```json
{
  "status": "gesund",
  "timestamp": "2024-12-21T10:00:00.000Z",
  "uptime": 3600
}
```

### 📅 Sprüche

#### GET /api/quotes/today
Heutiger Spruch
```json
{
  "id": 1,
  "text": "Die Zukunft gehört denen, die an die Schönheit ihrer Träume glauben.",
  "author": "Eleanor Roosevelt",
  "theme": "Träume",
  "date": "2024-12-21"
}
```

#### GET /api/quotes
Alle Sprüche mit Pagination
**Parameter:**
- `limit` (optional): Anzahl der Ergebnisse (Standard: 10)
- `offset` (optional): Startposition (Standard: 0)
- `search` (optional): Suchbegriff

```json
{
  "quotes": [...],
  "total": 10,
  "limit": 10,
  "offset": 0,
  "hasMore": false
}
```

#### GET /api/quotes/:id
Spezifischer Spruch nach ID
```json
{
  "id": 1,
  "text": "...",
  "author": "...",
  "theme": "...",
  "date": "2024-12-21"
}
```

#### POST /api/quotes/:id/feedback
Feedback für einen Spruch senden
**Body:**
```json
{
  "rating": "like|neutral|dislike",
  "comment": "Optional"
}
```

**Response:**
```json
{
  "message": "Feedback erfolgreich erhalten",
  "quote_id": 1,
  "feedback": {...},
  "timestamp": "2024-12-21T10:00:00.000Z"
}
```

### 🎨 Themen

#### GET /api/themes
Alle verfügbaren Themen
```json
{
  "themes": [
    {
      "name": "Träume",
      "count": 2
    },
    {
      "name": "Hoffnung", 
      "count": 1
    }
  ]
}
```

#### GET /api/quotes/theme/:theme
Sprüche nach Thema
```json
{
  "quotes": [...],
  "theme": "Träume",
  "count": 2
}
```

### 👤 Benutzer

#### GET /api/users/profile
Benutzerprofil abrufen
```json
{
  "id": 1,
  "name": "ARK Benutzer",
  "preferences": {
    "themes": ["Träume", "Hoffnung"],
    "quote_length": "medium",
    "notification_time": "09:00",
    "notifications_enabled": true
  },
  "stats": {
    "quotes_viewed": 42,
    "favorite_themes": ["Träume"],
    "streak_days": 7
  }
}
```

#### POST /api/users/profile
Profil aktualisieren
**Body:**
```json
{
  "name": "Neuer Name",
  "preferences": {
    "themes": ["Motivation"],
    "notification_time": "08:00"
  }
}
```

### 🤖 KI-Generierung

#### POST /api/quotes/generate
Neuen Spruch generieren (Mock)
**Body:**
```json
{
  "theme": "Motivation",
  "mood": "positiv",
  "length": "mittel"
}
```

**Response:**
```json
{
  "message": "Spruch erfolgreich generiert",
  "quote": {
    "id": 11,
    "text": "...",
    "author": "KI-Assistent",
    "theme": "Motivation",
    "generated": true
  }
}
```

### 📦 Archiv

#### GET /api/archive
Archiv-Sprüche
**Parameter:**
- `year` (optional): Jahr filtern
- `month` (optional): Monat filtern (1-12)

```json
{
  "quotes": [...],
  "year": 2024,
  "month": 12,
  "total": 5
}
```

## Fehler-Codes

- `200` - Erfolg
- `404` - Spruch/Endpunkt nicht gefunden
- `500` - Server-Fehler

## Beispiel-Requests

### cURL
```bash
# Heutiger Spruch
curl http://localhost:8000/api/quotes/today

# Feedback senden
curl -X POST http://localhost:8000/api/quotes/1/feedback \
  -H "Content-Type: application/json" \
  -d '{"rating": "like"}'
```

### JavaScript
```javascript
// Heutiger Spruch
const response = await fetch('/api/quotes/today');
const quote = await response.json();

// Feedback senden
await fetch(`/api/quotes/${quoteId}/feedback`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rating: 'like' })
});
```

---

**Vollständige API läuft auf: http://localhost:8000** 🚀