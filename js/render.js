function showScreen(id) {
  ['landingScreen', 'lobbyScreen', 'gameScreen', 'finaleScreen']
    .forEach(s => {
      const el = document.getElementById(s);
      if (el) el.style.display = 'none';
    });
  document.getElementById(id).style.display = 'block';
}

// =============================================
// ЛОБІ
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
// СВОЯ КАРТКА
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

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--text-dim);margin-bottom:12px;letter-spacing:1px;';
  hint.textContent = canReveal
    ? `▶ Можете розкрити ще ${round - revealed.length} атрибут(и)`
    : `✓ Ліміт розкриття на цей раунд вичерпано`;
  container.appendChild(hint);

  ATTR_KEYS.forEach(key => {
    const isRevealed = revealed.includes(key);
    const row = document.createElement('div');
    row.className = 'attr-row';

    if (isRevealed) {
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${me.card[key]}</span>
        <span style="font-size:11px;color:var(--rust-light);white-space:nowrap;">✓ відкрито</span>`;
    } else if (canReveal) {
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${me.card[key]}</span>
        <button class="reveal-btn" onclick="revealAttr('${key}')">Розкрити</button>`;
    } else {
      row.innerHTML = `
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value" style="color:var(--text-dim);">${me.card[key]}</span>
        <span style="font-size:11px;color:var(--border);white-space:nowrap;">🔒 закрито</span>`;
    }
    container.appendChild(row);
  });
}

// =============================================
// ЕКРАН ГРИ — своя картка + всі гравці + голосування на одному екрані
// =============================================
function renderGame(room) {
  showScreen('gameScreen');

  document.getElementById('roundDisplay').textContent       = room.round;
  document.getElementById('catastropheDisplay').textContent = room.catastrophe;
  document.getElementById('bunkerDisplay').textContent      = room.bunker;

  const me           = room.players.find(p => p.id === myId);
  const imEliminated = me && !me.alive;
  const isVoting     = room.status === 'voting';
  const votes        = room.votes || {};
  const myVote       = votes[myId];
  const iVoted       = !!myVote || imEliminated;

  // --- Своя картка ---
  const myCardPanel = document.getElementById('myCardPanel');
  if (imEliminated) {
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
            <span style="font-size:11px;color:${isRevealed ? 'var(--rust-light)' : 'var(--border)'};">
              ${isRevealed ? '✓' : '🔒'}
            </span>
          </div>`;
      });
    }
    myCardPanel.innerHTML = html;
  } else {
    myCardPanel.innerHTML = '<div class="panel-label">Ваша картка</div><div id="myCardContent"></div>';
    if (me && me.card) renderMyCard(me, room.round);
  }

  // --- Всі гравці + голосування на одному екрані ---
  const othersContainer = document.getElementById('othersContent');
  othersContainer.innerHTML = '';

  const alivePlayers = room.players.filter(p => p.alive);
  const totalVoters  = alivePlayers.length;
  const votedCount   = Object.keys(votes).length;

  // Заголовок блоку
  const blockTitle = document.createElement('div');
  blockTitle.style.cssText = 'font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;';
  blockTitle.textContent = isVoting
    ? `Голосування • Проголосували: ${votedCount}/${totalVoters}`
    : 'Гравці';
  othersContainer.appendChild(blockTitle);

  // Нічия
  if (isVoting && room.tieIds) {
    const notice = document.createElement('div');
    notice.style.cssText = 'color:var(--rust-light);font-size:12px;margin-bottom:12px;letter-spacing:1px;';
    notice.textContent = '⚠ Нічия! Переголосування між позначеними гравцями';
    othersContainer.appendChild(notice);
  }

  // Максимум голосів для підсвітки лідера
  const maxVoteCount = isVoting
    ? Math.max(0, ...room.players.map(p =>
        Object.values(votes).filter(v => v === p.id).length))
    : 0;

  room.players.forEach(p => {
    const isMe       = p.id === myId;
    const voteCount  = isVoting ? Object.values(votes).filter(v => v === p.id).length : 0;
    const isLeading  = isVoting && voteCount > 0 && voteCount === maxVoteCount;
    const isMyChoice = isVoting && myVote === p.id;
    const isTieTarget = isVoting && room.tieIds && room.tieIds.includes(p.id);
    const revealed   = p.revealed || [];

    const block = document.createElement('div');
    block.style.cssText = `
      margin-bottom:14px;
      padding:12px;
      background:${isLeading ? 'rgba(122,31,31,0.15)' : 'rgba(255,255,255,0.02)'};
      border:1px solid ${isLeading ? 'var(--blood)' : isTieTarget ? 'var(--rust)' : 'var(--border)'};
      border-left:3px solid ${isMe ? 'var(--rust-light)' : isLeading ? 'var(--blood)' : 'var(--border)'};
    `;

    // Шапка гравця
    const deadTag  = !p.alive ? ' <span style="color:var(--blood);font-size:11px;">☠ вибув</span>' : '';
    const meTag    = isMe ? ' <span style="color:var(--text-dim);font-size:11px;">(ви)</span>' : '';
    const hostTag  = p.id === room.hostId ? ' 👑' : '';

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;color:${isLeading ? 'var(--blood)' : 'var(--rust-light)'};">
          ${p.name}${meTag}${hostTag}${deadTag}
        </span>
        ${isVoting ? `<span style="font-size:13px;color:${isLeading ? 'var(--blood)' : 'var(--text-dim)'};">${voteCount} 🗳</span>` : ''}
      </div>
    `;

    // Прогрес-бар голосів
    if (isVoting && totalVoters > 0) {
      const pct = Math.round((voteCount / totalVoters) * 100);
      html += `
        <div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:10px;">
          <div style="height:3px;width:${pct}%;background:${isLeading ? 'var(--blood)' : 'var(--rust)'};border-radius:2px;transition:width 0.3s;"></div>
        </div>
      `;
    }

    // Розкриті атрибути (не показуємо свої — вони вже у своїй картці)
    if (!isMe) {
      if (!revealed.length) {
        html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">Ще нічого не розкрив</div>';
      } else {
        revealed.forEach(key => {
          if (!p.card || !p.card[key]) return;
          html += `
            <div class="attr-row" style="padding:4px 0;">
              <span class="attr-label">${ATTR_LABELS[key]}</span>
              <span class="attr-value">${p.card[key]}</span>
            </div>`;
        });
        const hiddenCount = ATTR_KEYS.length - revealed.length;
        if (hiddenCount > 0) {
          html += `<div style="color:var(--text-dim);font-size:11px;font-style:italic;padding:4px 0;">ще ${hiddenCount} прихованих...</div>`;
        }
      }
    }

    // Кнопка голосування
    if (isVoting && !isMe && p.alive && !imEliminated) {
      const canVoteThis = !room.tieIds || isTieTarget;
      if (canVoteThis) {
        html += `
          <button class="vote-btn"
            style="margin-top:10px;width:100%;${isMyChoice ? 'background:var(--rust);color:#100b08;' : ''}"
            ${iVoted ? 'disabled' : ''}
            onclick="castVote('${p.id}')">
            ${isMyChoice ? '✓ Ваш вибір' : 'Вигнати'}
          </button>`;
      }
    }

    block.innerHTML = html;
    othersContainer.appendChild(block);
  });

  // Скіп
  if (isVoting && !imEliminated) {
    const skipLimit   = getSkipLimit(room.players.length);
    const mySkipsUsed = (room.skipsUsed && room.skipsUsed[myId]) || 0;
    const skipsLeft   = skipLimit - mySkipsUsed;
    const skipBlocked = skipsLeft <= 0;
    const skipCount   = Object.values(votes).filter(v => v === 'skip').length;
    const mySkipped   = myVote === 'skip';

    const skipRow = document.createElement('div');
    skipRow.style.cssText = 'margin-top:4px;padding-top:14px;border-top:1px solid var(--border);';

    if (skipBlocked) {
      skipRow.innerHTML = `
        <div style="color:var(--blood);font-size:12px;text-align:center;letter-spacing:1px;">
          ⛔ Ви вичерпали свої скіпи (${mySkipsUsed}/${skipLimit})
        </div>`;
    } else {
      skipRow.innerHTML = `
        <button class="secondary" style="font-size:12px;padding:10px;${mySkipped ? 'border-color:var(--rust-light);color:var(--rust-light);' : ''}"
          ${iVoted ? 'disabled' : ''}
          onclick="castVote('skip')">
          ${mySkipped
            ? `✓ Ви пропустили (у вас ще ${skipsLeft - 1}/${skipLimit})`
            : `Пропустити (у вас залишилось: ${skipsLeft}/${skipLimit})`}
        </button>`;
    }
    othersContainer.appendChild(skipRow);
  }

  // Кнопки хоста
  const voteBtn = document.getElementById('startVoteBtn');
  const nextBtn = document.getElementById('nextRoundBtn');

  if (isVoting) {
    voteBtn.style.display = 'none';
    if (room.hostId === myId && votedCount >= totalVoters) {
      nextBtn.style.display = 'block';
      document.getElementById('voteResultPanel').style.display = 'block';
      document.getElementById('voteResultText').textContent = 'Всі проголосували. Натисніть щоб підвести підсумок.';
    } else {
      nextBtn.style.display = 'none';
      document.getElementById('voteResultPanel').style.display = 'none';
    }
  } else {
    nextBtn.style.display = 'none';
    document.getElementById('voteResultPanel').style.display = 'none';
    voteBtn.style.display = (room.hostId === myId && !imEliminated) ? 'block' : 'none';
  }
}

// =============================================
// ФІНАЛ
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

  document.getElementById('finaleText').textContent =
    room.finale || 'Генеруємо історію...';
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
    case 'voting':
      hasVoted = !!room.votes?.[myId];
      renderGame(room);
      break;
    case 'ended':
      renderFinale(room);
      break;
  }
}