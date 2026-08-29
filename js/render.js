// =============================================
// ПЕРЕМИКАННЯ ЕКРАНІВ
// =============================================
function showScreen(id) {
  ['landingScreen','lobbyScreen','gameScreen','finaleScreen']
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
// СВОЯ КАРТКА + ЗДІБНІСТЬ
// =============================================
function renderMyCard(me, room) {
  const container = document.getElementById('myCardContent');
  container.innerHTML = '';
  if (!me.card) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">Картка не знайдена</div>';
    return;
  }

  const round       = room.round;
  const playerCount = room.players.length;
  const revealed    = me.revealed || [];
  const revealLimit = playerCount < 10 ? round + 1 : round;
  const canReveal   = revealed.length < revealLimit;

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--text-dim);margin-bottom:12px;letter-spacing:1px;';
  hint.textContent = canReveal
    ? `▶ Можете розкрити ще ${revealLimit - revealed.length} атрибут(и)`
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

  renderAbilitySection(me, room, container);
}

// =============================================
// ЗДІБНІСТЬ
// =============================================
function renderAbilitySection(me, room, container) {
  if (!me.card.ability) return;

  const ability = me.card.ability;
  const used    = me.card.abilityUsed;
  const section = document.createElement('div');
  section.style.cssText = `
    margin-top:16px;padding:14px;
    background:${used ? 'rgba(255,255,255,0.02)' : 'rgba(181,72,31,0.08)'};
    border:1px solid ${used ? 'var(--border)' : 'var(--rust)'};
  `;

  let html = `
    <div style="color:${used ? 'var(--text-dim)' : 'var(--rust-light)'};
      font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">
      ⚡ Спеціальна здібність
    </div>
    <div style="color:${used ? 'var(--text-dim)' : 'var(--text)'};
      font-size:13px;font-weight:bold;margin-bottom:6px;">${ability.name}</div>
  `;

  if (used) {
    html += `<div style="color:var(--text-dim);font-size:12px;font-style:italic;">Вже використана</div>`;
    section.innerHTML = html;
    container.appendChild(section);
    return;
  }

  const alivePlayers = room.players.filter(p => p.alive && p.id !== myId);
  const myIndex      = room.players.findIndex(p => p.id === myId);
  const prevNeighbor = room.players.slice(0, myIndex).reverse().find(p => p.alive && p.id !== myId);
  const nextNeighbor = room.players.slice(myIndex + 1).find(p => p.alive && p.id !== myId);
  const neighbors    = [prevNeighbor, nextNeighbor].filter(Boolean);

  if (ability.type === 'replace_attr') {
    const attrName = ATTR_LABELS[ability.attr];
    if (ability.target === 'self') {
      html += `
        <div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
          Замінює вашу: <b>${attrName}</b>
        </div>
        <button class="reveal-btn" style="width:100%;"
          onclick="useAbility('${myId}', null)">Використати</button>`;
    } else if (ability.target === 'neighbor') {
      html += `<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
        Замінює <b>${attrName}</b> сусіда</div>`;
      if (!neighbors.length) {
        html += `<div style="color:var(--text-dim);font-size:12px;">Немає живих сусідів</div>`;
      } else {
        neighbors.forEach(p => {
          html += `<button class="reveal-btn" style="width:100%;margin-bottom:6px;"
            onclick="useAbility('${p.id}', null)">${p.name}</button>`;
        });
      }
    } else {
      html += `<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
        Замінює <b>${attrName}</b> будь-якого гравця</div>`;
      alivePlayers.forEach(p => {
        html += `<button class="reveal-btn" style="width:100%;margin-bottom:6px;"
          onclick="useAbility('${p.id}', null)">${p.name}</button>`;
      });
    }

  } else if (ability.type === 'immunity') {
    if (ability.target === 'self') {
      html += `
        <div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
          Захищає вас від голосування цього раунду
        </div>
        <button class="reveal-btn" style="width:100%;"
          onclick="useAbility('${myId}', null)">Використати</button>`;
    } else if (ability.target === 'neighbor') {
      html += `<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
        Захищає сусіда від голосування</div>`;
      neighbors.forEach(p => {
        html += `<button class="reveal-btn" style="width:100%;margin-bottom:6px;"
          onclick="useAbility('${p.id}', null)">${p.name}</button>`;
      });
    } else {
      html += `<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
        Захищає будь-якого гравця від голосування</div>`;
      alivePlayers.forEach(p => {
        html += `<button class="reveal-btn" style="width:100%;margin-bottom:6px;"
          onclick="useAbility('${p.id}', null)">${p.name}</button>`;
      });
    }

  } else if (ability.type === 'spy') {
    if (spyState && spyState.targetId) {
      const target = room.players.find(p => p.id === spyState.targetId);
      html += `
        <div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">
          Оберіть атрибут(и) гравця <b>${target?.name}</b>:
        </div>`;

      if (ability.attr === 'two') {
        html += `<div id="spyAttrPicks">`;
        ATTR_KEYS.forEach(key => {
          html += `
            <label style="display:flex;align-items:center;gap:8px;padding:6px 0;
              border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;">
              <input type="checkbox" value="${key}" style="width:auto;margin:0;"
                onchange="updateSpyCheck()"> ${ATTR_LABELS[key]}
            </label>`;
        });
        html += `</div>
          <button id="spyConfirmBtn" class="reveal-btn" style="width:100%;margin-top:10px;"
            disabled onclick="confirmSpyTwo()">Підглянути (0/2 обрано)</button>
          <button class="secondary" style="width:100%;margin-top:6px;font-size:12px;padding:8px;"
            onclick="spyState=null;fetchRoom().then(r=>renderRoom(r))">← Назад</button>`;
      } else {
        ATTR_KEYS.forEach(key => {
          html += `<button class="reveal-btn" style="width:100%;margin-bottom:6px;"
            onclick="useAbility('${spyState.targetId}', '${key}')">
            ${ATTR_LABELS[key]}</button>`;
        });
        html += `<button class="secondary" style="width:100%;margin-top:4px;font-size:12px;padding:8px;"
          onclick="spyState=null;fetchRoom().then(r=>renderRoom(r))">← Назад</button>`;
      }
    } else {
      const desc = ability.attr === 'all' ? 'Побачити ВСІ атрибути гравця' :
                   ability.attr === 'one' ? 'Оберіть гравця, потім атрибут' :
                   ability.attr === 'two' ? 'Оберіть гравця, потім 2 атрибути' :
                   `Побачити ${ATTR_LABELS[ability.attr]} гравця`;
      html += `<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">${desc}</div>`;
      alivePlayers.forEach(p => {
        const onclick = (ability.attr === 'one' || ability.attr === 'two')
          ? `spyState={targetId:'${p.id}',ability:null};fetchRoom().then(r=>renderRoom(r))`
          : `useAbility('${p.id}', '${ability.attr === 'all' ? 'all' : ability.attr}')`;
        html += `<button class="reveal-btn" style="width:100%;margin-bottom:6px;"
          onclick="${onclick}">${p.name}</button>`;
      });
    }
  }

  section.innerHTML = html;
  container.appendChild(section);
}

function updateSpyCheck() {
  const checks = document.querySelectorAll('#spyAttrPicks input:checked');
  const btn    = document.getElementById('spyConfirmBtn');
  if (!btn) return;
  const count      = checks.length;
  btn.disabled     = count !== 2;
  btn.textContent  = `Підглянути (${count}/2 обрано)`;
  if (count > 2) checks[checks.length - 1].checked = false;
}

async function confirmSpyTwo() {
  const checks = document.querySelectorAll('#spyAttrPicks input:checked');
  if (checks.length !== 2) return;
  const attrKey = Array.from(checks).map(c => c.value).join(',');
  await useAbility(spyState.targetId, attrKey);
}

// =============================================
// ІНШІ ГРАВЦІ (блок в екрані гри)
// =============================================
function renderGame(room) {
  showScreen('gameScreen');

  document.getElementById('roundDisplay').textContent       = room.round;
  document.getElementById('catastropheDisplay').textContent = room.catastrophe;
  document.getElementById('bunkerDisplay').textContent      = room.bunker;
   // Івент поточного раунду
  const eventBlock = document.getElementById('currentEventBlock');
  if (room.currentEvent) {
    eventBlock.style.display = 'block';
    document.getElementById('currentEventText').textContent = room.currentEvent;
  } else {
    eventBlock.style.display = 'none';
  }

  const me            = room.players.find(p => p.id === myId);
  const imEliminated  = me && !me.alive;
  const isVoting      = room.status === 'voting';
  const votes         = room.votes || {};
  const myVote        = votes[myId];
  const iVoted        = !!myVote || imEliminated;
  const immunePlayers = room.immunePlayers || [];

  // --- Своя картка ---
  const myCardPanel = document.getElementById('myCardPanel');
  if (imEliminated) {
    let html = '<div class="panel-label">Ваша картка</div>';
    html += `<div style="color:var(--blood);font-size:12px;text-align:center;
      padding:8px 0 14px;letter-spacing:1px;">☠ Ви вибули — спостерігайте за грою</div>`;
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
    if (me && me.card) renderMyCard(me, room);
  }

  // --- Гравці + голосування ---
  const othersContainer = document.getElementById('othersContent');
  othersContainer.innerHTML = '';

  const alivePlayers = room.players.filter(p => p.alive);
  const totalVoters  = alivePlayers.length;
  const votedCount   = Object.keys(votes).length;

  const blockTitle = document.createElement('div');
  blockTitle.style.cssText = 'font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;';
  blockTitle.textContent = isVoting
    ? `Голосування • Проголосували: ${votedCount}/${totalVoters}`
    : 'Гравці';
  othersContainer.appendChild(blockTitle);

  if (isVoting && room.tieIds) {
    const notice = document.createElement('div');
    notice.style.cssText = 'color:var(--rust-light);font-size:12px;margin-bottom:12px;letter-spacing:1px;';
    notice.textContent = '⚠ Нічия! Переголосування між позначеними гравцями';
    othersContainer.appendChild(notice);
  }

  const maxVoteCount = isVoting
    ? Math.max(0, ...room.players.map(p =>
        Object.values(votes).filter(v => v === p.id).length))
    : 0;

  room.players.forEach(p => {
    const isMe        = p.id === myId;
    const voteCount   = isVoting ? Object.values(votes).filter(v => v === p.id).length : 0;
    const isLeading   = isVoting && voteCount > 0 && voteCount === maxVoteCount;
    const isMyChoice  = isVoting && myVote === p.id;
    const isTieTarget = isVoting && room.tieIds && room.tieIds.includes(p.id);
    const isImmune    = immunePlayers.includes(p.id);
    const revealed    = p.revealed || [];

    const block = document.createElement('div');
    block.style.cssText = `
      margin-bottom:14px;padding:12px;
      background:${isLeading ? 'rgba(122,31,31,0.15)' : 'rgba(255,255,255,0.02)'};
      border:1px solid ${isImmune ? '#4a7a4a' : isLeading ? 'var(--blood)' : isTieTarget ? 'var(--rust)' : 'var(--border)'};
      border-left:3px solid ${isMe ? 'var(--rust-light)' : isImmune ? '#4a7a4a' : isLeading ? 'var(--blood)' : 'var(--border)'};
    `;

    const deadTag   = !p.alive ? ' <span style="color:var(--blood);font-size:11px;">☠ вибув</span>' : '';
    const meTag     = isMe ? ' <span style="color:var(--text-dim);font-size:11px;">(ви)</span>' : '';
    const hostTag   = p.id === room.hostId ? ' 👑' : '';
    const immuneTag = isImmune ? ' <span style="color:#4a7a4a;font-size:11px;">🛡 імунітет</span>' : '';

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:13px;color:${isLeading ? 'var(--blood)' : 'var(--rust-light)'};">
          ${p.name}${meTag}${hostTag}${deadTag}${immuneTag}
        </span>
        ${isVoting ? `<span style="font-size:13px;color:${isLeading ? 'var(--blood)' : 'var(--text-dim)'};">${voteCount} 🗳</span>` : ''}
      </div>
    `;

    if (isVoting && totalVoters > 0) {
      const pct = Math.round((voteCount / totalVoters) * 100);
      html += `
        <div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:10px;">
          <div style="height:3px;width:${pct}%;background:${isLeading ? 'var(--blood)' : 'var(--rust)'};
            border-radius:2px;transition:width 0.3s;"></div>
        </div>`;
    }

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
          html += `<div style="color:var(--text-dim);font-size:11px;font-style:italic;padding:4px 0;">
            ще ${hiddenCount} прихованих...</div>`;
        }
      }
    }

    if (isVoting && p.alive && !imEliminated) {
      const canVoteThis = !room.tieIds || isTieTarget;
      if (canVoteThis) {
        const immuneDisabled = isImmune && !isMyChoice;
        html += `
          <button class="vote-btn"
            style="margin-top:10px;width:100%;
              ${isMyChoice ? 'background:var(--rust);color:#100b08;' : ''}
              ${immuneDisabled ? 'opacity:0.3;cursor:not-allowed;' : ''}"
            ${iVoted || immuneDisabled ? 'disabled' : ''}
            onclick="castVote('${p.id}')">
            ${isImmune ? '🛡 Має імунітет' : isMyChoice ? '✓ Ваш вибір' : 'Вигнати'}
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
        <button class="secondary" style="font-size:12px;padding:10px;
          ${mySkipped ? 'border-color:var(--rust-light);color:var(--rust-light);' : ''}"
          ${iVoted ? 'disabled' : ''}
          onclick="castVote('skip')">
          ${mySkipped
            ? `✓ Ви пропустили (залишилось: ${skipsLeft - 1}/${skipLimit})`
            : `Пропустити (залишилось: ${skipsLeft}/${skipLimit})`}
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
      document.getElementById('voteResultText').textContent =
        'Всі проголосували. Натисніть щоб підвести підсумок.';
    } else {
      nextBtn.style.display = 'none';
      document.getElementById('voteResultPanel').style.display = 'none';
    }
  } else {
    nextBtn.style.display = 'none';
    document.getElementById('voteResultPanel').style.display = 'none';
    voteBtn.style.display = room.hostId === myId ? 'block' : 'none';
  }
}

// =============================================
// ФІНАЛ
// =============================================
function renderFinale(room) {
  showScreen('finaleScreen');

  const survivors = room.players.filter(p => p.alive);
  const list      = document.getElementById('survivorsList');

  list.innerHTML = `
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;
        text-transform:uppercase;margin-bottom:6px;">⚠ Катастрофа</div>
      <div style="color:var(--text);font-size:14px;">${room.catastrophe}</div>
    </div>
    <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;
        text-transform:uppercase;margin-bottom:6px;">🏠 Бункер</div>
      <div style="color:var(--text);font-size:14px;">${room.bunker}</div>
    </div>
    <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;
      text-transform:uppercase;margin-bottom:12px;">Виживші</div>
  `;

  survivors.forEach((p, i) => {
    const cardId = 'card_' + i;
    const card   = p.card || {};
    const el     = document.createElement('div');
    el.style.cssText = 'margin-bottom:10px;border:1px solid var(--border);border-left:3px solid var(--rust);';
    el.innerHTML = `
      <div onclick="toggleCard('${cardId}')"
        style="display:flex;justify-content:space-between;align-items:center;
          padding:12px 14px;cursor:pointer;">
        <div>
          <span style="color:var(--rust-light);font-size:14px;">${p.name}</span>
          <span style="color:var(--text-dim);font-size:12px;margin-left:8px;">${card.profession || ''}</span>
        </div>
        <span id="arrow_${cardId}" style="color:var(--text-dim);font-size:14px;">▶</span>
      </div>
      <div id="${cardId}" style="display:none;padding:0 14px 14px;">
        ${ATTR_KEYS.map(key => `
          <div class="attr-row">
            <span class="attr-label">${ATTR_LABELS[key]}</span>
            <span class="attr-value">${card[key] || '—'}</span>
          </div>`).join('')}
      </div>
    `;
    list.appendChild(el);
  });

  const eliminated = room.players.filter(p => !p.alive);
  if (eliminated.length) {
    const title = document.createElement('div');
    title.style.cssText = 'color:var(--blood);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:20px 0 12px;';
    title.textContent = '☠ Вибули';
    list.appendChild(title);

    eliminated.forEach((p, i) => {
      const cardId = 'elim_' + i;
      const card   = p.card || {};
      const el     = document.createElement('div');
      el.style.cssText = 'margin-bottom:10px;border:1px solid var(--border);border-left:3px solid var(--blood);opacity:0.7;';
      el.innerHTML = `
        <div onclick="toggleCard('${cardId}')"
          style="display:flex;justify-content:space-between;align-items:center;
            padding:12px 14px;cursor:pointer;">
          <div>
            <span style="color:var(--blood);font-size:14px;">${p.name}</span>
            <span style="color:var(--text-dim);font-size:12px;margin-left:8px;">${card.profession || ''}</span>
            <span style="color:var(--blood);font-size:11px;margin-left:6px;">☠</span>
          </div>
          <span id="arrow_${cardId}" style="color:var(--text-dim);font-size:14px;">▶</span>
        </div>
        <div id="${cardId}" style="display:none;padding:0 14px 14px;">
          ${ATTR_KEYS.map(key => `
            <div class="attr-row">
              <span class="attr-label">${ATTR_LABELS[key]}</span>
              <span class="attr-value">${card[key] || '—'}</span>
            </div>`).join('')}
        </div>
      `;
      list.appendChild(el);
    });
  }

  document.getElementById('finaleText').textContent =
    room.finale || 'Генеруємо історію...';
      // Кнопка завершення тільки для хоста
  const endBtn = document.getElementById('endGameBtn');
  endBtn.style.display = room.hostId === myId ? 'block' : 'none';
}

function toggleCard(cardId) {
  const el    = document.getElementById(cardId);
  const arrow = document.getElementById('arrow_' + cardId);
  if (!el) return;
  const isOpen          = el.style.display !== 'none';
  el.style.display      = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
}

// =============================================
// ГОЛОВНА ФУНКЦІЯ РЕНДЕРУ
// =============================================
// =============================================
// ГОЛОВНА ФУНКЦІЯ РЕНДЕРУ
// =============================================
function renderRoom(room) {
  if (!room) {
    fetchRoom().then(r => { if (r) renderRoom(r); });
    return;
  }
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
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      renderFinale(room);
      break;
    case 'closed':
      // Всіх виганяємо на головний екран
      localStorage.removeItem('bunker_roomCode');
      localStorage.removeItem('bunker_myName');
      roomCode = '';
      myName   = '';
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      alert('Хост завершив гру. Дякуємо за участь!');
      showScreen('landingScreen');
      break;
          case 'closed':
      localStorage.removeItem('bunker_roomCode');
      localStorage.removeItem('bunker_myName');
      roomCode = '';
      myName   = '';
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      document.getElementById('endGameBtn').style.display = 'none';
      alert('Хост завершив гру. Дякуємо за участь!');
      showScreen('landingScreen');
      break;
  }
}