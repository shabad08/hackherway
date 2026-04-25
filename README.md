# 🌾 KisanArth — India's Agri-Economics Intelligence Platform

Full-stack web application to help Indian farmers check crop prices, calculate profit/loss, and get crop intelligence (soil, weather, regional data).

---

## 📁 Project Structure

```
kisanArth/
├── server.js              ← Express backend (main entry point)
├── package.json           ← Node.js dependencies
├── data/
│   ├── crops.json         ← All crop data (prices, MSP, agronomy, mandis)
│   ├── trade.json         ← Import/export trade statistics
└── public/
    └── index.html         ← Frontend (served by Express)
```

---

## 🚀 Setup & Run

### 1. Install Node.js
Download from https://nodejs.org (v16 or newer)

### 2. Install dependencies
```bash
cd kisanArth
npm install
```

### 3. Start the server
```bash
npm start
# or for auto-reload during development:
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | API health check |
| GET | `/crops` | List all crops (summary) |
| GET | `/crops/:id` | Full crop data (wheat, rice, maize, cotton, sugarcane, gram, mustard) |
| GET | `/crops/:id/agronomy` | Soil, weather, region, growing tips |
| GET | `/crops/:id/mandis` | Mandi prices for a crop (optional `?state=Punjab`) |
| GET | `/prices` | All mandi prices (optional `?crop=wheat&state=punjab`) |
| POST | `/calculator` | Profit/Loss calculation |
| GET | `/trade` | Import/export statistics |
| GET | `/production` | Crop production statistics |
| GET | `/search` | Search crops by soil/region/season (`?q=loamy`, `?season=Rabi`, `?region=punjab`) |

---

## 📡 API Usage Examples

### Get wheat agronomy data
```bash
curl http://localhost:3000/api/crops/wheat/agronomy
```
**Response:**
```json
{
  "success": true,
  "data": {
    "crop": "Wheat",
    "soilType": ["Loamy", "Clay Loam", "Sandy Loam"],
    "soilPH": "6.0–7.5",
    "climate": "Cool and dry",
    "temperature": "10–25°C",
    "bestRegions": ["North India", "Central India", "Indo-Gangetic Plains"],
    "weatherRisk": ["Frost during flowering", "..."],
    "growingTips": "Sow early varieties in October..."
  }
}
```

### Profit/Loss Calculator
```bash
curl -X POST http://localhost:3000/api/calculator \
  -H "Content-Type: application/json" \
  -d '{"cropId":"wheat","qty":100,"cost":180000,"sellPrice":2275}'
```
**Response:**
```json
{
  "success": true,
  "data": {
    "revenue": 227500,
    "totalCost": 180000,
    "profitLoss": 47500,
    "breakEven": 1800,
    "marginPct": 20.88,
    "insight": {
      "type": "profit",
      "title": "Profitable zone",
      "text": "Selling price is 26% above break-even. Good profit."
    },
    "cropContext": {
      "name": "Wheat",
      "msp": 2275,
      "recommendation": "Selling price is at or above MSP. Good window."
    }
  }
}
```

### Search crops by soil type
```bash
curl "http://localhost:3000/api/search?q=loamy"
```

### Get mandi prices for a state
```bash
curl "http://localhost:3000/api/prices?state=Punjab"
```

---

## 🌱 Crop Data Covered

| Crop | Season | Key States |
|------|--------|------------|
| Wheat | Rabi | Punjab, Haryana, UP, MP, Rajasthan |
| Rice | Kharif | WB, UP, Punjab, AP, Odisha |
| Maize | Kharif/Rabi | Karnataka, MP, Rajasthan, Bihar |
| Cotton | Kharif | Gujarat, Maharashtra, Telangana |
| Sugarcane | Annual | UP, Maharashtra, Karnataka, TN |
| Gram (Chana) | Rabi | MP, Rajasthan, Maharashtra, UP |
| Mustard | Rabi | Rajasthan, Haryana, UP, MP |

---

## 🔧 Extending the App

### Add a new crop
Edit `data/crops.json` — add a new object following the existing schema. The API and frontend will pick it up automatically.

### Add more mandis
Each crop has a `"mandis"` array. Add entries with `market`, `state`, `min`, `max`, `modal` fields.

### Connect to real price APIs
Replace the JSON file loading in `server.js` with live API calls to:
- **Agmarknet**: https://agmarknet.gov.in (government mandi data)
- **e-NAM**: https://enam.gov.in/web/
- **data.gov.in**: https://data.gov.in (open government datasets)

### Deploy to production
```bash
# Using Railway / Render / Fly.io
# Set environment variable: PORT=3000
# Start command: node server.js
```

---

## 📝 Tech Stack

- **Backend**: Node.js + Express
- **Data**: JSON flat files (easy to swap with MongoDB/PostgreSQL)
- **Frontend**: Vanilla HTML/CSS/JS (your existing design)
- **CORS**: Enabled for all origins (restrict in production)

---

*Built for KisanArth — empowering Indian farmers with data.*
