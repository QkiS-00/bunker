// =============================================
// ПЕРЕМИКАННЯ ЕКРАНІВ
// =============================================
function showScreen(id) {
  ['landingScreen', 'lobbyScreen', 'gameScreen', 'voteScreen', 'finaleScreen']
    .forEach(s => document.getElementById(s).style.display = 'none');
  document.getElementById(id).style.display = 'block';
}

// =============================================
// ЕКРАН 2: ЛОБІ
// =============================================
function renderLobby(room) {
  showScreen('lobbyScreen');
  document.getElementById('roomCodeDisplay').textContent = room.code;

  const list = document.getElementById('playersList');
  list.innerHTML = '';

  room.players.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;';
    const isMe   = p.id === myId ? ' <span style="color:var(--text-dim)">(ви)</span>' : '';
    const isHost = p.id === room.hostId ? ' 👑' : '';
    row.innerHTML = `<span>${p.name}${isMe}${isHost}</span>`;
    list.appendChild(row);
  });

  document.getElementById('hostSettings').style.display =
    room.hostId === myId ? 'block' : 'none';
  document.getElementById('waitingNote').style.display =
    room.hostId === myId ? 'none' : 'block';
}

// =============================================
// ЕКРАН 3: КАРТКА ГРАВЦЯ
// =============================================
function renderMyCard(me) {
  const container = document.getElementById('myCardContent');
  container.innerHTML = '';

  ATTR_KEYS.forEach(key => {
    const isRevealed = me.revealed.includes(key);
    const row = document.createElement('div');
    row.className = 'attr-row';

    if (isRevealed) {
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${me.card[key]}</span>
        <span style="font-size:11px;color:var(--text-dim);">✓ розкрито</span>
      `;
    } else {
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${me.card[key]}</span>
        <button class="reveal-btn" onclick="revealAttr('${key}')">Розкрити</button>
      `;
    }
    container.appendChild(row);
  });
}

function renderOthers(players) {
  const container = document.getElementById('othersContent');
  container.innerHTML = '';

  const others = players.filter(p => p.id !== myId);

  if (!others.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Ще нікого немає</div>';
    return;
  }

  others.forEach(p => {
    const block = document.createElement('div');
    block.className = 'other-player';

    const deadTag = !p.alive
      ? '<span class="dead-tag">☠ вибув</span>'
      : '';

    let html = `<div class="other-player-name">${p.name}${deadTag}</div>`;

    if (!p.revealed.length) {
      html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">Ще нічого не розкрив</div>';
    } else {
      p.revealed.forEach(key => {
        html += `
          <div class="attr-row">
            <span class="attr-label">${ATTR_LABELS[key]}</span>
            <span class="attr-value">${p.card[key]}</span>
          </div>`;
      });
    }

    block.innerHTML = html;
    container.appendChild(block);
  });
}

function renderGame(room) {
  showScreen('gameScreen');

  document.getElementById('roundDisplay').textContent       = room.round;
  document.getElementById('catastropheDisplay').textContent = room.catastrophe;
  document.getElementById('bunkerDisplay').textContent      = room.bunker;

  const me = room.players.find(p => p.id === myId);
  if (me && me.card) renderMyCard(me);

  renderOthers(room.players);

  document.getElementById('startVoteBtn').style.display =
    room.hostId === myId ? 'block' : 'none';
}

// =============================================
// ЕКРАН 4: ГОЛОСУВАННЯ
// =============================================
function renderVoteScreen(room) {
  showScreen('voteScreen');

  const list        = document.getElementById('voteList');
  const totalVoters = room.players.filter(p => p.alive).length;
  const votedCount  = Object.keys(room.votes || {}).length;

  document.getElementById('voteCountDisplay').textContent = votedCount;
  document.getElementById('voteTotalDisplay').textContent = totalVoters;

  list.innerHTML = '';

  // Якщо є нічия — показуємо тільки гравців з нічиєї
  const candidates = room.tieIds
    ? room.players.filter(p => room.tieIds.includes(p.id))
    : room.players.filter(p => p.alive && p.id !== myId);

  // Якщо нічия — показуємо повідомлення
  if (room.tieIds) {
    const notice = document.createElement('div');
    notice.style.cssText = 'color:var(--rust-light);font-size:12px;margin-bottom:14px;letter-spacing:1px;';
    notice.textContent = '⚠ Нічия! Переголосування між цими гравцями:';
    list.appendChild(notice);
  }

  candidates.forEach(p => {
    const voteCount = Object.values(room.votes || {}).filter(v => v === p.id).length;
    const row = document.createElement('div');
    row.className = 'vote-player-row';
    row.innerHTML = `
      <span>${p.name}</span>
      <span class="vote-count">${voteCount} 🗳</span>
      <button class="vote-btn" ${hasVoted ? 'disabled' : ''} onclick="castVote('${p.id}')">
        Вигнати
      </button>
    `;
    list.appendChild(row);
  });

  // Якщо всі проголосували — хост може підвести підсумок
  const nextBtn     = document.getElementById('nextRoundBtn');
  const resultPanel = document.getElementById('voteResultPanel');

  if (votedCount >= totalVoters && room.hostId === myId) {
    nextBtn.style.display       = 'block';
    resultPanel.style.display   = 'block';
    document.getElementById('voteResultText').textContent =
      'Всі проголосували. Натисніть щоб підвести підсумок.';
  } else {
    nextBtn.style.display     = 'none';
    resultPanel.style.display = 'none';
  }
}

// =============================================
// ЕКРАН 5: ФІНАЛ
// =============================================
function renderFinale(room) {
  showScreen('finaleScreen');

  const survivors = room.players.filter(p => p.alive);
  const list      = document.getElementById('survivorsList');

  list.innerHTML = survivors.map(p => `
    <div style="padding:8px 0;border-bottom:1px solid var(--border);">
      <span style="color:var(--rust-light);">${p.name}</span>
      <span style="color:var(--text-dim);font-size:12px;margin-left:8px;">${p.card.profession}</span>
    </div>
  `).join('');

  if (room.finale) {
    document.getElementById('finaleText').textContent = room.finale;
  } else {
    document.getElementById('finaleText').textContent = 'Генеруємо історію...';
  }
}

// =============================================
// ГОЛОВНА ФУНКЦІЯ РЕНДЕРУ — викликається polling'ом
// =============================================
function renderRoom(room) {
  switch (room.status) {
    case 'lobby':
    case 'starting':
      renderLobby(room);
      break;

    case 'playing':
      renderGame(room);
      break;

    case 'voting':
      hasVoted = !!room.votes?.[myId];
      renderVoteScreen(room);
      break;

    case 'ended':
      renderFinale(room);
      break;
  }
}