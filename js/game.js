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
    // 20% шанс отримати здібність
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

// Стан для шпигунства (двокроковий вибір)
let spyState = null; // { targetId, ability }

async function useAbility(targetId, attrKey) {
  const room = await fetchRoom();
  if (!room) return;
  if (!room.log)           room.log = [];
  if (!room.immunePlayers) room.immunePlayers = [];

  const me = room.players.find(p => p.id === myId);
  if (!me || !me.card || !me.card.ability || me.card.abilityUsed) return;

  const ability = me.card.ability;

  // --- Заміна атрибуту ---
  if (ability.type === 'replace_attr') {
    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.card) return;

    const dataKey  = ATTR_TO_DATA[ability.attr];
    const oldValue = target.card[ability.attr];
    const newValue = pick(DATA[dataKey]);

    target.card[ability.attr] = newValue;
    me.card.abilityUsed = true;

    room.log.push(
      `[Здібність] ${me.name} → "${ability.name}": ` +
      `у ${target.name} змінено ${ATTR_LABELS[ability.attr]} ` +
      `("${oldValue}" → "${newValue}")`
    );

    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // --- Імунітет ---
  if (ability.type === 'immunity') {
    const target = room.players.find(p => p.id === targetId);
    if (!target) return;

    if (!room.immunePlayers.includes(target.id)) {
      room.immunePlayers.push(target.id);
    }
    me.card.abilityUsed = true;
    room.log.push(
      `[Здібність] ${me.name} → "${ability.name}": ` +
      `${target.name} отримав імунітет від голосування`
    );

    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // --- Шпигунство ---
  if (ability.type === 'spy') {
    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.card) return;

    // Для 'one' і 'two' — двокроковий вибір атрибутів
    if ((ability.attr === 'one' || ability.attr === 'two') && !attrKey) {
      // Перший крок — показуємо вибір атрибутів
      spyState = { targetId, ability };
      renderRoom(room); // перемалює з вибором атрибутів
      return;
    }

    // Позначаємо як використану
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
    content = `
      <div class="attr-row">
        <span class="attr-label">${ATTR_LABELS[attrKey]}</span>
        <span class="attr-value">${card[attrKey] || '—'}</span>
      </div>`;

  } else if (ability.attr === 'two') {
    const keys = attrKey.split(',');
    content = keys.map(key => `
      <div class="attr-row">
        <span class="attr-label">${ATTR_LABELS[key]}</span>
        <span class="attr-value">${card[key] || '—'}</span>
      </div>`).join('');

  } else {
    content = `
      <div class="attr-row">
        <span class="attr-label">${ATTR_LABELS[ability.attr]}</span>
        <span class="attr-value">${card[ability.attr] || '—'}</span>
      </div>`;
  }

  const modal = document.createElement('div');
  modal.id = 'spyModal';
  modal.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:20px;
  `;
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
    </div>
  `;
  document.body.appendChild(modal);
}

// =============================================
// ГОЛОСУВАННЯ
// =============================================
async function castVote(targetId) {
  if (hasVoted) return;
  const room = await fetchRoom();
  if (!room || !room.votingOpen) return;

  // Перевірка імунітету
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
  const votes        = room.votes || {};
  const totalPlayers = room.players.length;
  const skipLimit    = getSkipLimit(totalPlayers);
  const roundSkips   = Object.values(votes).filter(v => v === 'skip').length;
  if (!room.log)           room.log = [];
  if (!room.immunePlayers) room.immunePlayers = [];

  // Рахуємо голоси (без скіпів і без імунних)
  const tally = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (targetId === 'skip') return;
    if (room.immunePlayers.includes(targetId)) return; // ігноруємо голоси проти імунних
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  // Скіпи по кожному гравцю
  if (!room.skipsUsed) room.skipsUsed = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (targetId === 'skip') {
      room.skipsUsed[voterId] = (room.skipsUsed[voterId] || 0) + 1;
    }
  });

  // Очищаємо імунітет після голосування
  room.immunePlayers = [];

  // Якщо всі пропустили або всі голоси проти імунних
  if (Object.keys(tally).length === 0) {
    room.votingOpen = false;
    room.votes      = {};
    room.tieIds     = null;
    room.log.push(`Раунд ${room.round}: нікого не вигнали (${roundSkips} пропустили)`);
    room.status = 'playing';
    room.round += 1;
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // Максимум голосів
  let maxVotes = 0;
  Object.values(tally).forEach(count => {
    if (count > maxVotes) maxVotes = count;
  });

  const topIds = Object.entries(tally)
    .filter(([id, count]) => count === maxVotes)
    .map(([id]) => id);

  // Нічия
  if (topIds.length > 1) {
    room.votes      = {};
    room.votingOpen = true;
    room.tieIds     = topIds;
    hasVoted        = false;
    const names = topIds
      .map(id => room.players.find(p => p.id === id)?.name)
      .join(' і ');
    room.log.push(`Раунд ${room.round}: нічия між ${names} — переголосування`);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  // Виключення
  const eliminatedId = topIds[0];
  const eliminated   = room.players.find(p => p.id === eliminatedId);
  if (eliminated) {
    eliminated.alive    = false;
    eliminated.revealed = [...ATTR_KEYS]; // відкриваємо всю картку
  }

  room.votingOpen = false;
  room.votes      = {};
  room.tieIds     = null;
  room.log.push(
    `Раунд ${room.round}: ${eliminated?.name} покинув бункер ` +
    `(${maxVotes} голосів, ${roundSkips} пропустили)`
  );

  const alivePlayers = room.players.filter(p => p.alive);
  if (alivePlayers.length <= room.capacity) {
    room.status = 'ended';
  } else {
    room.status = 'playing';
    room.round += 1;
  }

  await saveRoom(room);
  renderRoom(room);

  if (room.status === 'ended') generateFinale(room);
}

// =============================================
// ФІНАЛ З ШІ
// =============================================
async function generateFinale(room) {
  const survivors    = room.players.filter(p => p.alive);
  const survivorDesc = survivors.map(p => {
    const c = p.card;
    return `${p.name} — ${c.profession}, здоровье: ${c.health}, хобби: ${c.hobby}, навык: ${c.specialSkill}, багаж: ${c.luggage}`;
  }).join('\n');

  const prompt = `Ты — саркастичный постапокалиптический рассказчик.
Катастрофа: ${room.catastrophe}
Бункер: ${room.bunker}

Выжившие:
${survivorDesc}

История голосований:
${room.log.join('\n')}

Напиши короткий юмористический рассказ (10-15 предложений) о том, как эти люди живут в бункере.
Упомяни каждого выжившего по имени, его профессию и особый навык.
Добавь абсурдные ситуации связанные с их фобиями и багажом.
Финал должен быть неожиданным и смешным.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    const text = data.content[0].text;
    room.finale = text;
    await saveRoom(room);
    document.getElementById('finaleText').textContent = text;
  } catch (e) {
    document.getElementById('finaleText').textContent =
      'Не вдалося згенерувати історію. Але ви вижили — і це головне.';
  }
}