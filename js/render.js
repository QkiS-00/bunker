function showScreen(id) {
  ['landingScreen','lobbyScreen','gameScreen','finaleScreen']
    .forEach(s => { const el = document.getElementById(s); if (el) el.style.display = 'none'; });
  document.getElementById(id).style.display = 'block';
}

// =============================================
// ЛОБІ
// =============================================
function renderLobby(room) {
  showScreen('lobbyScreen');
  if (room.lang) currentLang = room.lang;

  document.getElementById('roomCodeDisplay').textContent = room.code;

  const list = document.getElementById('playersList');
  list.innerHTML = '';

  room.players.forEach(p => {
    const row     = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);font-size:14px;gap:8px;';
    const isMe   = p.id === myId;
    const isHst  = p.id === room.hostId;
    const meTag  = isMe  ? ' <span style="color:var(--text-dim);font-size:11px;">(' + t('youLabel') + ')</span>' : '';
    const hostTag = isHst ? ' 👑' : '';

    let btns = '';
    if (room.hostId === myId && !isMe) {
      btns = `
        <button onclick="kickPlayer('${p.id}')" style="width:auto;padding:4px 10px;font-size:11px;background:var(--blood);border-color:var(--blood);">${t('kickBtn')}</button>
        <button onclick="transferHost('${p.id}')" style="width:auto;padding:4px 10px;font-size:11px;background:transparent;border-color:var(--rust);color:var(--rust-light);">👑</button>
      `;
    }

    row.innerHTML = '<span style="flex:1;">' + p.name + meTag + hostTag + '</span>' + btns;
    list.appendChild(row);
  });

  document.getElementById('hostSettings').style.display = room.hostId === myId ? 'block' : 'none';
  document.getElementById('waitingNote').textContent     = t('waiting');
  document.getElementById('waitingNote').style.display   = room.hostId === myId ? 'none' : 'block';
  document.getElementById('startGameBtn').textContent    = t('startGame');

  const capLabel = document.querySelector('label[for="capacityInput"]');
  if (capLabel) capLabel.textContent = t('bunkerCap');

  applyStaticLang();
}

// =============================================
// КАРТКА ГРАВЦЯ
// =============================================
function renderMyCard(me, room) {
  const container = document.getElementById('myCardContent');
  container.innerHTML = '';
  if (!me.card) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">' + (currentLang === 'uk' ? 'Картка не знайдена' : 'Карточка не найдена') + '</div>';
    return;
  }

  const round       = room.round;
  const playerCount = room.players.length;
  const revealed    = me.revealed || [];
  const revealLimit = playerCount < 10 ? round + 1 : round;
  const canReveal   = revealed.length < revealLimit;
  const labels      = getAttrLabels();

  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;color:var(--text-dim);margin-bottom:12px;letter-spacing:1px;';
  hint.textContent = canReveal
    ? '▶ ' + t('canReveal') + ' ' + (revealLimit - revealed.length) + ' ' + t('attrs')
    : '✓ ' + t('revealLimit');
  container.appendChild(hint);

  ATTR_KEYS.forEach(key => {
    const isRevealed = revealed.includes(key);
    const row = document.createElement('div');
    row.className = 'attr-row';
    if (isRevealed) {
      row.innerHTML = '<span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + me.card[key] + '</span><span style="font-size:11px;color:var(--rust-light);white-space:nowrap;">' + t('revealed') + '</span>';
    } else if (canReveal) {
      row.innerHTML = '<span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + me.card[key] + '</span><button class="reveal-btn" onclick="revealAttr(\'' + key + '\')">' + t('reveal') + '</button>';
    } else {
      row.innerHTML = '<span class="attr-label">' + labels[key] + '</span><span class="attr-value" style="color:var(--text-dim);">' + me.card[key] + '</span><span style="font-size:11px;color:var(--border);white-space:nowrap;">' + t('locked') + '</span>';
    }
    container.appendChild(row);
  });

  renderAbilitySection(me, room, container);
}

// =============================================
// ЗДІБНІСТЬ
// =============================================
function renderAbilitySection(me, room, container) {
  if (!me.card.ability) {
    // Перевіряємо здібність сусіднього бункера
    if (me.card.neighborAbility && !me.card.neighborAbilityUsed && room.neighborBunker && !room.neighborRevealed) {
      const section = document.createElement('div');
      section.style.cssText = 'margin-top:16px;padding:14px;background:rgba(74,122,74,0.08);border:1px solid #4a7a4a;';
      section.innerHTML =
        '<div style="color:#6ab56a;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🏚 ' + t('neighborBunker') + '</div>' +
        '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Ви знаєте про сусідній бункер і можете розкрити його всім' : 'Вы знаете о соседнем бункере и можете раскрыть его всем') + '</div>' +
        '<button class="reveal-btn" style="width:100%;border-color:#4a7a4a;color:#6ab56a;" onclick="revealNeighbor()">' + t('showNeighbor') + '</button>';
      container.appendChild(section);
    }
    return;
  }

  const ability = me.card.ability;
  const used    = me.card.abilityUsed;
  const labels  = getAttrLabels();
  const section = document.createElement('div');
  section.style.cssText = 'margin-top:16px;padding:14px;background:' + (used ? 'rgba(255,255,255,0.02)' : 'rgba(181,72,31,0.08)') + ';border:1px solid ' + (used ? 'var(--border)' : 'var(--rust)') + ';';

  let html =
    '<div style="color:' + (used ? 'var(--text-dim)' : 'var(--rust-light)') + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">' + t('ability') + '</div>' +
    '<div style="color:' + (used ? 'var(--text-dim)' : 'var(--text)') + ';font-size:13px;font-weight:bold;margin-bottom:6px;">' + ability.name + '</div>';

  if (used) {
    html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">' + t('abilityUsed') + '</div>';
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
    const attrName = labels[ability.attr];
    if (ability.target === 'self') {
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Замінює вашу: ' : 'Заменяет вашу: ') + '<b>' + attrName + '</b></div><button class="reveal-btn" style="width:100%;" onclick="useAbility(\'' + myId + '\', null)">' + (currentLang === 'uk' ? 'Використати' : 'Использовать') + '</button>';
    } else if (ability.target === 'neighbor') {
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Замінює ' : 'Заменяет ') + '<b>' + attrName + '</b> ' + (currentLang === 'uk' ? 'сусіда' : 'соседа') + '</div>';
      if (!neighbors.length) {
        html += '<div style="color:var(--text-dim);font-size:12px;">' + (currentLang === 'uk' ? 'Немає живих сусідів' : 'Нет живых соседей') + '</div>';
      } else {
        neighbors.forEach(p => { html += '<button class="reveal-btn" style="width:100%;margin-bottom:6px;" onclick="useAbility(\'' + p.id + '\', null)">' + p.name + '</button>'; });
      }
    } else {
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Замінює ' : 'Заменяет ') + '<b>' + attrName + '</b> ' + (currentLang === 'uk' ? 'будь-якого гравця' : 'любого игрока') + '</div>';
      alivePlayers.forEach(p => { html += '<button class="reveal-btn" style="width:100%;margin-bottom:6px;" onclick="useAbility(\'' + p.id + '\', null)">' + p.name + '</button>'; });
    }
  } else if (ability.type === 'immunity') {
    if (ability.target === 'self') {
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Захищає вас від голосування' : 'Защищает вас от голосования') + '</div><button class="reveal-btn" style="width:100%;" onclick="useAbility(\'' + myId + '\', null)">' + (currentLang === 'uk' ? 'Використати' : 'Использовать') + '</button>';
    } else if (ability.target === 'neighbor') {
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Захищає сусіда від голосування' : 'Защищает соседа от голосования') + '</div>';
      neighbors.forEach(p => { html += '<button class="reveal-btn" style="width:100%;margin-bottom:6px;" onclick="useAbility(\'' + p.id + '\', null)">' + p.name + '</button>'; });
    } else {
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Захищає будь-якого гравця' : 'Защищает любого игрока') + '</div>';
      alivePlayers.forEach(p => { html += '<button class="reveal-btn" style="width:100%;margin-bottom:6px;" onclick="useAbility(\'' + p.id + '\', null)">' + p.name + '</button>'; });
    }
  } else if (ability.type === 'spy') {
    if (spyState && spyState.targetId) {
      const target = room.players.find(p => p.id === spyState.targetId);
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Оберіть атрибут(и) гравця ' : 'Выберите атрибут(ы) игрока ') + '<b>' + target?.name + '</b>:</div>';
      if (ability.attr === 'two') {
        html += '<div id="spyAttrPicks">';
        ATTR_KEYS.forEach(key => {
          html += '<label style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;"><input type="checkbox" value="' + key + '" style="width:auto;margin:0;" onchange="updateSpyCheck()"> ' + labels[key] + '</label>';
        });
        html += '</div><button id="spyConfirmBtn" class="reveal-btn" style="width:100%;margin-top:10px;" disabled onclick="confirmSpyTwo()">' + (currentLang === 'uk' ? 'Підглянути (0/2)' : 'Подглядеть (0/2)') + '</button>';
        html += '<button class="secondary" style="width:100%;margin-top:6px;font-size:12px;padding:8px;" onclick="spyState=null;fetchRoom().then(r=>renderRoom(r))">← ' + (currentLang === 'uk' ? 'Назад' : 'Назад') + '</button>';
      } else {
        ATTR_KEYS.forEach(key => {
          html += '<button class="reveal-btn" style="width:100%;margin-bottom:6px;" onclick="useAbility(\'' + spyState.targetId + '\', \'' + key + '\')">' + labels[key] + '</button>';
        });
        html += '<button class="secondary" style="width:100%;margin-top:4px;font-size:12px;padding:8px;" onclick="spyState=null;fetchRoom().then(r=>renderRoom(r))">← ' + (currentLang === 'uk' ? 'Назад' : 'Назад') + '</button>';
      }
    } else {
      const desc = ability.attr === 'all' ? (currentLang === 'uk' ? 'Побачити ВСІ атрибути' : 'Увидеть ВСЕ атрибуты') :
                   ability.attr === 'one' ? (currentLang === 'uk' ? 'Оберіть гравця, потім атрибут' : 'Выберите игрока, потом атрибут') :
                   ability.attr === 'two' ? (currentLang === 'uk' ? 'Оберіть гравця, потім 2 атрибути' : 'Выберите игрока, потом 2 атрибута') :
                   (currentLang === 'uk' ? 'Побачити ' : 'Увидеть ') + labels[ability.attr];
      html += '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + desc + '</div>';
      alivePlayers.forEach(p => {
        const onclick = (ability.attr === 'one' || ability.attr === 'two')
          ? 'spyState={targetId:\'' + p.id + '\',ability:null};fetchRoom().then(r=>renderRoom(r))'
          : 'useAbility(\'' + p.id + '\', \'' + (ability.attr === 'all' ? 'all' : ability.attr) + '\')';
        html += '<button class="reveal-btn" style="width:100%;margin-bottom:6px;" onclick="' + onclick + '">' + p.name + '</button>';
      });
    }
  }

  section.innerHTML = html;
  container.appendChild(section);

  // Здібність сусіднього бункера після основної
  if (me.card.neighborAbility && !me.card.neighborAbilityUsed && room.neighborBunker && !room.neighborRevealed) {
    const nbSection = document.createElement('div');
    nbSection.style.cssText = 'margin-top:10px;padding:14px;background:rgba(74,122,74,0.08);border:1px solid #4a7a4a;';
    nbSection.innerHTML =
      '<div style="color:#6ab56a;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🏚 ' + t('neighborBunker') + '</div>' +
      '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Ви знаєте про сусідній бункер' : 'Вы знаете о соседнем бункере') + '</div>' +
      '<button class="reveal-btn" style="width:100%;border-color:#4a7a4a;color:#6ab56a;" onclick="revealNeighbor()">' + t('showNeighbor') + '</button>';
    container.appendChild(nbSection);
  }
}

// =============================================
// ЕКРАН ГРИ
// =============================================
function renderGame(room) {
  showScreen('gameScreen');
  if (room.lang) currentLang = room.lang;

  document.getElementById('roundDisplay').textContent       = room.round;
  document.getElementById('catastropheDisplay').textContent = room.catastrophe;
  document.getElementById('bunkerDisplay').textContent      = room.bunker;

  // Їжа і вода
  const foodEl  = document.getElementById('foodDisplay');
  const waterEl = document.getElementById('waterDisplay');
  if (foodEl && waterEl) {
    if (!room.food) {
      const fo = currentLang === 'uk' ? FOOD_OPTIONS_UK : FOOD_OPTIONS;
      const wo = currentLang === 'uk' ? WATER_OPTIONS_UK : WATER_OPTIONS;
      const fm = Math.floor(Math.random() * 180) + 1;
      const wm = Math.floor(Math.random() * 180) + 1;
      room.food  = pick(fo) + ' — ' + formatMonths(fm);
      room.water = pick(wo) + ' — ' + formatMonths(wm);
      saveRoom(room);
    }
    foodEl.textContent  = room.food;
    waterEl.textContent = room.water;
  }

  // Підписи їжа/вода
  const foodLabel  = document.getElementById('foodLabel');
  const waterLabel = document.getElementById('waterLabel');
  if (foodLabel)  foodLabel.textContent  = '🍞 ' + t('food');
  if (waterLabel) waterLabel.textContent = '💧 ' + t('water');

  // Сусідній бункер
  const neighborBlock = document.getElementById('neighborBlock');
  if (neighborBlock) {
    if (room.neighborBunker) {
      neighborBlock.style.display = 'block';
      const content = document.getElementById('neighborContent');
      const nbLabel = document.getElementById('neighborLabel');
      if (nbLabel) nbLabel.textContent = '🏚 ' + t('neighborBunker');
      if (room.neighborRevealed) {
        const nb        = room.neighborBunker;
        const typeColor = nb.type === 'hostile' ? 'var(--blood)' : '#4a7a4a';
        const typeTag   = nb.type === 'hostile' ? t('hostileTag') : t('friendlyTag');
        content.innerHTML = '<div style="color:' + typeColor + ';font-size:12px;font-weight:bold;margin-bottom:6px;">' + typeTag + ' — ' + nb.name + '</div><div style="color:var(--text);font-size:12px;line-height:1.6;">' + nb.desc + '</div>';
      } else {
        const me = room.players.find(p => p.id === myId);
        if (me && me.card && me.card.neighborAbility && !me.card.neighborAbilityUsed) {
          content.innerHTML = '<div style="color:var(--text-dim);font-size:12px;margin-bottom:10px;">' + (currentLang === 'uk' ? 'Поруч є бункер — ви можете розкрити його всім' : 'Рядом есть бункер — вы можете раскрыть его всем') + '</div><button class="reveal-btn" style="width:100%;" onclick="revealNeighbor()">' + t('showNeighbor') + '</button>';
        } else {
          content.innerHTML = '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">' + t('neighborKnows') + '</div>';
        }
      }
    } else {
      neighborBlock.style.display = 'none';
    }
  }

  // Івент
  const eventBlock = document.getElementById('currentEventBlock');
  if (eventBlock) {
    if (room.currentEvent) {
      eventBlock.style.display = 'block';
      const evLabel = document.getElementById('eventLabel');
      if (evLabel) evLabel.textContent = '⚠ ' + (currentLang === 'uk' ? 'Подія в бункері' : 'Событие в бункере');
      document.getElementById('currentEventText').textContent = room.currentEvent;
    } else {
      eventBlock.style.display = 'none';
    }
  }

  const me            = room.players.find(p => p.id === myId);
  const imEliminated  = me && !me.alive;
  const isVoting      = room.status === 'voting';
  const votes         = room.votes || {};
  const myVote        = votes[myId];
  const iVoted        = !!myVote || imEliminated;
  const immunePlayers = room.immunePlayers || [];

  // Своя картка
  const myCardPanel = document.getElementById('myCardPanel');
  const cardLabel   = myCardPanel.querySelector('.panel-label');
  if (cardLabel) cardLabel.textContent = t('yourCard');

  if (imEliminated) {
    let html = '<div class="panel-label">' + t('yourCard') + '</div>';
    html += '<div style="color:var(--blood);font-size:12px;text-align:center;padding:8px 0 14px;letter-spacing:1px;">' + t('spectator') + '</div>';
    if (me && me.card) {
      const revealed = me.revealed || [];
      const labels   = getAttrLabels();
      ATTR_KEYS.forEach(key => {
        const isRev = revealed.includes(key);
        html += '<div class="attr-row"><span class="attr-label">' + labels[key] + '</span><span class="attr-value" style="' + (isRev ? '' : 'color:var(--text-dim);') + '">' + me.card[key] + '</span><span style="font-size:11px;color:' + (isRev ? 'var(--rust-light)' : 'var(--border)') + ';">' + (isRev ? '✓' : '🔒') + '</span></div>';
      });
    }
    myCardPanel.innerHTML = html;
  } else {
    myCardPanel.innerHTML = '<div class="panel-label">' + t('yourCard') + '</div><div id="myCardContent"></div>';
    if (me && me.card) renderMyCard(me, room);
  }

  // Гравці + голосування
  const othersContainer = document.getElementById('othersContent');
  othersContainer.innerHTML = '';
  const alivePlayers = room.players.filter(p => p.alive);
  const totalVoters  = alivePlayers.length;
  const votedCount   = Object.keys(votes).length;

  // Заголовок панелі
  const playersPanel = othersContainer.closest('.panel');
  if (playersPanel) {
    const panelLabel = playersPanel.querySelector('.panel-label');
    if (panelLabel) panelLabel.textContent = isVoting ? t('voting') + ' • ' + t('voted') + ': ' + votedCount + '/' + totalVoters : t('players');
  }

  const blockTitle = document.createElement('div');
  blockTitle.style.cssText = 'font-size:11px;color:var(--text-dim);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;';
  blockTitle.textContent   = isVoting ? t('voting') + ' • ' + t('voted') + ': ' + votedCount + '/' + totalVoters : t('players');
  othersContainer.appendChild(blockTitle);

  if (isVoting && room.tieIds) {
    const notice = document.createElement('div');
    notice.style.cssText = 'color:var(--rust-light);font-size:12px;margin-bottom:12px;letter-spacing:1px;';
    notice.textContent   = t('tieNotice');
    othersContainer.appendChild(notice);
  }

  const maxVoteCount = isVoting
    ? Math.max(0, ...room.players.map(p => Object.values(votes).filter(v => v === p.id).length))
    : 0;

  const labels = getAttrLabels();

  room.players.forEach(p => {
    const isMe        = p.id === myId;
    const voteCount   = isVoting ? Object.values(votes).filter(v => v === p.id).length : 0;
    const isLeading   = isVoting && voteCount > 0 && voteCount === maxVoteCount;
    const isMyChoice  = isVoting && myVote === p.id;
    const isTieTarget = isVoting && room.tieIds && room.tieIds.includes(p.id);
    const isImmune    = immunePlayers.includes(p.id);
    const revealed    = p.revealed || [];

    const block = document.createElement('div');
    block.style.cssText = 'margin-bottom:14px;padding:12px;background:' + (isLeading ? 'rgba(122,31,31,0.15)' : 'rgba(255,255,255,0.02)') + ';border:1px solid ' + (isImmune ? '#4a7a4a' : isLeading ? 'var(--blood)' : isTieTarget ? 'var(--rust)' : 'var(--border)') + ';border-left:3px solid ' + (isMe ? 'var(--rust-light)' : isImmune ? '#4a7a4a' : isLeading ? 'var(--blood)' : 'var(--border)') + ';';

    const deadTag   = !p.alive ? ' <span style="color:var(--blood);font-size:11px;">' + t('eliminated_tag') + '</span>' : '';
    const meTag     = isMe ? ' <span style="color:var(--text-dim);font-size:11px;">(' + t('youLabel') + ')</span>' : '';
    const hostTag   = p.id === room.hostId ? ' 👑' : '';
    const immuneTag = isImmune ? ' <span style="color:#4a7a4a;font-size:11px;">' + t('immune') + '</span>' : '';

    let html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><span style="font-size:13px;color:' + (isLeading ? 'var(--blood)' : 'var(--rust-light)') + ';">' + p.name + meTag + hostTag + deadTag + immuneTag + '</span>' + (isVoting ? '<span style="font-size:13px;color:' + (isLeading ? 'var(--blood)' : 'var(--text-dim)') + ';">' + voteCount + ' 🗳</span>' : '') + '</div>';

    if (isVoting && totalVoters > 0) {
      const pct = Math.round((voteCount / totalVoters) * 100);
      html += '<div style="height:3px;background:var(--border);border-radius:2px;margin-bottom:10px;"><div style="height:3px;width:' + pct + '%;background:' + (isLeading ? 'var(--blood)' : 'var(--rust)') + ';border-radius:2px;transition:width 0.3s;"></div></div>';
    }

    if (!isMe) {
      if (!revealed.length) {
        html += '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">' + (currentLang === 'uk' ? 'Ще нічого не розкрив' : 'Ещё ничего не раскрыл') + '</div>';
      } else {
        revealed.forEach(key => {
          if (!p.card || !p.card[key]) return;
          html += '<div class="attr-row" style="padding:4px 0;"><span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + p.card[key] + '</span></div>';
        });
        const hiddenCount = ATTR_KEYS.length - revealed.length;
        if (hiddenCount > 0) html += '<div style="color:var(--text-dim);font-size:11px;font-style:italic;padding:4px 0;">' + (currentLang === 'uk' ? 'ще ' + hiddenCount + ' прихованих...' : 'ещё ' + hiddenCount + ' скрытых...') + '</div>';
      }
    }

    if (isVoting && p.alive && !imEliminated) {
      const canVoteThis    = !room.tieIds || isTieTarget;
      if (canVoteThis) {
        const immuneDisabled = isImmune && !isMyChoice;
        html += '<button class="vote-btn" style="margin-top:10px;width:100%;' + (isMyChoice ? 'background:var(--rust);color:#100b08;' : '') + (immuneDisabled ? 'opacity:0.3;cursor:not-allowed;' : '') + '" ' + (iVoted || immuneDisabled ? 'disabled' : '') + ' onclick="castVote(\'' + p.id + '\')">' + (isImmune ? t('hasImmune') : isMyChoice ? t('yourChoice') : t('kick')) + '</button>';
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
    const mySkipped   = myVote === 'skip';

    const skipRow = document.createElement('div');
    skipRow.style.cssText = 'margin-top:4px;padding-top:14px;border-top:1px solid var(--border);';
    if (skipBlocked) {
      skipRow.innerHTML = '<div style="color:var(--blood);font-size:12px;text-align:center;letter-spacing:1px;">⛔ ' + t('skipsExhausted') + ' (' + mySkipsUsed + '/' + skipLimit + ')</div>';
    } else {
      skipRow.innerHTML = '<button class="secondary" style="font-size:12px;padding:10px;' + (mySkipped ? 'border-color:var(--rust-light);color:var(--rust-light);' : '') + '" ' + (iVoted ? 'disabled' : '') + ' onclick="castVote(\'skip\')">' + (mySkipped ? '✓ ' + t('skip') + ' (' + t('skipsLeft') + ': ' + (skipsLeft - 1) + '/' + skipLimit + ')' : t('skip') + ' (' + t('skipsLeft') + ': ' + skipsLeft + '/' + skipLimit + ')') + '</button>';
    }
    othersContainer.appendChild(skipRow);
  }

  const voteBtn = document.getElementById('startVoteBtn');
  const nextBtn = document.getElementById('nextRoundBtn');
  if (voteBtn) voteBtn.textContent = t('startVote');
  if (nextBtn) nextBtn.textContent = t('nextRound');

  if (isVoting) {
    if (voteBtn) voteBtn.style.display = 'none';
    if (room.hostId === myId && votedCount >= totalVoters) {
      if (nextBtn) nextBtn.style.display = 'block';
      const rp = document.getElementById('voteResultPanel');
      const rt = document.getElementById('voteResultText');
      if (rp) rp.style.display = 'block';
      if (rt) rt.textContent   = t('allVoted');
    } else {
      if (nextBtn) nextBtn.style.display = 'none';
      const rp = document.getElementById('voteResultPanel');
      if (rp) rp.style.display = 'none';
    }
  } else {
    if (nextBtn) nextBtn.style.display = 'none';
    const rp = document.getElementById('voteResultPanel');
    if (rp) rp.style.display = 'none';
    if (voteBtn) voteBtn.style.display = room.hostId === myId ? 'block' : 'none';
  }
}

// =============================================
// ФІНАЛ
// =============================================
function renderFinale(room) {
  showScreen('finaleScreen');
  if (room.lang) currentLang = room.lang;

  const survivors = room.players.filter(p => p.alive);
  const list      = document.getElementById('survivorsList');
  const labels    = getAttrLabels();

  list.innerHTML = `
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">⚠ ${t('catastrophe')}</div>
      <div style="color:var(--text);font-size:14px;">${room.catastrophe}</div>
    </div>
    <div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🏠 ${t('bunker')}</div>
      <div style="color:var(--text);font-size:14px;">${room.bunker}</div>
    </div>
    ${room.food ? `<div style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🍞 ${t('food')}</div>
      <div style="color:var(--text);font-size:14px;">${room.food}</div>
    </div>` : ''}
    ${room.water ? `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">💧 ${t('water')}</div>
      <div style="color:var(--text);font-size:14px;">${room.water}</div>
    </div>` : ''}
    ${(room.neighborBunker && room.neighborRevealed) ? `<div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">🏚 ${t('neighborBunker')}</div>
      <div style="color:${room.neighborBunker.type === 'hostile' ? 'var(--blood)' : '#6ab56a'};font-size:12px;font-weight:bold;margin-bottom:4px;">${room.neighborBunker.type === 'hostile' ? t('hostileTag') : t('friendlyTag')} — ${room.neighborBunker.name}</div>
      <div style="color:var(--text);font-size:12px;">${room.neighborBunker.desc}</div>
    </div>` : ''}
    <div style="margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border);">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">⚡ ${t('events')}</div>
      ${(room.eventLog && room.eventLog.length)
        ? room.eventLog.map(e => {
            const colonIdx = e.indexOf(':');
            const label    = e.substring(0, colonIdx);
            const text     = e.substring(colonIdx + 2);
            return '<div style="padding:8px 0;border-bottom:1px solid var(--border);"><span style="color:var(--rust-light);font-size:11px;letter-spacing:1px;display:block;margin-bottom:4px;">' + label + '</span><span style="color:var(--text);font-size:12px;line-height:1.5;">' + text + '</span></div>';
          }).join('')
        : '<div style="color:var(--text-dim);font-size:12px;font-style:italic;">' + (currentLang === 'uk' ? 'За час гри нічого особливого не сталось' : 'За время игры ничего особенного не произошло') + '</div>'
      }
    </div>
    <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">${t('survived')}</div>
  `;

  survivors.forEach((p, i) => {
    const cardId = 'card_' + i;
    const card   = p.card || {};
    const el     = document.createElement('div');
    el.style.cssText = 'margin-bottom:10px;border:1px solid var(--border);border-left:3px solid var(--rust);';
    el.innerHTML =
      '<div onclick="toggleCard(\'' + cardId + '\')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;">' +
        '<div><span style="color:var(--rust-light);font-size:14px;">' + p.name + '</span><span style="color:var(--text-dim);font-size:12px;margin-left:8px;">' + (card.profession || '') + '</span></div>' +
        '<span id="arrow_' + cardId + '" style="color:var(--text-dim);font-size:14px;">▶</span>' +
      '</div>' +
      '<div id="' + cardId + '" style="display:none;padding:0 14px 14px;">' +
        ATTR_KEYS.map(key => '<div class="attr-row"><span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + (card[key] || '—') + '</span></div>').join('') +
      '</div>';
    list.appendChild(el);
  });

  const eliminated = room.players.filter(p => !p.alive);
  if (eliminated.length) {
    const title = document.createElement('div');
    title.style.cssText = 'color:var(--blood);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:20px 0 12px;';
    title.textContent   = t('eliminated');
    list.appendChild(title);

    eliminated.forEach((p, i) => {
      const cardId = 'elim_' + i;
      const card   = p.card || {};
      const el     = document.createElement('div');
      el.style.cssText = 'margin-bottom:10px;border:1px solid var(--border);border-left:3px solid var(--blood);opacity:0.7;';
      el.innerHTML =
        '<div onclick="toggleCard(\'' + cardId + '\')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;cursor:pointer;">' +
          '<div><span style="color:var(--blood);font-size:14px;">' + p.name + '</span><span style="color:var(--text-dim);font-size:12px;margin-left:8px;">' + (card.profession || '') + '</span><span style="color:var(--blood);font-size:11px;margin-left:6px;">☠</span></div>' +
          '<span id="arrow_' + cardId + '" style="color:var(--text-dim);font-size:14px;">▶</span>' +
        '</div>' +
        '<div id="' + cardId + '" style="display:none;padding:0 14px 14px;">' +
          ATTR_KEYS.map(key => '<div class="attr-row"><span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + (card[key] || '—') + '</span></div>').join('') +
        '</div>';
      list.appendChild(el);
    });
  }

  const finaleEl = document.getElementById('finaleText');
  const aiLabel  = document.querySelector('#finaleScreen .panel-label');
  if (aiLabel) aiLabel.textContent = t('aiStory');

  if (room.finale) {
    finaleEl.textContent     = room.finale;
    finaleEl.style.color     = 'var(--text)';
    finaleEl.style.fontStyle = 'normal';
  } else {
    finaleEl.textContent     = t('generating');
    finaleEl.style.color     = 'var(--text-dim)';
    finaleEl.style.fontStyle = 'italic';
  }

  const endBtn = document.getElementById('endGameBtn');
  if (endBtn) {
    endBtn.textContent    = t('endGame');
    endBtn.style.display  = room.hostId === myId ? 'block' : 'none';
  }
}

function toggleCard(cardId) {
  const el    = document.getElementById(cardId);
  const arrow = document.getElementById('arrow_' + cardId);
  if (!el) return;
  const isOpen          = el.style.display !== 'none';
  el.style.display      = isOpen ? 'none' : 'block';
  arrow.style.transform = isOpen ? '' : 'rotate(90deg)';
}
window.toggleCard = toggleCard;

// =============================================
// СТАТИЧНІ НАПИСИ
// =============================================
function applyStaticLang() {
  const el = (id) => document.getElementById(id);
  const ql = (sel) => document.querySelector(sel);

  if (el('createBtn'))    el('createBtn').textContent    = t('createRoom');
  if (el('joinBtn'))      el('joinBtn').textContent      = t('join');
  if (el('startGameBtn')) el('startGameBtn').textContent = t('startGame');
  if (el('startVoteBtn')) el('startVoteBtn').textContent = t('startVote');
  if (el('nextRoundBtn')) el('nextRoundBtn').textContent = t('nextRound');
  if (el('endGameBtn'))   el('endGameBtn').textContent   = t('endGame');
  if (el('waitingNote'))  el('waitingNote').textContent  = t('waiting');

  const hn = ql('label[for="hostName"]');
  const jn = ql('label[for="joinName"]');
  const jc = ql('label[for="joinCode"]');
  const ci = ql('label[for="capacityInput"]');
  if (hn) hn.textContent = t('yourName');
  if (jn) jn.textContent = t('yourName');
  if (jc) jc.textContent = t('roomCode');
  if (ci) ci.textContent = t('bunkerCap');

  const subtitles = document.querySelectorAll('.subtitle');
  subtitles.forEach(s => { s.textContent = t('subtitleGame'); });

  const dividers = document.querySelectorAll('.divider');
  dividers.forEach(d => { d.textContent = t('orLabel'); });

  const footerNote = ql('.footer-note');
  if (footerNote) footerNote.textContent = t('footerNote');

  const langLabel = ql('label[for="langSelect"]');
  if (langLabel) langLabel.textContent = t('langLabel');

  // Нова гра / Приєднатись панелі
  const newGameLabel = ql('#landingScreen .panel:first-child .panel-label');
  const joinLabel    = ql('#landingScreen .panel:last-of-type .panel-label');
  if (newGameLabel) newGameLabel.textContent = t('newGame');
  if (joinLabel)    joinLabel.textContent    = currentLang === 'uk' ? 'Приєднатись' : 'Присоединиться';
}

// =============================================
// ГОЛОВНА ФУНКЦІЯ РЕНДЕРУ
// =============================================
function renderRoom(room) {
  if (!room) {
    fetchRoom().then(r => { if (r) renderRoom(r); });
    return;
  }
  if (room.lang) { currentLang = room.lang; applyStaticLang(); }

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
      if (document.getElementById('finaleScreen').style.display === 'block') {
        const finaleEl = document.getElementById('finaleText');
        if (room.finale && finaleEl.style.fontStyle === 'italic') {
          finaleEl.textContent     = room.finale;
          finaleEl.style.color     = 'var(--text)';
          finaleEl.style.fontStyle = 'normal';
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        }
      } else {
        renderFinale(room);
        if (room.finale) {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        }
      }
      break;
    case 'closed':
      localStorage.removeItem('bunker_roomCode');
      localStorage.removeItem('bunker_myName');
      roomCode = ''; myName = '';
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
      const endBtnC = document.getElementById('endGameBtn');
      if (endBtnC) endBtnC.style.display = 'none';
      alert(currentLang === 'uk' ? 'Хост завершив гру. Дякуємо за участь!' : 'Хост завершил игру. Спасибо за участие!');
      showScreen('landingScreen');
      break;
  }
}