// =============================================
// FIREBASE CONFIG
// =============================================
const DB_URL = 'https://bunker-4399d-default-rtdb.firebaseio.com';

// Простий хелпер для запитів до Firebase REST API
async function fbGet(path) {
  const res = await fetch(`${DB_URL}/${path}.json`);
  return res.json();
}

async function fbSet(path, data) {
  await fetch(`${DB_URL}/${path}.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

// =============================================
// ЗМІННІ СЕСІЇ
// =============================================
let myId     = 'p_' + Math.random().toString(36).slice(2, 10);
let myName   = '';
let roomCode = '';
let isHost   = false;
let pollTimer  = null;
let hasVoted   = false;

// =============================================
// ГЕНЕРАЦІЯ КОДУ КІМНАТИ
// =============================================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// =============================================
// СТВОРЕННЯ КІМНАТИ
// =============================================
async function createRoom(hostName) {
  myName   = hostName;
  isHost   = true;
  roomCode = generateRoomCode();

  const room = {
    code:        roomCode,
    hostId:      myId,
    status:      'lobby',
    players: [
      { id: myId, name: hostName, alive: true, card: null, revealed: [] }
    ],
    capacity:    4,
    catastrophe: null,
    bunker:      null,
    round:       0,
    votes:       {},
    votingOpen:  false,
    tieIds:      null,
    log:         [],
    finale:      null,
    createdAt:   Date.now()
  };

  await fbSet(`rooms/${roomCode}`, room);
  startPolling();
  return room;
}

// =============================================
// ПРИЄДНАННЯ ДО КІМНАТИ
// =============================================
async function joinRoom(code, name) {
  code = code.toUpperCase();

  const room = await fbGet(`rooms/${code}`);
  if (!room) throw new Error('Кімнату не знайдено. Перевірте код.');
  if (room.status !== 'lobby') throw new Error('Гра вже почалась.');
  if (room.players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('Гравець з таким іменем вже є.');
  }

  room.players.push({ id: myId, name, alive: true, card: null, revealed: [] });
  await fbSet(`rooms/${code}`, room);

  myName   = name;
  roomCode = code;
  isHost   = false;
  startPolling();
  return room;
}

// =============================================
// ОТРИМАТИ СТАН КІМНАТИ
// =============================================
async function fetchRoom() {
  try {
    const room = await fbGet(`rooms/${roomCode}`);
    return room || null;
  } catch (e) {
    return null;
  }
}

// =============================================
// ЗБЕРЕГТИ СТАН КІМНАТИ
// =============================================
async function saveRoom(room) {
  await fbSet(`rooms/${roomCode}`, room);
}

// =============================================
// POLLING — синхронізація кожні 2.5 секунди
// =============================================
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    const room = await fetchRoom();
    if (room) renderRoom(room);
  }, 2500);
}