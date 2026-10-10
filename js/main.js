document.getElementById('createBtn').addEventListener('click', async () => {
  const name = document.getElementById('hostName').value.trim();
  if (!name) { alert(t('yourName')); return; }
  try {
    const room = await createRoom(name);
    renderRoom(room);
  } catch (e) {
    alert((currentLang === 'uk' ? 'Помилка: ' : 'Ошибка: ') + e.message);
  }
});

document.getElementById('joinBtn').addEventListener('click', async () => {
  const name = document.getElementById('joinName').value.trim();
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const err  = document.getElementById('joinError');
  err.textContent = '';
  if (!name) { err.textContent = t('yourName'); return; }
  if (code.length !== 4) { err.textContent = t('roomCode') + ' — 4'; return; }
  try {
    const room = await joinRoom(code, name);
    renderRoom(room);
  } catch (e) {
    err.textContent = e.message;
  }
});

document.getElementById('startGameBtn').addEventListener('click', async () => {
  const capacity = parseInt(document.getElementById('capacityInput').value, 10);
  const lang     = document.getElementById('langSelect')?.value || 'uk';
  currentLang    = lang;

  const room = await fetchRoom();
  if (!room) return;
  if (!capacity || capacity < 1) { alert(t('bunkerCap')); return; }
  if (capacity >= room.players.length) {
    alert(currentLang === 'uk' ? 'Місткість має бути менша за кількість гравців' : 'Вместимость должна быть меньше числа игроков');
    return;
  }
  const updated    = dealCards(room);
  updated.capacity = capacity;
  updated.lang     = lang;
  await saveRoom(updated);
  renderRoom(updated);
});

document.getElementById('startVoteBtn').addEventListener('click', async () => {
  const room = await fetchRoom();
  if (!room) return;
  const alivePlayers = room.players.filter(p => p.alive);
  if (alivePlayers.length <= room.capacity) {
    room.status = 'ended';
    await saveRoom(room);
    renderRoom(room);
    generateFinale(room);
    return;
  }
  room.status     = 'voting';
  room.votingOpen = true;
  room.votes      = {};
  room.tieIds     = null;
  hasVoted        = false;
  await saveRoom(room);
  renderRoom(room);
});

document.getElementById('nextRoundBtn').addEventListener('click', async () => {
  const room = await fetchRoom();
  if (!room) return;
  await closeVoting(room);
});

document.getElementById('roomCodeDisplay').addEventListener('click', () => {
  const code = document.getElementById('roomCodeDisplay').textContent;
  if (!code || code === (currentLang === 'uk' ? 'скопійовано!' : 'скопировано!')) return;
  navigator.clipboard.writeText(code).then(() => {
    const el       = document.getElementById('roomCodeDisplay');
    const original = el.textContent;
    el.textContent = currentLang === 'uk' ? 'скопійовано!' : 'скопировано!';
    setTimeout(() => el.textContent = original, 1500);
  });
});

document.getElementById('endGameBtn').addEventListener('click', async () => {
  const room = await fetchRoom();
  if (!room || room.hostId !== myId) {
    alert(currentLang === 'uk' ? 'Тільки хост може завершити гру' : 'Только хост может завершить игру');
    return;
  }
  if (!confirm(currentLang === 'uk' ? 'Завершити гру для всіх?' : 'Завершить игру для всех?')) return;
  room.status = 'closed';
  await saveRoom(room);
  await new Promise(r => setTimeout(r, 1000));
  await deleteRoom();
  localStorage.removeItem('bunker_roomCode');
  localStorage.removeItem('bunker_myName');
  roomCode = ''; myName = '';
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  document.getElementById('endGameBtn').style.display = 'none';
  showScreen('landingScreen');
});

// Зміна мови в лобі
const langSelect = document.getElementById('langSelect');
if (langSelect) {
  langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    applyStaticLang();
  });
}

// =============================================
// РЕКОНЕКТ ПРИ ЗАВАНТАЖЕННІ
// =============================================
window.addEventListener('load', async () => {
  applyStaticLang();
  const reconnected = await tryReconnect();
  if (!reconnected) {
    document.getElementById('landingScreen').style.display = 'block';
  }
});