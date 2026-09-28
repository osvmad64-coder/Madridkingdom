// Madrid Kingdom · servidor multijugador
// El servidor es la única fuente de verdad: ejecuta el MISMO motor del juego (index.html)
// dentro de una instancia aislada por sala, valida cada acción y envía el estado a todos los teléfonos.
// Extras: chat por partida, guardado en disco (partidas que duran días) y notificaciones push de turno.
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { JSDOM } = require('jsdom');
const webpush = require('web-push');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const GAME_FILE = fs.existsSync(path.join(ROOT, 'index.html')) ? path.join(ROOT, 'index.html') : path.join(ROOT, 'public', 'index.html');
const GAME_HTML = fs.readFileSync(GAME_FILE, 'utf8');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
fs.mkdirSync(ROOMS_DIR, { recursive: true });

const HUMAN_COLORS = ['#3f7f52', '#2f6fb5', '#b23a3a', '#c98b1f', '#7a4bb0'];
const MAX_PLAYERS = 5;
const HOST_HANDOFF_MS = 30_000;                   // anfitrión desconectado 30 s → otro jugador conectado toma el control
const SKIP_OPTIONS = { live: Number(process.env.SKIP_LIVE_MS) || 2 * 60_000, h12: 12 * 60 * 60_000, none: 0 }; // límite de turno si quien juega no está
const ROOM_TTL_MS = Number(process.env.ROOM_TTL_MS) || 14 * 24 * 60 * 60_000; // salas sin actividad 14 días → se borran
const PUSH_DELAY_MS = Number(process.env.PUSH_DELAY_MS) || 20_000; // si está conectado al empezar su turno, esperar antes de avisar
const MG_MIN_MS = Number(process.env.MG_MIN_MS) || 9_000;          // un minijuego dura 10 s: no se cobra antes de este tiempo
const CHAT_MAX = 100, CHAT_LEN = 200;
const DEFAULT_SETTINGS = { ai: 0, diff: 'media', skip: 'h12', goal: 'castles' }; // castillos = modo predeterminado de "Mismo teléfono"

// ---------- Notificaciones push (llaves VAPID: variables de entorno o se generan y guardan solas) ----------
function loadVapid() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  const f = path.join(DATA_DIR, 'vapid.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(f, JSON.stringify(keys));
  return keys;
}
const VAPID = loadVapid();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:madridkingdom.juego@gmail.com', VAPID.publicKey, VAPID.privateKey);

const app = express();
const STATIC = ['index.html', 'sw.js', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
app.get('/', (_req, res) => res.sendFile(GAME_FILE));
STATIC.forEach(name => app.get('/' + name, (_req, res) => {
  const f = fs.existsSync(path.join(ROOT, name)) ? path.join(ROOT, name) : path.join(ROOT, 'public', name);
  if (!fs.existsSync(f)) return res.status(404).end();
  if (name === 'sw.js') res.set('Service-Worker-Allowed', '/').set('Cache-Control', 'no-cache');
  if (name === 'index.html') res.set('Cache-Control', 'no-cache');
  res.sendFile(f);
}));
app.get('/vapidPublicKey', (_req, res) => res.json({ key: VAPID.publicKey }));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10_000, pingTimeout: 20_000, cors: { origin: '*' } });

const rooms = new Map();

function makeCode() {
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let c;
  do { c = Array.from({ length: 5 }, () => A[crypto.randomInt(A.length)]).join(''); } while (rooms.has(c));
  return c;
}
function cleanName(n) { return String(n || '').replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
function cleanText(t) { return String(t || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, CHAT_LEN); }
function createEngine() {
  const dom = new JSDOM(GAME_HTML, { runScripts: 'dangerously', url: 'http://localhost/', beforeParse(w) { w.__MK_SERVER = true; } });
  const api = dom.window.__MKAPI;
  if (!api) throw new Error('No se pudo iniciar el motor del juego');
  return { api, dom };
}
// Motor de referencia: da al servidor los catálogos oficiales del juego (modos, colores, escudos, minijuegos)
// para validar sin copiar listas del index.html.
const REF = createEngine().api;
const plain = o => JSON.parse(JSON.stringify(o));
function publicRoom(room) {
  return {
    code: room.code, status: room.status, hostId: room.hostId, settings: room.settings,
    players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color, crest: p.crest || null, cls: p.cls, hid: p.hid, connected: p.connected, host: p.id === room.hostId, push: !!p.push })),
  };
}

// ---------- Guardado en disco ----------
const saveTimers = new Map();
function roomFile(code) { return path.join(ROOMS_DIR, code + '.json'); }
function saveRoomNow(room) {
  try {
    const data = {
      code: room.code, status: room.status, hostId: room.hostId, settings: room.settings, touched: room.touched,
      turnKey: room.turnKey, turnStartedAt: room.turnStartedAt, chat: room.chat,
      players: room.players.map(p => ({ id: p.id, token: p.token, name: p.name, color: p.color, crest: p.crest || null, cls: p.cls, hid: p.hid, kicked: !!p.kicked, push: p.push || null, lastSeen: p.lastSeen, notifiedKey: p.notifiedKey || null })),
      state: room.engine ? room.engine.api.mpSnapshot() : null,
    };
    const tmp = roomFile(room.code) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, roomFile(room.code));
  } catch (e) { console.error('No se pudo guardar la sala', room.code, e.message); }
}
function saveRoom(room) {
  if (saveTimers.has(room.code)) return;
  saveTimers.set(room.code, setTimeout(() => { saveTimers.delete(room.code); if (rooms.get(room.code) === room) saveRoomNow(room); }, 800));
}
function deleteRoom(room) {
  rooms.delete(room.code);
  clearTimeout(saveTimers.get(room.code)); saveTimers.delete(room.code);
  try { fs.unlinkSync(roomFile(room.code)); } catch (e) {}
  if (room.engine) try { room.engine.dom.window.close(); } catch (e) {}
}
function loadRooms() {
  for (const f of fs.readdirSync(ROOMS_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const d = JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, f), 'utf8'));
      const room = { code: d.code, status: d.status, hostId: d.hostId, settings: Object.assign({}, DEFAULT_SETTINGS, d.settings),
        touched: d.touched || Date.now(), turnKey: d.turnKey || null, turnStartedAt: d.turnStartedAt || Date.now(), chat: d.chat || [], engine: null,
        players: d.players.map(p => Object.assign(p, { crest: p.crest || plain(REF.randomCrest()), connected: false, socketId: null, lastSeen: p.lastSeen || Date.now() })) };
      if (d.state) { room.engine = createEngine(); room.engine.api.mpRestore(d.state); }
      rooms.set(room.code, room);
    } catch (e) { console.error('No se pudo cargar', f, e.message); }
  }
  if (rooms.size) console.log(`Partidas recuperadas del disco: ${rooms.size}`);
}

// ---------- Notificaciones ----------
async function sendPush(room, player, payload) {
  if (!player.push) return false;
  try {
    await webpush.sendNotification(player.push, JSON.stringify(payload), { TTL: 12 * 60 * 60, urgency: 'high' });
    return true;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) { player.push = null; saveRoom(room); }
    else console.error('Push falló', e.statusCode || e.message);
    return false;
  }
}
function notifyTurnIfAway(room, reason) {
  if (!room.engine || room.status !== 'playing') return;
  const S = room.engine.api.S;
  if (S.over) return;
  const hid = room.engine.api.currentHid();
  const player = room.players.find(p => p.hid === hid && !p.kicked);
  if (!player || !player.push || player.notifiedKey === room.turnKey) return;
  if (player.connected && reason !== 'force') return;
  const seat = S.mp.seats[hid];
  const ap = seat ? seat.ap : 0;
  player.notifiedKey = room.turnKey;
  saveRoom(room);
  sendPush(room, player, {
    title: `${player.name} — Tu turno`,
    body: `Es tu turno de jugar en la sala ${room.code}. Tienes ${ap} puntos de acción.`,
    url: `/?sala=${room.code}`, tag: `turno-${room.code}`,
  });
}
// Se llama cada vez que cambia el estado: detecta el inicio de un turno nuevo.
function trackTurn(room) {
  if (!room.engine) return;
  const S = room.engine.api.S;
  const key = S.over ? 'over' : `${S.turn}:${room.engine.api.currentHid()}`;
  if (key === room.turnKey) return;
  room.turnKey = key; room.turnStartedAt = Date.now();
  if (S.over) return;
  const code = room.code;
  notifyTurnIfAway(room);                                   // si no está conectado: aviso inmediato
  setTimeout(() => { const r = rooms.get(code); if (r && r.turnKey === key) { const pl = r.players.find(p => p.hid === r.engine.api.currentHid()); if (pl && !pl.connected) notifyTurnIfAway(r); } }, PUSH_DELAY_MS); // si cerró la app poco después
}

// ---------- Envío de estado ----------
function sendRoom(room) { io.to(room.code).emit('room', publicRoom(room)); saveRoom(room); }
function flushOutbox(room) {
  if (!room.engine) return;
  for (const m of room.engine.api.drainOutbox()) {
    const msg = { icon: m.icon, text: m.text, type: m.type };
    if (m.to === '*') io.to(room.code).emit('toast', msg);
    else { const p = room.players.find(x => x.hid === m.to); if (p && p.socketId) io.to(p.socketId).emit('toast', msg); }
  }
}
function sendState(room, onlySocket) {
  if (!room.engine) return;
  const payload = { state: room.engine.api.mpSnapshot(), room: publicRoom(room) };
  if (onlySocket) io.to(onlySocket).emit('state', payload); else io.to(room.code).emit('state', payload);
  if (!onlySocket) flushOutbox(room);
  if (room.engine.api.S.over && room.status !== 'over') { room.status = 'over'; sendRoom(room); }
  trackTurn(room);
  saveRoom(room);
}
function ctxOf(socket) {
  const room = rooms.get(socket.data.code);
  if (!room) return {};
  const player = room.players.find(p => p.id === socket.data.pid);
  return { room, player };
}
function attach(socket, room, player) {
  player.socketId = socket.id; player.connected = true; player.lastSeen = Date.now();
  socket.data.code = room.code; socket.data.pid = player.id;
  socket.join(room.code);
  room.touched = Date.now();
  socket.emit('chatHistory', room.chat.slice(-CHAT_MAX));
}
function newPlayer(name, room) {
  const used = new Set(room ? room.players.map(p => p.color) : []);
  return { id: crypto.randomBytes(4).toString('hex'), token: crypto.randomBytes(16).toString('hex'), name,
    color: HUMAN_COLORS.find(c => !used.has(c)) || HUMAN_COLORS[0], crest: plain(REF.randomCrest()), cls: 'guerrero', hid: null, connected: true, socketId: null, lastSeen: Date.now(), push: null, chatTimes: [] };
}

io.on('connection', socket => {
  const reply = (ack, data) => { if (typeof ack === 'function') ack(data); };

  socket.on('create', ({ name } = {}, ack) => {
    name = cleanName(name);
    if (!name) return reply(ack, { ok: false, error: 'Escribe un nombre.' });
    const code = makeCode();
    const room = { code, status: 'lobby', players: [], hostId: null, settings: Object.assign({}, DEFAULT_SETTINGS), engine: null, touched: Date.now(), chat: [], turnKey: null, turnStartedAt: Date.now() };
    const p = newPlayer(name, room);
    room.players.push(p); room.hostId = p.id;
    rooms.set(code, room);
    attach(socket, room, p);
    reply(ack, { ok: true, code, token: p.token, id: p.id });
    sendRoom(room);
  });

  socket.on('join', ({ code, name } = {}, ack) => {
    name = cleanName(name); code = String(code || '').toUpperCase().trim();
    const room = rooms.get(code);
    if (!name) return reply(ack, { ok: false, error: 'Escribe un nombre.' });
    if (!room) return reply(ack, { ok: false, error: 'No existe una partida con ese código.' });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'Esa partida ya comenzó. Si ya estabas dentro, vuelve a abrir el juego desde el mismo teléfono.' });
    if (room.players.length >= MAX_PLAYERS) return reply(ack, { ok: false, error: 'La sala está llena (máximo 5 jugadores).' });
    if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return reply(ack, { ok: false, error: 'Ese nombre ya está en la sala. Elige otro.' });
    const p = newPlayer(name, room);
    room.players.push(p);
    const maxAi = Math.max(0, MAX_PLAYERS - room.players.length);
    if (room.settings.ai > maxAi) room.settings.ai = maxAi;
    attach(socket, room, p);
    reply(ack, { ok: true, code, token: p.token, id: p.id });
    sendRoom(room);
  });

  socket.on('rejoin', ({ code, token } = {}, ack) => {
    const room = rooms.get(String(code || '').toUpperCase());
    const player = room && room.players.find(p => p.token === token && !p.kicked);
    if (!room || !player) return reply(ack, { ok: false, error: 'Esa partida ya no está disponible.' });
    attach(socket, room, player);
    reply(ack, { ok: true, id: player.id, code: room.code, status: room.status });
    sendRoom(room);
    if (room.engine) sendState(room);
  });

  // Recuperar tu lugar con el código + la clave (útil al pasar de Safari a la app instalada en iPhone)
  socket.on('reclaim', ({ code, pin } = {}, ack) => {
    socket.data.reclaimTries = (socket.data.reclaimTries || 0) + 1;
    if (socket.data.reclaimTries > 6) return reply(ack, { ok: false, error: 'Demasiados intentos. Cierra y vuelve a abrir el juego.' });
    const room = rooms.get(String(code || '').toUpperCase().trim());
    pin = String(pin || '').toUpperCase().trim();
    const player = room && pin.length === 6 && room.players.find(p => !p.kicked && p.token.slice(0, 6).toUpperCase() === pin);
    if (!room || !player) return reply(ack, { ok: false, error: 'Código o clave incorrectos.' });
    attach(socket, room, player);
    reply(ack, { ok: true, id: player.id, code: room.code, token: player.token, name: player.name, status: room.status });
    sendRoom(room);
    if (room.engine) sendState(room);
  });

  socket.on('setClass', ({ cls } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || room.status !== 'lobby') return reply(ack, { ok: false });
    if (!['guerrero', 'mago', 'picaro'].includes(cls)) return reply(ack, { ok: false, error: 'Clase inválida.' });
    player.cls = cls; sendRoom(room); reply(ack, { ok: true });
  });

  socket.on('settings', ({ ai, diff, skip, goal } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || room.status !== 'lobby' || player.id !== room.hostId) return reply(ack, { ok: false, error: 'Solo el anfitrión puede cambiar esto.' });
    const maxAi = Math.max(0, MAX_PLAYERS - room.players.length);
    if (ai !== undefined) room.settings.ai = Math.max(0, Math.min(maxAi, Number.isInteger(ai) ? ai : 0));
    if (diff !== undefined) room.settings.diff = ['facil', 'media', 'dificil'].includes(diff) ? diff : 'media';
    if (skip !== undefined && SKIP_OPTIONS[skip] !== undefined) room.settings.skip = skip;
    if (goal !== undefined && REF.goals.includes(goal)) room.settings.goal = goal;
    sendRoom(room); reply(ack, { ok: true });
  });

  // Color y escudo del jugador (como en "Mismo teléfono"). Solo piezas oficiales y colores sin repetir.
  socket.on('setIdentity', ({ color, crest } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !player || room.status !== 'lobby') return reply(ack, { ok: false, error: 'Solo se cambia en la sala de espera.' });
    if (color !== undefined) {
      if (!REF.colors.includes(color)) return reply(ack, { ok: false, error: 'Color inválido.' });
      if (room.players.some(p => p !== player && p.color === color)) return reply(ack, { ok: false, error: 'Ese color ya lo tiene otro jugador.' });
    }
    let clean = null;
    if (crest !== undefined && !(clean = REF.cleanCrest(crest))) return reply(ack, { ok: false, error: 'Escudo inválido.' });
    if (color !== undefined) player.color = color;
    if (clean) player.crest = plain(clean);
    sendRoom(room); reply(ack, { ok: true });
  });

  socket.on('start', (_d, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || player.id !== room.hostId) return reply(ack, { ok: false, error: 'Solo el anfitrión puede iniciar.' });
    if (room.status !== 'lobby') return reply(ack, { ok: false, error: 'La partida ya comenzó.' });
    const humans = room.players.filter(p => !p.kicked);
    if (humans.length + room.settings.ai < 2) return reply(ack, { ok: false, error: 'Se necesitan al menos 2 reinos (jugadores o IA).' });
    humans.forEach((p, i) => { p.hid = 'h' + i; });
    try {
      room.engine = createEngine();
      // Mismas reglas que "Mismo teléfono" (fullRules) y el modo de juego elegido en la sala.
      room.engine.api.mpStartGame({ fullRules: true, goal: room.settings.goal,
        humans: humans.map(p => ({ hid: p.hid, name: p.name, color: p.color, cls: p.cls, crest: p.crest || null })), ai: room.settings.ai, diff: room.settings.diff });
    } catch (e) {
      console.error(e); room.engine = null;
      return reply(ack, { ok: false, error: 'No se pudo iniciar la partida.' });
    }
    room.status = 'playing';
    reply(ack, { ok: true });
    sendRoom(room); sendState(room);
  });

  socket.on('action', ({ name, args } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !room.engine || !player || !player.hid) return reply(ack, { ok: false, error: 'No estás en una partida.' });
    room.touched = Date.now();
    name = String(name || ''); args = Array.isArray(args) ? args : [];
    // Minijuego: la puntuación viene del teléfono (el motor ya la limita a 18 de oro y 1 por turno);
    // además debe haberse iniciado en este turno y haber durado lo que dura el juego.
    if (name === 'claimMinigame') {
      const mg = player.mg;
      if (!mg || mg.key !== args[0] || mg.turnKey !== room.turnKey) return reply(ack, { ok: false, error: 'Primero juega el minijuego.' });
      if (Date.now() - mg.at < MG_MIN_MS) return reply(ack, { ok: false, error: 'El minijuego aún no termina.' });
      player.mg = null;
    }
    const res = room.engine.api.mpAct(player.hid, name, args);
    reply(ack, res);
    sendState(room);
  });

  socket.on('mgStart', ({ key } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !room.engine || !player || !player.hid) return reply(ack, { ok: false, error: 'No estás en una partida.' });
    if (room.engine.api.currentHid() !== player.hid) return reply(ack, { ok: false, error: 'No es tu turno.' });
    if (!REF.minigames.includes(key)) return reply(ack, { ok: false, error: 'Minijuego inválido.' });
    player.mg = { key, turnKey: room.turnKey, at: Date.now() };
    reply(ack, { ok: true });
  });

  socket.on('endTurn', (_d, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !room.engine || !player || !player.hid) return reply(ack, { ok: false, error: 'No estás en una partida.' });
    room.touched = Date.now();
    const res = room.engine.api.mpEndTurn(player.hid, false);
    reply(ack, res);
    sendState(room);
  });

  socket.on('skip', (_d, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !room.engine || player.id !== room.hostId) return reply(ack, { ok: false, error: 'Solo el anfitrión puede saltar turnos.' });
    const hid = room.engine.api.currentHid();
    const target = room.players.find(p => p.hid === hid);
    if (!target || target.connected) return reply(ack, { ok: false, error: 'Solo puedes saltar el turno de un jugador desconectado.' });
    reply(ack, room.engine.api.mpEndTurn(hid, true));
    sendState(room);
  });

  socket.on('kick', ({ id } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || player.id !== room.hostId) return reply(ack, { ok: false, error: 'Solo el anfitrión puede expulsar.' });
    const target = room.players.find(p => p.id === id);
    if (!target || target.id === room.hostId) return reply(ack, { ok: false });
    if (room.status === 'lobby') {
      room.players = room.players.filter(p => p !== target);
    } else {
      if (target.connected) return reply(ack, { ok: false, error: 'Durante la partida solo puedes expulsar a jugadores desconectados.' });
      target.kicked = true;
      if (room.engine && target.hid) room.engine.api.mpKick(target.hid);
    }
    if (target.socketId) io.to(target.socketId).emit('kicked');
    reply(ack, { ok: true });
    sendRoom(room); if (room.engine) sendState(room);
  });

  socket.on('leave', (_d, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !player) return reply(ack, { ok: true });
    socket.leave(room.code); socket.data.code = null;
    if (room.status === 'lobby') {
      room.players = room.players.filter(p => p !== player);
      if (!room.players.length) { deleteRoom(room); return reply(ack, { ok: true }); }
      if (room.hostId === player.id) room.hostId = room.players[0].id;
    } else {
      player.connected = false; player.lastSeen = Date.now();
    }
    reply(ack, { ok: true });
    sendRoom(room); if (room.engine) sendState(room);
  });

  // ---------- Chat de la partida ----------
  socket.on('chat', ({ text } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !player || player.kicked) return reply(ack, { ok: false, error: 'No estás en una partida.' });
    text = cleanText(text);
    if (!text) return reply(ack, { ok: false, error: 'Mensaje vacío.' });
    const now = Date.now();
    player.chatTimes = (player.chatTimes || []).filter(t => now - t < 20_000);
    if (player.chatTimes.length >= 8) return reply(ack, { ok: false, error: 'Vas muy rápido. Espera unos segundos.' });
    player.chatTimes.push(now);
    const msg = { id: crypto.randomBytes(5).toString('hex'), pid: player.id, name: player.name, color: player.color, text, ts: now };
    room.chat.push(msg); if (room.chat.length > CHAT_MAX) room.chat.splice(0, room.chat.length - CHAT_MAX);
    room.touched = now;
    io.to(room.code).emit('chat', msg);
    saveRoom(room);
    reply(ack, { ok: true, id: msg.id });
  });

  // ---------- Suscripción a notificaciones ----------
  socket.on('pushSubscribe', ({ subscription } = {}, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !player) return reply(ack, { ok: false, error: 'Primero entra a una partida.' });
    const s = subscription || {};
    if (typeof s.endpoint !== 'string' || !/^https:\/\//.test(s.endpoint) || !s.keys || typeof s.keys.p256dh !== 'string' || typeof s.keys.auth !== 'string')
      return reply(ack, { ok: false, error: 'Suscripción inválida.' });
    player.push = { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
    sendRoom(room);
    reply(ack, { ok: true });
  });
  socket.on('pushUnsubscribe', (_d, ack) => {
    const { room, player } = ctxOf(socket);
    if (room && player) { player.push = null; sendRoom(room); }
    reply(ack, { ok: true });
  });
  socket.on('pushTest', async (_d, ack) => {
    const { room, player } = ctxOf(socket);
    if (!room || !player || !player.push) return reply(ack, { ok: false, error: 'Activa los avisos primero.' });
    const ok = await sendPush(room, player, { title: 'Madrid Kingdom', body: '¡Los avisos funcionan! Te avisaremos cuando sea tu turno.', url: `/?sala=${room.code}`, tag: 'prueba' });
    reply(ack, { ok, error: ok ? null : 'No se pudo enviar el aviso de prueba.' });
  });

  socket.on('disconnect', () => {
    const { room, player } = ctxOf(socket);
    if (!room || !player || player.socketId !== socket.id) return;
    player.connected = false; player.lastSeen = Date.now();
    sendRoom(room); if (room.engine) sendState(room);
    // si cerró la app en pleno turno, avisarle cuando pase un rato
    const code = room.code, key = room.turnKey;
    setTimeout(() => { const r = rooms.get(code); if (r && r.turnKey === key && !player.connected) notifyTurnIfAway(r); }, PUSH_DELAY_MS);
  });
});

// Mantenimiento: traspaso de anfitrión, turnos de jugadores ausentes y limpieza de salas viejas.
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const host = room.players.find(p => p.id === room.hostId);
    const online = room.players.filter(p => p.connected && !p.kicked);
    if (host && !host.connected && online.length && now - host.lastSeen > HOST_HANDOFF_MS) {
      room.hostId = online[0].id; sendRoom(room); if (room.engine) sendState(room);
    }
    if (room.status === 'playing' && room.engine) {
      const limit = SKIP_OPTIONS[room.settings.skip || 'h12'];
      const hid = room.engine.api.currentHid();
      const holder = room.players.find(p => p.hid === hid);
      if (limit && holder && !holder.connected && now - Math.max(room.turnStartedAt || 0, holder.lastSeen || 0) > limit) {
        room.engine.api.mpEndTurn(hid, true); sendState(room);
      }
    }
    if (!online.length && now - room.touched > ROOM_TTL_MS) deleteRoom(room);
  }
}, 5_000);

loadRooms();
server.listen(PORT, () => { console.log(`Madrid Kingdom online escuchando en http://localhost:${PORT}`); });
