/**
 * KisanArth — Backend API Server
 * Node.js + Express
 * Run: node server.js
 * API base: http://localhost:3000/api
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Load Data ────────────────────────────────────────────────
const cropsData  = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'crops.json'),   'utf8'));
const tradeData  = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'trade.json'),   'utf8'));
const insightsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'insights.json'), 'utf8'));

// ─── Helper ───────────────────────────────────────────────────
const sendJSON = (res, data, status = 200) =>
  res.status(status).json({ success: true, data, timestamp: new Date().toISOString() });

const sendError = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message, timestamp: new Date().toISOString() });

// ═══════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════

// ── GET /api/health ───────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'KisanArth API running', version: '1.0.0' });
});

// ── GET /api/crops ────────────────────────────────────────────
// Returns summary list of all crops (no agronomy details)
app.get('/api/crops', (req, res) => {
  const summary = cropsData.crops.map(c => ({
    id:         c.id,
    name:       c.name,
    nameHi:     c.nameHi,
    image:      c.image,
    price:      c.price,
    msp:        c.msp,
    unit:       c.unit,
    production: c.production,
    export:     c.export,
    season:     c.season,
    priceVsMSP: c.price >= c.msp ? 'above' : 'below',
    priceDiff:  c.price - c.msp
  }));
  sendJSON(res, summary);
});

// ── GET /api/crops/:id ────────────────────────────────────────
// Returns full data for a single crop including agronomy + mandis
app.get('/api/crops/:id', (req, res) => {
  const crop = cropsData.crops.find(c => c.id === req.params.id.toLowerCase());
  if (!crop) return sendError(res, `Crop '${req.params.id}' not found`, 404);
  sendJSON(res, crop);
});

// ── GET /api/crops/:id/agronomy ───────────────────────────────
// Returns only the agronomy block (soil, weather, region)
app.get('/api/crops/:id/agronomy', (req, res) => {
  const crop = cropsData.crops.find(c => c.id === req.params.id.toLowerCase());
  if (!crop) return sendError(res, `Crop '${req.params.id}' not found`, 404);
  sendJSON(res, {
    crop: crop.name,
    season: crop.season,
    sowingMonths: crop.sowingMonths,
    harvestMonths: crop.harvestMonths,
    ...crop.agronomy
  });
});

// ── GET /api/crops/:id/mandis ─────────────────────────────────
// Returns mandi prices for a specific crop; optional ?state= filter
app.get('/api/crops/:id/mandis', (req, res) => {
  const crop = cropsData.crops.find(c => c.id === req.params.id.toLowerCase());
  if (!crop) return sendError(res, `Crop '${req.params.id}' not found`, 404);

  let mandis = crop.mandis;
  if (req.query.state) {
    mandis = mandis.filter(m =>
      m.state.toLowerCase().includes(req.query.state.toLowerCase())
    );
  }
  sendJSON(res, { crop: crop.name, msp: crop.msp, mandis });
});

// ── GET /api/prices ───────────────────────────────────────────
// Returns flat price table across all crops (like the Market Prices tab)
// Optional filters: ?crop=wheat&state=punjab
app.get('/api/prices', (req, res) => {
  let rows = [];
  cropsData.crops.forEach(c => {
    c.mandis.forEach(m => {
      rows.push({
        crop:       c.name,
        cropId:     c.id,
        market:     m.market,
        state:      m.state,
        min:        m.min,
        max:        m.max,
        modal:      m.modal,
        msp:        c.msp,
        vsMSP:      m.modal - c.msp,
        vsMSPLabel: m.modal >= c.msp
          ? `+₹${m.modal - c.msp}`
          : `-₹${c.msp - m.modal}`,
        status:     m.modal >= c.msp ? 'above' : 'below'
      });
    });
  });

  if (req.query.crop) {
    rows = rows.filter(r =>
      r.cropId.toLowerCase() === req.query.crop.toLowerCase() ||
      r.crop.toLowerCase().includes(req.query.crop.toLowerCase())
    );
  }
  if (req.query.state) {
    rows = rows.filter(r =>
      r.state.toLowerCase().includes(req.query.state.toLowerCase())
    );
  }

  sendJSON(res, rows);
});

// ── POST /api/calculator ──────────────────────────────────────
// Profit / Loss calculation
// Body: { cropId, qty (quintals), cost (INR), sellPrice (INR/q) }
app.post('/api/calculator', (req, res) => {
  const { cropId, qty, cost, sellPrice } = req.body;

  if (!qty || !cost || !sellPrice) {
    return sendError(res, 'qty, cost, and sellPrice are required');
  }

  const qtyNum   = parseFloat(qty);
  const costNum  = parseFloat(cost);
  const spNum    = parseFloat(sellPrice);

  const revenue    = qtyNum * spNum;
  const profitLoss = revenue - costNum;
  const breakEven  = qtyNum > 0 ? costNum / qtyNum : 0;
  const margin     = revenue > 0 ? (profitLoss / revenue) * 100 : 0;

  // Optional: attach crop context
  let cropContext = null;
  if (cropId) {
    const crop = cropsData.crops.find(c => c.id === cropId.toLowerCase());
    if (crop) {
      cropContext = {
        name: crop.name,
        msp: crop.msp,
        currentPrice: crop.price,
        recommendation: spNum >= crop.msp
          ? 'Selling price is at or above MSP. Good window.'
          : `Selling below MSP (₹${crop.msp}/q). Consider selling to government procurement.`
      };
    }
  }

  let insightType, insightTitle, insightText;
  if (profitLoss > 0 && spNum > breakEven * 1.1) {
    insightType  = 'profit';
    insightTitle = 'Profitable zone';
    insightText  = `Selling price is ${Math.round((spNum / breakEven - 1) * 100)}% above break-even. Good profit. Consider selling now.`;
  } else if (profitLoss >= 0) {
    insightType  = 'neutral';
    insightTitle = 'Low margin — proceed with caution';
    insightText  = 'Above break-even but margins are thin. Explore reducing input costs next season.';
  } else {
    insightType  = 'loss';
    insightTitle = 'Loss alert';
    insightText  = `Selling price is below break-even of ₹${Math.round(breakEven)}/q. Consider MSP scheme instead.`;
  }

  sendJSON(res, {
    inputs:      { qty: qtyNum, cost: costNum, sellPrice: spNum },
    revenue:     Math.round(revenue),
    totalCost:   Math.round(costNum),
    profitLoss:  Math.round(profitLoss),
    breakEven:   Math.round(breakEven),
    marginPct:   parseFloat(margin.toFixed(2)),
    insight:     { type: insightType, title: insightTitle, text: insightText },
    cropContext
  });
});

// ── GET /api/trade ────────────────────────────────────────────
// Returns full trade/export/import data
app.get('/api/trade', (req, res) => {
  sendJSON(res, tradeData);
});

// ── GET /api/insights ─────────────────────────────────────────
// Returns smart insights; optional ?crop= filter
app.get('/api/insights', (req, res) => {
  let insights = insightsData.insights;
  if (req.query.crop) {
    insights = insights.filter(i =>
      i.crop.toLowerCase() === req.query.crop.toLowerCase()
    );
  }
  if (req.query.type) {
    insights = insights.filter(i => i.type === req.query.type);
  }
  sendJSON(res, insights);
});

// ── GET /api/production ───────────────────────────────────────
// Returns production stats for all crops
app.get('/api/production', (req, res) => {
  const production = cropsData.crops.map(c => ({
    crop:         c.name,
    id:           c.id,
    productionMT: c.productionMT,
    season:       c.season,
    states:       c.states
  }));
  sendJSON(res, { crops: production, history: tradeData.productionHistory });
});

// ── GET /api/search ───────────────────────────────────────────
// Search crops by soil, region, season, or weather
// ?q=loamy&field=soil | ?region=punjab | ?season=Rabi
app.get('/api/search', (req, res) => {
  const { q, region, season } = req.query;
  let results = cropsData.crops;

  if (season) {
    results = results.filter(c =>
      c.season.toLowerCase().includes(season.toLowerCase())
    );
  }
  if (region) {
    results = results.filter(c =>
      c.agronomy.bestRegions.some(r =>
        r.toLowerCase().includes(region.toLowerCase())
      )
    );
  }
  if (q) {
    const ql = q.toLowerCase();
    results = results.filter(c =>
      c.agronomy.soilType.some(s => s.toLowerCase().includes(ql)) ||
      c.agronomy.bestRegions.some(r => r.toLowerCase().includes(ql)) ||
      c.agronomy.climate.toLowerCase().includes(ql) ||
      c.name.toLowerCase().includes(ql)
    );
  }

  sendJSON(res, results.map(c => ({
    id:          c.id,
    name:        c.name,
    season:      c.season,
    soilType:    c.agronomy.soilType,
    bestRegions: c.agronomy.bestRegions,
    climate:     c.agronomy.climate,
    temperature: c.agronomy.temperature,
    price:       c.price,
    msp:         c.msp
  })));
});

// ─── Serve frontend for any other route ───────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌾  KisanArth API running at http://localhost:${PORT}`);
  console.log(`📡  Endpoints:`);
  console.log(`    GET  /api/health`);
  console.log(`    GET  /api/crops`);
  console.log(`    GET  /api/crops/:id`);
  console.log(`    GET  /api/crops/:id/agronomy`);
  console.log(`    GET  /api/crops/:id/mandis`);
  console.log(`    GET  /api/prices`);
  console.log(`    POST /api/calculator`);
  console.log(`    GET  /api/trade`);
  console.log(`    GET  /api/insights`);
  console.log(`    GET  /api/production`);
  console.log(`    GET  /api/search\n`);
});
