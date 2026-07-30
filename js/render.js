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
// Гравець завжди бачить ВСІ свої значення.
// Розкриті — зі значком ✓, нерозкриті — з кнопкою або заблоковані.
// =============================================
function renderMyCard(me, round) {
  const container = document.getElementById('myCardContent');
  container.innerHTML = '';

  if (!me.card) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Картка не знайдена</div>';
    return;
  }

  const revealed  = me.revealed || [];
  const canReveal = revealed.length < round;

  // Підказка скільки можна ще розкрити
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--text-dim);margin-bottom:12px;letter-spacing:1px;';
  if (canReveal) {
    hint.textContent = `▶ Можете розкрити ще ${round - revealed.length} атрибут(и) в цьому раунді`;
  } else {
    hint.textContent = `✓ Ліміт розкриття на цей раунд вичерпано`;
  }
  container.appendChild(hint);

  ATTR_KEYS.forEach(key => {
    const isRevealed = revealed.includes(key);
    const row = document.createElement('div');
    row.className = 'attr-row';

    if (isRevealed) {
      // Розкрито — всі бачать це значення
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${me.card[key]}</span>
        <span style="font-size:11px;color:var(--rust-light);white-space:nowrap;">✓ відкрито</span>
      `;
    } else if (canReveal) {
      // Не розкрито але можна — показуємо значення і кнопку
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${me.card[key]}</span>
        <button class="reveal-btn" onclick="revealAttr('${key}')">Розкрити</button>
      `;
    } else {
      // Не розкрито і ліміт — показуємо значення але без кнопки
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value" style="color:var(--text-dim);">${me.card[key]}</span>
        <span style="font-size:11px;color:var(--border);white-space:nowrap;">🔒 закрито</span>
      `;
    }
    container.appendChild(row);
  });
}

// =============================================
// ІНШІ ГРАВЦІ — тільки розкриті атрибути
// =============================================
function renderOthers(players) {
  const container = document.getElementById('othersContent');
  container.innerHTML = '';

  const others = players.filter(p => p.id !== myId);

  if (!others.length) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Ще нікого немає</div>';
    return;
  }

  others.forEach(p => {
    const block     = document.createElement('div');
    block.className = 'other-player';

    const deadTag  = !p.alive ? '<span class="dead-tag">☠ вибув</span>' : '';
    const revealed = p.revealed || [];

    let html = `<div class="other-player-name">${p.name}${deadTag}</div>`;

    if (!revealed.length) {
      html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">Ще нічого не розкрив</div>';
    } else {
      revealed.forEach(key => {
        if (!p.card || !p.card[key]) return;
        html += `
          <div class="attr-row">
            <span class="attr-label">${ATTR_LABELS[key]}</span>
            <span class="attr-value">${p.card[key]}</span>
          </div>`;
      });

      const hiddenCount = ATTR_KEYS.length - revealed.length;
      if (hiddenCount > 0) {
        html += `
          <div style="color:var(--text-dim);font-size:11px;font-style:italic;padding:6px 0;">
            ще ${hiddenCount} прихованих...
          </div>`;
      }
    }

    block.innerHTML = html;
    container.appendChild(block);
  });
}

// =============================================
// ЕКРАН 3: ГРА
// =============================================
function renderGame(room) {
  showScreen('gameScreen');

  document.getElementById('roundDisplay').textContent       = room.round;
  document.getElementById('catastropheDisplay').textContent = room.catastrophe;
  document.getElementById('bunkerDisplay').textContent      = room.bunker;

  const me           = room.players.find(p => p.id === myId);
  const imEliminated = me && !me.alive;

  const myCardPanel = document.getElementById('myCardPanel');

  if (imEliminated) {
    // Вибутий бачить свою картку повністю але без кнопок
    let html = '<div class="panel-label">Ваша картка</div>';
    html += `<div style="color:var(--blood);font-size:12px;text-align:center;padding:8px 0 14px;letter-spacing:1px;">☠ Ви вибули — спостерігайте за грою</div>`;
    if (me && me.card) {
      const revealed = me.revealed || [];
      ATTR_KEYS.forEach(key => {
        const isRevealed = revealed.includes(key);
        html += `
          <div class="attr-row">
            <span class="attr-label">${ATTR_LABELS[key]}</span>
            <span class="attr-value" style="${isRevealed ? '' : 'color:var(--text-dim);'}">${me.card[key]}</span>
            ${isRevealed ? '<span style="font-size:11px;color:var(--rust-light);">✓</span>' : '<span style="font-size:11px;color:var(--border);">🔒</span>'}
          </div>`;
      });
    }
    myCardPanel.innerHTML = html;
  } else {
    myCardPanel.innerHTML = '<div class="panel-label">Ваша картка</div><div id="myCardContent"></div>';
    if (me && me.card) renderMyCard(me, room.round);
  }

  renderOthers(room.players);

  const voteBtn = document.getElementById('startVoteBtn');
  voteBtn.style.display = (room.hostId === myId && !imEliminated) ? 'block' : 'none';
}

// =============================================
// ЕКРАН 4: ГОЛОСУВАННЯ
// Голоси оновлюються в реальному часі через polling
// =============================================
function renderVoteScreen(room) {
  showScreen('voteScreen');

  const alivePlayers = room.players.filter(p => p.alive);
  const totalVoters  = alivePlayers.length;
  const votes        = room.votes || {};
  const votedCount   = Object.keys(votes).length;

  document.getElementById('voteCountDisplay').textContent = votedCount;
  document.getElementById('voteTotalDisplay').textContent = totalVoters;

  const list = document.getElementById('voteList');
  list.innerHTML = '';

  const me           = room.players.find(p => p.id === myId);
  const imEliminated = me && !me.alive;
  const myVote       = votes[myId];
  const iVoted       = !!myVote || imEliminated;

  // Плашка спостерігача
  if (imEliminated) {
    const obs = document.createElement('div');
    obs.style.cssText = 'color:var(--blood);font-size:12px;text-align:center;margin-bottom:14px;letter-spacing:1px;padding:10px;border:1px solid var(--blood);';
    obs.textContent = '☠ Ви вибули — ви спостерігач';
    list.appendChild(obs);
  }

  // Повідомлення про нічию
  if (room.tieIds) {
    const notice = document.createElement('div');
    notice.style.cssText = 'color:var(--rust-light);font-size:12px;margin-bottom:14px;letter-spacing:1px;';
    notice.textContent = '⚠ Нічия! Переголосування між цими гравцями:';
    list.appendChild(notice);
  }

  // Кандидати з кількістю голосів в реальному часі
  const candidates = room.tieIds
    ? room.players.filter(p => room.tieIds.includes(p.id))
    : room.players.filter(p => p.alive && p.id !== myId);

  if (candidates.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:var(--text-dim);font-size:13px;text-align:center;padding:16px 0;';
    empty.textContent = 'Нікого для голосування';
    list.appendChild(empty);
  }

  // Максимум голосів для підсвітки лідера
  const maxCount = candidates.reduce((max, p) => {
    const count = Object.values(votes).filter(v => v === p.id).length;
    return count > max ? count : max;
  }, 0);

  candidates.forEach(p => {
    const voteCount  = Object.values(votes).filter(v => v === p.id).length;
    const isMyChoice = myVote === p.id;
    const isLeading  = voteCount > 0 && voteCount === maxCount;
    const row        = document.createElement('div');
    row.className    = 'vote-player-row';

    // Прогрес-бар голосів
    const pct = totalVoters > 0 ? Math.round((voteCount / totalVoters) * 100) : 0;
    const barColor = isLeading ? 'var(--blood)' : 'var(--border)';

    row.innerHTML = `
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span>${p.name}</span>
          <span class="vote-count" style="${isLeading ? 'color:var(--blood);' : ''}">${voteCount} 🗳</span>
        </div>
        <div style="height:3px;background:var(--border);border-radius:2px;">
          <div style="height:3px;width:${pct}%;background:${barColor};border-radius:2px;transition:width 0.3s;"></div>
        </div>
      </div>
      <button class="vote-btn"
        style="margin-left:12px;${isMyChoice ? 'background:var(--rust);color:#100b08;' : ''}"
        ${iVoted ? 'disabled' : ''}
        onclick="castVote('${p.id}')">
        ${isMyChoice ? '✓ Ваш вибір' : 'Вигнати'}
      </button>
    `;
    list.appendChild(row);
  });

  // Скіп — тільки для живих
  if (!imEliminated) {
    const skipLimit   = getSkipLimit(room.players.length);
    const skipsUsed   = room.skipsUsed || 0;
    const skipsLeft   = skipLimit - skipsUsed;
    const skipBlocked = skipsLeft <= 0;
    const skipCount   = Object.values(votes).filter(v => v === 'skip').length;
    const mySkipped   = myVote === 'skip';

    const skipRow = document.createElement('div');
    skipRow.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid var(--border);';

    if (skipBlocked) {
      skipRow.innerHTML = `
        <div style="color:var(--blood);font-size:12px;text-align:center;letter-spacing:1px;">
          ⛔ Ліміт скіпів вичерпано (${skipsUsed}/${skipLimit})
        </div>
      `;
    } else {
      skipRow.innerHTML = `
        <button class="secondary"
          style="font-size:12px;padding:10px;${mySkipped ? 'border-color:var(--rust-light);color:var(--rust-light);' : ''}"
          ${iVoted ? 'disabled' : ''}
          onclick="castVote('skip')">
          ${mySkipped
            ? `✓ Ви пропустили (${skipCount} пропустили)`
            : `Пропустити (${skipCount} пропустили | залишилось: ${skipsLeft}/${skipLimit})`}
        </button>
      `;
    }
    list.appendChild(skipRow);
  }

  // Хост підводить підсумок
  const nextBtn     = document.getElementById('nextRoundBtn');
  const resultPanel = document.getElementById('voteResultPanel');

  if (votedCount >= totalVoters && room.hostId === myId) {
    nextBtn.style.display     = 'block';
    resultPanel.style.display = 'block';
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
// ГОЛОВНА ФУНКЦІЯ РЕНДЕРУ
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