document.getElementById('createBtn').addEventListener('click', async () => {
  const name = document.getElementById('hostName').value.trim();
  if (!name) { alert('Введіть ім\'я'); return; }
  try {
    const room = await createRoom(name);
    renderRoom(room);
  } catch (e) {
    alert('Помилка: ' + e.message);
  }
});

document.getElementById('joinBtn').addEventListener('click', async () => {
  const name = document.getElementById('joinName').value.trim();
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const err  = document.getElementById('joinError');
  err.textContent = '';
  if (!name) { err.textContent = 'Введіть ім\'я'; return; }
  if (code.length !== 4) { err.textContent = 'Код — 4 символи'; return; }
  try {
    const room = await joinRoom(code, name);
    renderRoom(room);
  } catch (e) {
    err.textContent = e.message;
  }
});

document.getElementById('startGameBtn').addEventListener('click', async () => {
  const capacity = parseInt(document.getElementById('capacityInput').value, 10);
  const room     = await fetchRoom();
  if (!room) return;
  if (!capacity || capacity < 1) { alert('Вкажіть місткість бункера'); return; }
  if (capacity >= room.players.length) {
    alert('Місткість має бути менша за кількість гравців'); return;
  }
  const updated    = dealCards(room);
  updated.capacity = capacity;
  await saveRoom(updated);
  renderRoom(updated);
});

document.getElementById('startVoteBtn').addEventListener('click', async () => {
  const room = await fetchRoom();
  if (!room) return;

  // Перевірка що живих більше ніж місткість бункера
  const alivePlayers = room.players.filter(p => p.alive);
  if (alivePlayers.length <= room.capacity) {
    alert('Гравців вже достатньо мало — гра завершена!');
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
  if (!code) return;
  navigator.clipboard.writeText(code).then(() => {
    const el = document.getElementById('roomCodeDisplay');
    const original = el.textContent;
    el.textContent = 'скопійовано!';
    setTimeout(() => el.textContent = original, 1500);
  });
});
// =============================================
// РЕКОНЕКТ ПРИ ЗАВАНТАЖЕННІ
// =============================================
window.addEventListener('load', async () => {
  const reconnected = await tryReconnect();
  if (!reconnected) {
    // Показуємо стартовий екран
    document.getElementById('landingScreen').style.display = 'block';
  }
});
document.getElementById('endGameBtn').addEventListener('click', async () => {
  // Перевірка що це хост
  const room = await fetchRoom();
  if (!room || room.hostId !== myId) {
    alert('Тільки хост може завершити гру');
    return;
  }

  if (!confirm('Завершити гру для всіх гравців?')) return;

  room.status = 'closed';
  await saveRoom(room);
  await new Promise(r => setTimeout(r, 3000));
  await deleteRoom();

  localStorage.removeItem('bunker_roomCode');
  localStorage.removeItem('bunker_myName');
  roomCode = '';
  myName   = '';
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  showScreen('landingScreen');
  document.getElementById('endGameBtn').style.display = 'none';
});  