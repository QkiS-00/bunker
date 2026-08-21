// =============================================
// FIREBASE CONFIG
// =============================================
const DB_URL = 'https://bunker-4399d-default-rtdb.firebaseio.com';

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
let myId     = localStorage.getItem('bunker_myId')     || 'p_' + Math.random().toString(36).slice(2, 10);
let myName   = localStorage.getItem('bunker_myName')   || '';
let roomCode = localStorage.getItem('bunker_roomCode') || '';
let isHost   = false;
let pollTimer  = null;
let hasVoted   = false;

// Зберігаємо myId назавжди
localStorage.setItem('bunker_myId', myId);

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

  localStorage.setItem('bunker_myName',   myName);
  localStorage.setItem('bunker_roomCode', roomCode);

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
    skipsUsed:   {},
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

  localStorage.setItem('bunker_myName',   myName);
  localStorage.setItem('bunker_roomCode', roomCode);

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

// =============================================
// РЕКОНЕКТ — викликається при завантаженні сторінки
// =============================================
async function tryReconnect() {
  if (!roomCode || !myName) return false;

  const room = await fbGet(`rooms/${roomCode}`);
  if (!room) {
    localStorage.removeItem('bunker_roomCode');
    localStorage.removeItem('bunker_myName');
    roomCode = '';
    myName   = '';
    return false;
  }

  const me = room.players.find(p => p.id === myId);
    // Якщо гра закінчена — не реконектимось, йдемо на старт
  if (room.status === 'ended') {
    localStorage.removeItem('bunker_roomCode');
    localStorage.removeItem('bunker_myName');
    roomCode = '';
    myName   = '';
    return false;
  }
  if (!me) {
    localStorage.removeItem('bunker_roomCode');
    localStorage.removeItem('bunker_myName');
    roomCode = '';
    myName   = '';
    return false;
  }

  isHost = room.hostId === myId;
  startPolling();
  renderRoom(room);
  return true;
}