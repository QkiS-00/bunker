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

function formatMonths(months) {
  if (currentLang === 'uk') {
    if (months < 12) return months + ' міс.';
    const years = Math.floor(months / 12);
    const rem   = months % 12;
    if (rem === 0) return years + ' р.';
    return years + ' р. ' + rem + ' міс.';
  } else {
    if (months < 12) return months + ' мес.';
    const years = Math.floor(months / 12);
    const rem   = months % 12;
    if (rem === 0) return years + ' л.';
    return years + ' л. ' + rem + ' мес.';
  }
}

function generateEventForRound(room) {
  room.currentEvent = Math.random() < 0.1 ? pick(BUNKER_EVENTS) : null;
  if (room.currentEvent) {
    room.eventLog = room.eventLog || [];
    room.eventLog.push('Раунд ' + room.round + ': ' + room.currentEvent);
  }
}

// =============================================
// ГЕНЕРАЦІЯ ПЕРСОНАЖІВ
// =============================================
function generateCard() {
  const d = currentLang === 'uk' ? DATA_UK : DATA;
  return {
    genderAge:    pick(d.genderAge),
    profession:   pick(d.professions),
    health:       pick(d.health),
    hobby:        pick(d.hobbies),
    phobia:       pick(d.phobias),
    luggage:      pick(d.luggage),
    bioFact:      pick(d.bioFact),
    specialSkill: pick(d.specialSkill),
    ability:      Math.random() < 0.2 ? pick(ABILITIES) : null,
    abilityUsed:  false,
    neighborAbility:     Math.random() < 0.08,
    neighborAbilityUsed: false
  };
}

function dealCards(room) {
  const fo = currentLang === 'uk' ? FOOD_OPTIONS_UK  : FOOD_OPTIONS;
  const wo = currentLang === 'uk' ? WATER_OPTIONS_UK : WATER_OPTIONS;

  room.players.forEach(p => {
    p.card     = generateCard();
    p.revealed = [];
  });

  const d = currentLang === 'uk' ? DATA_UK : DATA;
  room.catastrophe   = pick(d.catastrophe);
  room.bunker        = pick(d.bunker);
  room.status        = 'playing';
  room.round         = 1;
  room.immunePlayers = [];
  room.currentEvent  = null;
  room.eventLog      = [];
  room.lang          = currentLang;

  const foodMonths  = Math.floor(Math.random() * 180) + 1;
  const waterMonths = Math.floor(Math.random() * 180) + 1;
  room.food  = pick(fo) + ' — ' + formatMonths(foodMonths);
  room.water = pick(wo) + ' — ' + formatMonths(waterMonths);

  room.neighborBunker   = Math.random() < 0.08 ? pick(NEIGHBOR_BUNKERS) : null;
  room.neighborRevealed = false;

  return room;
}

// =============================================
// СУСІДНІЙ БУНКЕР
// =============================================
async function revealNeighbor() {
  const room = await fetchRoom();
  if (!room || !room.neighborBunker) return;
  const me = room.players.find(p => p.id === myId);
  if (!me || !me.card || !me.card.neighborAbility || me.card.neighborAbilityUsed) return;

  room.neighborRevealed       = true;
  me.card.neighborAbilityUsed = true;
  room.log = room.log || [];
  room.log.push('[' + t('neighborBunker') + '] ' + me.name + ': ' + room.neighborBunker.name);

  await saveRoom(room);
  renderRoom(room);
}
window.revealNeighbor = revealNeighbor;

// =============================================
// КІК ТА ПЕРЕДАЧА ЛІДЕРСТВА
// =============================================
async function kickPlayer(targetId) {
  const room = await fetchRoom();
  if (!room || room.hostId !== myId) return;
  const target = room.players.find(p => p.id === targetId);
  if (!target) return;
  if (!confirm(t('kickBtn') + ': ' + target.name + '?')) return;
  room.players = room.players.filter(p => p.id !== targetId);
  room.log = room.log || [];
  room.log.push('[Кік] ' + target.name);
  await saveRoom(room);
  renderRoom(room);
}
window.kickPlayer = kickPlayer;

async function transferHost(targetId) {
  const room = await fetchRoom();
  if (!room || room.hostId !== myId) return;
  const target = room.players.find(p => p.id === targetId);
  if (!target) return;
  if (!confirm(t('transferHost') + ': ' + target.name + '?')) return;
  room.hostId = targetId;
  await saveRoom(room);
  isHost = false;
  renderRoom(room);
}
window.transferHost = transferHost;

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
window.revealAttr = revealAttr;

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
  const labels  = getAttrLabels();

  if (ability.type === 'replace_attr') {
    const target = room.players.find(p => p.id === targetId);
    if (!target || !target.card) return;
    const d        = currentLang === 'uk' ? DATA_UK : DATA;
    const dataKey  = ATTR_TO_DATA[ability.attr];
    const oldValue = target.card[ability.attr];
    const newValue = pick(d[dataKey]);
    target.card[ability.attr] = newValue;
    me.card.abilityUsed = true;
    room.log.push('[' + t('ability') + '] ' + me.name + ' → "' + ability.name + '": ' + target.name + ' ' + labels[ability.attr] + ': "' + oldValue + '" → "' + newValue + '"');
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  if (ability.type === 'immunity') {
    const target = room.players.find(p => p.id === targetId);
    if (!target) return;
    if (!room.immunePlayers.includes(target.id)) room.immunePlayers.push(target.id);
    me.card.abilityUsed = true;
    room.log.push('[' + t('ability') + '] ' + me.name + ' → "' + ability.name + '": ' + target.name + ' ' + t('immune'));
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
    room.log.push('[' + t('ability') + '] ' + me.name + ' — шпигунство');
    await saveRoom(room);
    showSpyModal(target, ability, attrKey);
    renderRoom(room);
  }
}
window.useAbility = useAbility;

function showSpyModal(target, ability, attrKey) {
  const existing = document.getElementById('spyModal');
  if (existing) existing.remove();
  const card   = target.card;
  const labels = getAttrLabels();
  let content  = '';

  if (ability.attr === 'all') {
    content = ATTR_KEYS.map(key =>
      '<div class="attr-row"><span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + (card[key] || '—') + '</span></div>'
    ).join('');
  } else if (ability.attr === 'one') {
    content = '<div class="attr-row"><span class="attr-label">' + labels[attrKey] + '</span><span class="attr-value">' + (card[attrKey] || '—') + '</span></div>';
  } else if (ability.attr === 'two') {
    content = attrKey.split(',').map(key =>
      '<div class="attr-row"><span class="attr-label">' + labels[key] + '</span><span class="attr-value">' + (card[key] || '—') + '</span></div>'
    ).join('');
  } else {
    content = '<div class="attr-row"><span class="attr-label">' + labels[ability.attr] + '</span><span class="attr-value">' + (card[ability.attr] || '—') + '</span></div>';
  }

  const modal = document.createElement('div');
  modal.id = 'spyModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML =
    '<div style="background:var(--card);border:1px solid var(--rust);border-left:3px solid var(--rust-light);padding:24px;max-width:420px;width:100%;">' +
      '<div style="color:var(--rust-light);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">🔍 ' + t('ability') + '</div>' +
      '<div style="color:var(--text-dim);font-size:12px;margin-bottom:16px;">' + target.name + ' — ' + (currentLang === 'uk' ? 'тільки ви це бачите' : 'только вы это видите') + '</div>' +
      content +
      '<button onclick="document.getElementById(\'spyModal\').remove()" style="margin-top:16px;">OK</button>' +
    '</div>';
  document.body.appendChild(modal);
}

function updateSpyCheck() {
  const checks = document.querySelectorAll('#spyAttrPicks input:checked');
  const btn    = document.getElementById('spyConfirmBtn');
  if (!btn) return;
  const count     = checks.length;
  btn.disabled    = count !== 2;
  btn.textContent = (currentLang === 'uk' ? 'Підглянути' : 'Подглядеть') + ' (' + count + '/2)';
  if (count > 2) checks[checks.length - 1].checked = false;
}
window.updateSpyCheck = updateSpyCheck;

async function confirmSpyTwo() {
  const checks = document.querySelectorAll('#spyAttrPicks input:checked');
  if (checks.length !== 2) return;
  const attrKey = Array.from(checks).map(c => c.value).join(',');
  await useAbility(spyState.targetId, attrKey);
}
window.confirmSpyTwo = confirmSpyTwo;

// =============================================
// ГОЛОСУВАННЯ
// =============================================
async function castVote(targetId) {
  if (hasVoted) return;
  const room = await fetchRoom();
  if (!room || !room.votingOpen) return;
  const immunePlayers = room.immunePlayers || [];
  if (immunePlayers.includes(targetId) && targetId !== 'skip') {
    alert(t('hasImmune'));
    return;
  }
  if (!room.votes) room.votes = {};
  room.votes[myId] = targetId;
  hasVoted = true;
  await saveRoom(room);
  renderRoom(room);
}
window.castVote = castVote;

async function closeVoting(room) {
  const votes     = room.votes || {};
  const skipCount = Object.values(votes).filter(v => v === 'skip').length;
  if (!room.log)           room.log = [];
  if (!room.immunePlayers) room.immunePlayers = [];

  const tally = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (targetId === 'skip') return;
    if (room.immunePlayers.includes(targetId)) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  if (!room.skipsUsed) room.skipsUsed = {};
  Object.entries(votes).forEach(([voterId, targetId]) => {
    if (targetId === 'skip') {
      room.skipsUsed[voterId] = (room.skipsUsed[voterId] || 0) + 1;
    }
  });

  room.immunePlayers = [];

  if (Object.keys(tally).length === 0) {
    room.votingOpen = false; room.votes = {}; room.tieIds = null;
    room.log.push(t('round') + ' ' + room.round + ': ' + (currentLang === 'uk' ? 'нікого не вигнали (' + skipCount + ' пропустили)' : 'никого не выгнали (' + skipCount + ' пропустили)'));
    room.status = 'playing'; room.round += 1;
    generateEventForRound(room);
    await saveRoom(room); renderRoom(room); return;
  }

  let maxVotes = 0;
  Object.values(tally).forEach(count => { if (count > maxVotes) maxVotes = count; });

  if (skipCount > maxVotes) {
    room.votingOpen = false; room.votes = {}; room.tieIds = null;
    room.log.push(t('round') + ' ' + room.round + ': ' + t('skip') + ' ' + (currentLang === 'uk' ? 'переміг' : 'победил'));
    room.status = 'playing'; room.round += 1;
    generateEventForRound(room);
    await saveRoom(room); renderRoom(room); return;
  }

  if (skipCount === maxVotes) {
    room.votes = {}; room.votingOpen = true; room.tieIds = null; hasVoted = false;
    room.log.push(t('round') + ' ' + room.round + ': ' + (currentLang === 'uk' ? 'нічия — переголосування' : 'ничья — переголосование'));
    await saveRoom(room); renderRoom(room); return;
  }

  const topIds = Object.entries(tally).filter(([id, count]) => count === maxVotes).map(([id]) => id);

  if (topIds.length > 1) {
    room.votes = {}; room.votingOpen = true; room.tieIds = topIds; hasVoted = false;
    const names = topIds.map(id => room.players.find(p => p.id === id)?.name).join(' і ');
    room.log.push(t('round') + ' ' + room.round + ': ' + (currentLang === 'uk' ? 'нічия між ' : 'ничья между ') + names);
    await saveRoom(room); renderRoom(room); return;
  }

  const eliminatedId = topIds[0];
  const eliminated   = room.players.find(p => p.id === eliminatedId);
  if (eliminated) { eliminated.alive = false; eliminated.revealed = [...ATTR_KEYS]; }

  room.votingOpen = false; room.votes = {}; room.tieIds = null;
  room.log.push(t('round') + ' ' + room.round + ': ' + (eliminated?.name) + ' ' + (currentLang === 'uk' ? 'покинув бункер' : 'покинул бункер') + ' (' + maxVotes + ' ' + (currentLang === 'uk' ? 'голосів' : 'голосов') + ')');

  const alivePlayers = room.players.filter(p => p.alive);
  if (alivePlayers.length <= room.capacity) {
    room.status = 'ended';
  } else {
    room.status = 'playing'; room.round += 1;
    generateEventForRound(room);
  }

  await saveRoom(room); renderRoom(room);
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
    return p.name + ' — ' + c.profession + ', ' + c.health + ', ' + c.hobby + ', ' + c.specialSkill + ', ' + c.luggage + ', ' + c.phobia + ', ' + c.bioFact;
  }).join('\n');

  const eliminatedNames = eliminated.length ? eliminated.map(p => p.name).join(', ') : (currentLang === 'uk' ? 'ніхто' : 'никто');
  const eventHistory    = (room.eventLog || []).length ? '\n' + (currentLang === 'uk' ? 'Події в бункері' : 'События в бункере') + ':\n' + room.eventLog.join('\n') : '';
  const neighborInfo    = (room.neighborBunker && room.neighborRevealed)
    ? '\n' + (currentLang === 'uk' ? 'Сусідній бункер' : 'Соседний бункер') + ': ' + room.neighborBunker.name + ' (' + (room.neighborBunker.type === 'hostile' ? (currentLang === 'uk' ? 'ворожий' : 'враждебный') : (currentLang === 'uk' ? 'дружній' : 'дружественный')) + ') — ' + room.neighborBunker.desc
    : '';

  const lang = currentLang === 'uk' ? 'українською мовою' : 'на русском языке';

  const prompt = (currentLang === 'uk' ? 'Ти — постапокаліптичний оповідач. Відповідай ' : 'Ты — постапокалиптический рассказчик. Отвечай ') + lang + '.\n' +
    (currentLang === 'uk' ? 'Катастрофа' : 'Катастрофа') + ': ' + room.catastrophe + '\n' +
    (currentLang === 'uk' ? 'Бункер' : 'Бункер') + ': ' + room.bunker + '\n' +
    (currentLang === 'uk' ? 'Їжа' : 'Еда') + ': ' + (room.food || '—') + '\n' +
    (currentLang === 'uk' ? 'Вода' : 'Вода') + ': ' + (room.water || '—') + '\n' +
    neighborInfo + '\n\n' +
    (currentLang === 'uk' ? 'Виживші' : 'Выжившие') + ':\n' + survivorDesc + '\n\n' +
    (currentLang === 'uk' ? 'Вибули' : 'Выбыли') + ': ' + eliminatedNames + '\n\n' +
    (currentLang === 'uk' ? 'Голосування' : 'Голосования') + ':\n' + (room.log || []).join('\n') + '\n' +
    eventHistory + '\n\n' +
    (currentLang === 'uk'
      ? 'Напиши розповідь про те, як вижилі живуть у бункері. Враховуй характеристики кожного. У кінці підведи підсумок: чи змогли вони вижити.'
      : 'Напиши рассказ о том, как выжившие живут в бункере. Учитывай характеристики каждого. В конце подведи итог: смогли ли они выжить.');

  try {
    document.getElementById('finaleText').textContent     = t('generating');
    document.getElementById('finaleText').style.fontStyle = 'italic';
    document.getElementById('finaleText').style.color     = 'var(--text-dim)';

    const response = await fetch('https://bunker-gemini.vladpugac90.workers.dev/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) throw new Error('Статус: ' + response.status);
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(currentLang === 'uk' ? 'Порожня відповідь від Gemini' : 'Пустой ответ от Gemini');

    room.finale = text;
    await saveRoom(room);
    document.getElementById('finaleText').textContent     = text;
    document.getElementById('finaleText').style.fontStyle = 'normal';
    document.getElementById('finaleText').style.color     = 'var(--text)';
  } catch (e) {
    console.error('Gemini error:', e);
    document.getElementById('finaleText').textContent = (currentLang === 'uk' ? 'Помилка: ' : 'Ошибка: ') + e.message;
  }
}

async function deleteRoom() {
  await fetch(DB_URL + '/rooms/' + roomCode + '.json', { method: 'DELETE' });
}