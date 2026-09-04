// =============================================
// ДОПОМІЖНІ ФУНКЦІЇ
// =============================================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSkipLimit(playerCount) {
  if (playerCount < 9)   return 2;
  if (playerCount <= 13) return 3;
  return 4;
}

function generateEventForRound(room) {
  // 10% шанс в кожному раунді
  room.currentEvent = Math.random() < 0.1
    ? pick(BUNKER_EVENTS)
    : null;
  if (room.currentEvent) {
    room.eventLog = room.eventLog || [];
    room.eventLog.push(`Раунд ${room.round}: ${room.currentEvent}`);
  }
}


// =============================================
// ГЕНЕРАЦІЯ ПЕРСОНАЖІВ
// =============================================
function generateCard() {
  return {
    genderAge:    pick(DATA.genderAge),
    profession:   pick(DATA.professions),
    health:       pick(DATA.health),
    hobby:        pick(DATA.hobbies),
    phobia:       pick(DATA.phobias),
    luggage:      pick(DATA.luggage),
    bioFact:      pick(DATA.bioFact),
    specialSkill: pick(DATA.specialSkill),
    ability:      Math.random() < 0.2 ? pick(ABILITIES) : null,
    abilityUsed:  false
  };
}

function dealCards(room) {
  room.players.forEach(p => {
    p.card     = generateCard();
    p.revealed = [];
  });
  room.catastrophe   = pick(DATA.catastrophe);
  room.bunker        = pick(DATA.bunker);
  room.status        = 'playing';
  room.round         = 1;
  room.immunePlayers = [];
  room.currentEvent  = null;
  room.eventLog      = [];
  return room;
}

// =============================================
// РОЗКРИТТЯ АТРИБУТІВ
// =============================================
async function revealAttr(attrKey) {
  const room = await fetchRoom();
  if (!room) return;
  const me = room.players.find(p => p.id === myId);
  if (!me || !me.card) return;
  if (!me.revealed) me.revealed = [];
  if (me.revealed.includes(attrKey)) return;
  me.revealed.push(attrKey);
  await saveRoom(room);
  renderRoom(room);
}

// =============================================
// ЗДІБНОСТІ
// =============================================
let spyState = null;

async function useAbility(targetId, attrKey) {
  const room = await fetchRoom();
  if (!room) return;
  if (!room.log)           room.log = [];
  if (!room.immunePlayers) room.immunePlayers = [];

  const me = room.players.find(p => p.id === myId);
  if (!me || !me.card || !me.card.ability || me.card.abilityUsed) return;

  const ability = me.card.ability;

  if (ability.type === 'replace_attr') {
    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.card) return;
    const dataKey  = ATTR_TO_DATA[ability.attr];
    const oldValue = target.card[ability.attr];
    const newValue = pick(DATA[dataKey]);
    target.card[ability.attr] = newValue;
    me.card.abilityUsed = true;
    room.log.push(`[Здібність] ${me.name} → "${ability.name}": у ${target.name} змінено ${ATTR_LABELS[ability.attr]} ("${oldValue}" → "${newValue}")`);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  if (ability.type === 'immunity') {
    const target = room.players.find(p => p.id === targetId);
    if (!target) return;
    if (!room.immunePlayers.includes(target.id)) {
      room.immunePlayers.push(target.id);
    }
    me.card.abilityUsed = true;
    room.log.push(`[Здібність] ${me.name} → "${ability.name}": ${target.name} отримав імунітет`);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  if (ability.type === 'spy') {
    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.card) return;
    if ((ability.attr === 'one' || ability.attr === 'two') && !attrKey) {
      spyState = { targetId, ability };
      renderRoom(room);
      return;
    }
    me.card.abilityUsed = true;
    spyState = null;
    room.log.push(`[Здібність] ${me.name} використав шпигунську здібність`);
    await saveRoom(room);
    showSpyModal(target, ability, attrKey);
    renderRoom(room);
  }
}

function showSpyModal(target, ability, attrKey) {
  const existing = document.getElementById('spyModal');
  if (existing) existing.remove();
  const card = target.card;
  let content = '';
  if (ability.attr === 'all') {
    content = ATTR_KEYS.map(key => `
      <div class="attr-row">
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${card[key] || '—'}</span>
      </div>`).join('');
  } else if (ability.attr === 'one') {
    content = `<div class="attr-row">
      <span class="attr-label">${ATTR_LABELS[attrKey]}</span>
      <span class="attr-value">${card[attrKey] || '—'}</span>
    </div>`;
  } else if (ability.attr === 'two') {
    content = attrKey.split(',').map(key => `
      <div class="attr-row">
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${card[key] || '—'}</span>
      </div>`).join('');
  } else {
    content = `<div class="attr-row">
      <span class="attr-label">${ATTR_LABELS[ability.attr]}</span>
      <span class="attr-value">${card[ability.attr] || '—'}</span>
    </div>`;
  }
  const modal = document.createElement('div');
  modal.id = 'spyModal';
  modal.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;`;
  modal.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--rust);
      border-left:3px solid var(--rust-light);padding:24px;max-width:420px;width:100%;">
      <div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;
        text-transform:uppercase;margin-bottom:4px;">🔍 Шпигунство</div>
      <div style="color:var(--text-dim);font-size:12px;margin-bottom:16px;">
        Інформація про <b style="color:var(--text);">${target.name}</b> — тільки ви це бачите
      </div>
      ${content}
      <button onclick="document.getElementById('spyModal').remove()"
        style="margin-top:16px;">ОК, зрозумів</button>
    </div>`;
  document.body.appendChild(modal);
}

// =============================================
// ГОЛОСУВАННЯ
// =============================================
async function castVote(targetId) {
  if (hasVoted) return;
  const room = await fetchRoom();
  if (!room || !room.votingOpen) return;
  const immunePlayers = room.immunePlayers || [];
  if (immunePlayers.includes(targetId) && targetId !== 'skip') {
    alert('Цей гравець має імунітет! Оберіть іншого.');
    return;
  }
  if (!room.votes) room.votes = {};
  room.votes[myId] = targetId;
  hasVoted = true;
  await saveRoom(room);
  renderRoom(room);
}

async function closeVoting(room) {
  const votes      = room.votes || {};
  const skipCount  = Object.values(votes).filter(v => v === 'skip').length;
  if (!room.log)           room.log = [];
  if (!room.immunePlayers) room.immunePlayers = [];

  // Рахуємо реальні голоси (без скіпів і без імунних)
  const tally = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (targetId === 'skip') return;
    if (room.immunePlayers.includes(targetId)) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  // Скіпи по кожному гравцю
  if (!room.skipsUsed) room.skipsUsed = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (targetId === 'skip') {
      room.skipsUsed[voterId] = (room.skipsUsed[voterId] || 0) + 1;
    }
  });

  room.immunePlayers = [];

  // Якщо нема реальних голосів — всі пропустили
  if (Object.keys(tally).length === 0) {
    room.votingOpen = false;
    room.votes      = {};
    room.tieIds     = null;
    room.log.push(`Раунд ${room.round}: нікого не вигнали (${skipCount} пропустили)`);
    room.status = 'playing';
    room.round += 1;
    generateEventForRound(room);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // Максимум реальних голосів
  let maxVotes = 0;
  Object.values(tally).forEach(count => {
    if (count > maxVotes) maxVotes = count;
  });

  // Скіп переміг
  if (skipCount > maxVotes) {
    room.votingOpen = false;
    room.votes      = {};
    room.tieIds     = null;
    room.log.push(`Раунд ${room.round}: скіп переміг (${skipCount} vs ${maxVotes}) — нікого не вигнали`);
    room.status = 'playing';
    room.round += 1;
    generateEventForRound(room);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // Нічия між скіп і голосами
  if (skipCount === maxVotes) {
    room.votes      = {};
    room.votingOpen = true;
    room.tieIds     = null;
    hasVoted        = false;
    room.log.push(`Раунд ${room.round}: нічия між скіп і голосами — переголосування`);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  const topIds = Object.entries(tally)
    .filter(([id, count]) => count === maxVotes)
    .map(([id]) => id);

  // Нічия між гравцями
  if (topIds.length > 1) {
    room.votes      = {};
    room.votingOpen = true;
    room.tieIds     = topIds;
    hasVoted        = false;
    const names = topIds.map(id => room.players.find(p => p.id === id)?.name).join(' і ');
    room.log.push(`Раунд ${room.round}: нічия між ${names} — переголосування`);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // Виключення гравця
  const eliminatedId = topIds[0];
  const eliminated   = room.players.find(p => p.id === eliminatedId);
  if (eliminated) {
    eliminated.alive    = false;
    eliminated.revealed = [...ATTR_KEYS];
  }

  room.votingOpen = false;
  room.votes      = {};
  room.tieIds     = null;
  room.log.push(`Раунд ${room.round}: ${eliminated?.name} покинув бункер (${maxVotes} голосів, ${skipCount} пропустили)`);

  const alivePlayers = room.players.filter(p => p.alive);
  if (alivePlayers.length <= room.capacity) {
    room.status = 'ended';
  } else {
    room.status = 'playing';
    room.round += 1;
    generateEventForRound(room);
  }

  await saveRoom(room);
  renderRoom(room);
  if (room.status === 'ended') generateFinale(room);
}

// =============================================
// ФІНАЛ З ШІ
// =============================================
async function generateFinale(room) {
  const survivors  = room.players.filter(p => p.alive);
  const eliminated = room.players.filter(p => !p.alive);

  const survivorDesc = survivors.map(p => {
    const c = p.card;
    return `${p.name} — профессия: ${c.profession}, здоровье: ${c.health}, хобби: ${c.hobby}, навык: ${c.specialSkill}, багаж: ${c.luggage}, фобия: ${c.phobia}, биография: ${c.bioFact}`;
  }).join('\n');

  const eliminatedNames = eliminated.length
    ? eliminated.map(p => p.name).join(', ')
    : 'никто';

  const eventHistory = (room.eventLog || []).length
    ? '\nСобытия в бункере по раундам:\n' + room.eventLog.join('\n')
    : '';

  const prompt = `Ты — постапокалиптический рассказчик.
Катастрофа: ${room.catastrophe}
Бункер: ${room.bunker}

Выжившие:
${survivorDesc}

Выбыли из игры: ${eliminatedNames}

История голосований:
${(room.log || []).join('\n')}
${eventHistory}
Напиши короткий рассказ о том, как выжившие проживают в бункере. Будь максимально непристрасным, оценивай максимально правдиво не делая поблажек
Учитывай время проживания, все характеристики персонажей, местность и катастрофу. 

Правила вылазок и ресурсов:
1. Если катастрофа или оборудование позволяют, они могут ненадолго покидать убежище для сбора припасов.
2. СТРОГАЯ ЛОГИКА ПРЕДМЕТОВ: Все вещи, инструменты и медикаменты герои должны либо иметь в багаже изначально, либо смастерить из доступных материалов бункера, либо добыть во время описанных вылазок на поверхность. Ничего не должно появляться из ниоткуда.
3. оценивай состояние бункера и то что он может изнашеваться.         4. добавь что б проходило радномное событие по типу нашли в бункере какие-то вещи или завелась крыса( но не делай их слишком много что б небыло перенасышения ивентами)
В конце подведи итог: смогли ли они пережить этот срок или до какого года дожили. Так же смогли ли они потом востановить население и как они жили дальше после выхода из бункера(5-7 предложений)

`;

  try {
    document.getElementById('finaleText').textContent = 'Генеруємо історію...';
    const response = await fetch('https://bunker-gemini.vladpugac90.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Статус: ${response.status}`);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Порожня відповідь від Gemini');
    room.finale = text;
    await saveRoom(room);
    document.getElementById('finaleText').textContent = text;
  } catch (e) {
    console.error('Gemini error:', e);
    document.getElementById('finaleText').textContent = `Помилка: ${e.message}`;
  }
}

async function deleteRoom() {
  await fetch(`${DB_URL}/rooms/${roomCode}.json`, { method: 'DELETE' });
}