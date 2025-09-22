const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(express.static('public'));

// Estado en memoria
const aerocams = new Map();
const requests = new Map();
const positions = new Map();

const toA = a => ({ id: a.id, name: a.name, lat: a.lat, lon: a.lon, radius: a.radius, online: a.online, updatedAt: a.updatedAt });
const toR = r => ({ id: r.id, type: r.type, mode: r.mode, status: r.status, user: r.user, when: r.when, location: r.location, path: r.path, acceptedBy: r.acceptedBy || null });
const toP = p => ({ clientKey: p.clientKey, role: p.role, id: p.id, lat: p.lat, lon: p.lon, radius: p.radius, updatedAt: p.updatedAt });

app.post('/api/aerocam/upsert', (req, res) => {
  const { id, name, lat, lon, radius, online } = req.body || {};
  if (!id) return res.status(400).json({ error: 'id requerido' });
  const item = aerocams.get(id) || { id };
  item.name = name ?? item.name ?? 'AeroCam';
  item.lat = lat ?? item.lat ?? 0;
  item.lon = lon ?? item.lon ?? 0;
  item.radius = Number(radius ?? item.radius ?? 800);
  item.online = online ?? item.online ?? true;
  item.updatedAt = Date.now();
  aerocams.set(id, item);

  positions.set(id, {
    clientKey: id,
    role: 'AEROCAM',
    id,
    lat: item.lat,
    lon: item.lon,
    radius: item.radius,
    updatedAt: item.updatedAt
  });

  io.emit('aerocams:update', Array.from(aerocams.values()).map(toA));
  io.emit('positions:update', Array.from(positions.values()).map(toP));
  res.json(toA(item));
});

app.get('/api/aerocam/list', (_req, res) => {
  res.json(Array.from(aerocams.values()).map(toA));
});

app.post('/api/request/create', (req, res) => {
  const { type, mode, user, when, location, path } = req.body || {};
  if (!type || !mode) return res.status(400).json({ error: 'type/mode requeridos' });
  const id = uuidv4();
  const item = {
    id,
    type,
    mode,
    status: type === 'inmediata' ? 'pendiente' : 'programada',
    user: user || { name: 'Visionario' },
    when: when || null,
    location: location || null,
    path: path || null,
    acceptedBy: null
  };
  requests.set(id, item);
  io.emit('requests:update', Array.from(requests.values()).map(toR));
  res.json(toR(item));
});

app.get('/api/request/list', (_req, res) => {
  res.json(Array.from(requests.values()).map(toR));
});

app.post('/api/request/:id/accept', (req, res) => {
  const r = requests.get(req.params.id);
  if (!r) return res.status(404).json({ error: 'request no existe' });
  if (r.status !== 'pendiente') return res.status(400).json({ error: 'request no disponible' });
  const { aerocamId } = req.body || {};
  if (!aerocamId) return res.status(400).json({ error: 'aerocamId requerido' });

  r.status = 'aceptada';
  r.acceptedBy = aerocamId;
  requests.set(r.id, r);
  io.emit('requests:update', Array.from(requests.values()).map(toR));
  io.emit('request:accepted', toR(r));
  res.json(toR(r));
});

app.get('/api/positions', (_req, res) => {
  res.json(Array.from(positions.values()).map(toP));
});

io.on('connection', (socket) => {
  socket.emit('aerocams:update', Array.from(aerocams.values()).map(toA));
  socket.emit('requests:update', Array.from(requests.values()).map(toR));
  socket.emit('positions:update', Array.from(positions.values()).map(toP));

  socket.on('join', ({ room, role }) => {
    if (room) socket.join(room);
    socket.to(room).emit('peer-joined', { role, peerId: socket.id });
  });

  socket.on('offer', ({ room, sdp }) => { socket.to(room).emit('offer', { sdp }); });
  socket.on('answer', ({ room, sdp }) => { socket.to(room).emit('answer', { sdp }); });
  socket.on('ice', ({ room, candidate }) => { socket.to(room).emit('ice', { candidate }); });

  socket.on('position:update', (payload) => {
    try {
      const clientKey = payload.clientKey || payload.id || payload.clientId || socket.id;
      const item = {
        clientKey,
        role: payload.role || 'UNKNOWN',
        id: payload.id || clientKey,
        lat: Number(payload.lat) || 0,
        lon: Number(payload.lon) || 0,
        radius: payload.radius ? Number(payload.radius) : undefined,
        updatedAt: Date.now()
      };
      positions.set(clientKey, item);

      if (item.role === 'AEROCAM') {
        const ac = aerocams.get(item.id) || { id: item.id };
        ac.name = ac.name ?? item.id;
        ac.lat = item.lat;
        ac.lon = item.lon;
        ac.radius = item.radius ?? ac.radius ?? 800;
        ac.online = true;
        ac.updatedAt = Date.now();
        aerocams.set(ac.id, ac);
        io.emit('aerocams:update', Array.from(aerocams.values()).map(toA));
      }

      io.emit('positions:update', Array.from(positions.values()).map(toP));
    } catch (e) {
      console.error('position:update error', e);
    }
  });

  socket.on('position:clear', ({ clientKey }) => {
    if (clientKey && positions.has(clientKey)) {
      positions.delete(clientKey);
      io.emit('positions:update', Array.from(positions.values()).map(toP));
    }
  });

  socket.on('disconnect', () => {
    const toRemove = [];
    positions.forEach((v, k) => {
      if (k === socket.id || v.clientKey === socket.id) toRemove.push(k);
    });
    toRemove.forEach(k => positions.delete(k));

    aerocams.forEach((ac, acId) => {
      if (acId === socket.id) {
        ac.online = false;
        aerocams.set(acId, ac);
      }
    });

    io.emit('positions:update', Array.from(positions.values()).map(toP));
    io.emit('aerocams:update', Array.from(aerocams.values()).map(toA));
    console.log('Cliente desconectado', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Servidor AeroCam en http://localhost:' + PORT));
