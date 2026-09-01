/**
 * Undergold Transporte — backend en tiempo real
 * Express sirve la app (public/index.html) y un WebSocket sincroniza el estado
 * compartido entre todos los dispositivos conectados (guías, conductores,
 * proveedores, credenciales, chat y ubicación en vivo).
 *
 * El estado es un único objeto "db" (misma forma que usaba el navegador).
 * - Al conectarse, cada cliente recibe el estado actual.
 * - Cuando un cliente guarda cambios, los envía por WebSocket; el servidor los
 *   persiste en data.json y los reenvía (broadcast) a los demás clientes.
 */
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const DATA_FILE = path.join(__dirname, 'data.json');

let db = {};
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
catch (e) { db = {}; }

let saveTimer = null;
function persist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(db)); }
    catch (e) { console.error('No se pudo guardar data.json:', e.message); }
  }, 200);
}

const app = express();
app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/api/state', (_req, res) => res.json(db));

const server = http.createServer(app);
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') console.error('El puerto ya está en uso. Cierra la otra instancia o cambia PORT.');
  else console.error('Error del servidor:', e.message);
  process.exit(1);
});
const wss = new WebSocketServer({ server });

function broadcast(except) {
  const msg = JSON.stringify({ type: 'state', db });
  wss.clients.forEach((c) => {
    if (c.readyState === 1 && c !== except) {
      try { c.send(msg); } catch (e) {}
    }
  });
}

wss.on('connection', (ws) => {
  // enviar el estado actual al recién llegado
  try { ws.send(JSON.stringify({ type: 'state', db })); } catch (e) {}
  ws.on('message', (raw) => {
    try {
      const m = JSON.parse(raw);
      if (m && m.type === 'state' && m.db && typeof m.db === 'object') {
        db = m.db;
        persist();
        broadcast(ws); // reenviar a los demás dispositivos
      }
    } catch (e) {}
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('Undergold Transporte escuchando en http://localhost:' + PORT);
});
