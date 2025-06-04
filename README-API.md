# Gestion réelle des créneaux - Documentation

## Objectif
Ce document explique comment le système de réservation a été amélioré pour supporter une gestion réelle des créneaux via une API backend, tout en conservant la simulation côté client actuelle.

## Fonctionnalités ajoutées

1. **Configuration API**
   - Ajout d'un objet `API_CONFIG` permettant de configurer l'API (URL, endpoints)
   - Option `enabled` pour activer/désactiver l'utilisation de l'API

2. **Récupération des créneaux depuis l'API**
   - Fonction `fetchSlotsFromAPI(date)` pour récupérer les créneaux disponibles
   - Fallback automatique sur la simulation locale en cas d'erreur

3. **Réservation via l'API**
   - Fonction `bookSlotViaAPI(date, slot, clientInfo, vehicleInfo)` pour réserver un créneau
   - Gestion des erreurs (créneau déjà pris, problème de connexion)

## Comment utiliser

### Mode simulation (par défaut)
Le système utilise actuellement la simulation locale des créneaux. Aucune action nécessaire.

### Pour activer l'API réelle

1. **Créer un backend**
   - Mettre en place un serveur exposant les endpoints `/slots` et `/book`
   - Le serveur doit respecter les formats JSON attendus par le frontend

2. **Configurer l'API dans le code**
   - Dans `reservation-unified.js`, modifier l'objet `API_CONFIG` :
   ```javascript
   const API_CONFIG = {
       baseUrl: 'http://votre-url-api',
       getSlotsEndpoint: '/slots',
       bookEndpoint: '/book',
       enabled: true  // Mettre à true pour activer
   };
   ```

## Format des données API

### GET /slots?date=YYYY-MM-DD
```json
{
  "date": "2025-06-01",
  "available": ["08:00", "09:00", "10:00", "11:00"],
  "booked": ["14:00", "15:00"]
}
```

### POST /book
**Requête**
```json
{
  "date": "2025-06-01",
  "slot": "09:00",
  "client": {
    "name": "Jean Dupont",
    "phone": "0791234567",
    "email": "jean@exemple.com"
  },
  "vehicle": {
    "plate": "VS 30726",
    "model": "Renault Clio"
  }
}
```

**Réponse (succès)**
```json
{
  "success": true,
  "date": "2025-06-01",
  "slot": "09:00"
}
```

**Réponse (erreur)**
```json
{
  "success": false,
  "error": "Ce créneau est déjà réservé."
}
```

## Exemple de backend (Node.js/Express)

Voici un exemple de code pour créer un backend simple avec Node.js et Express :

```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, 'slots-data.json');

// Helper pour lire/écrire les réservations
function readData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}
function writeData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Créneaux possibles par défaut
const DEFAULT_SLOTS = ['08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00'];
const SATURDAY_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00'];

// GET /slots?date=YYYY-MM-DD
app.get('/slots', (req, res) => {
    const date = req.query.date;
    if (!date) return res.status(400).json({error: 'Date requise'});
    const data = readData();
    const booked = data[date] || [];
    const day = new Date(date).getDay();
    const slots = (day === 6) ? SATURDAY_SLOTS : DEFAULT_SLOTS;
    const available = slots.filter(s => !booked.includes(s));
    res.json({date, available, booked});
});

// POST /book
app.post('/book', (req, res) => {
    const {date, slot, client, vehicle} = req.body;
    if (!date || !slot) return res.status(400).json({error: 'Date et créneau obligatoires'});
    const data = readData();
    if (!data[date]) data[date] = [];
    if (data[date].includes(slot)) {
        return res.status(409).json({error: 'Créneau déjà réservé'});
    }
    data[date].push(slot);
    writeData(data);
    res.json({success: true, date, slot});
});

app.listen(PORT, () => {
    console.log(`Backend démarré sur http://localhost:${PORT}`);
});
```

Pour installer et démarrer ce backend :
```
npm init -y
npm install express cors
node server.js
```
