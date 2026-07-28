// =============================================
// ГЕНЕРАЦІЯ ПЕРСОНАЖІВ
// =============================================
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCard() {
  return {
    profession:   pick(DATA.professions),
    health:       pick(DATA.health),
    hobby:        pick(DATA.hobbies),
    phobia:       pick(DATA.phobias),
    luggage:      pick(DATA.luggage),
    bioFact:      pick(DATA.bioFact),
    specialSkill: pick(DATA.specialSkill)
  };
}

function dealCards(room) {
  room.players.forEach(p => {
    p.card     = generateCard();
    p.revealed = [];
  });
  room.catastrophe = pick(DATA.catastrophe);
  room.bunker      = pick(DATA.bunker);
  room.status      = 'playing';
  room.round       = 1;
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

  // Захист від null з Firebase
  if (!me.revealed) me.revealed = [];
  if (me.revealed.includes(attrKey)) return;

  me.revealed.push(attrKey);
  await saveRoom(room);
  renderRoom(room);
}


// =============================================
// ГОЛОСУВАННЯ
// =============================================
async function castVote(targetId) {
  if (hasVoted) return;
  const room = await fetchRoom();
  if (!room || !room.votingOpen) return;
  if (!room.votes) room.votes = {};
  room.votes[myId] = targetId;
  hasVoted = true;
  await saveRoom(room);
  renderRoom(room);
}

async function closeVoting(room) {
  const tally = {};
  Object.values(room.votes).forEach(targetId => {
    tally[targetId] = (tally[targetId] || 0) + 1;
  });

  let maxVotes     = 0;
  let eliminatedId = null;
  Object.entries(tally).forEach(([id, count]) => {
    if (count > maxVotes) { maxVotes = count; eliminatedId = id; }
  });

  const topIds = Object.entries(tally)
    .filter(([id, count]) => count === maxVotes)
    .map(([id]) => id);

  if (topIds.length > 1) {
    room.votes      = {};
    room.votingOpen = true;
    room.tieIds     = topIds;
    hasVoted        = false;
    room.log.push(`Раунд ${room.round}: нічия — переголосування`);
    await saveRoom(room);
    renderRoom(room);
    return;
  }

  const eliminated = room.players.find(p => p.id === eliminatedId);
  if (eliminated) eliminated.alive = false;

  room.votingOpen = false;
  room.votes      = {};
  room.tieIds     = null;
  room.log.push(
    eliminated
      ? `Раунд ${room.round}: ${eliminated.name} покинув бункер (${maxVotes} голосів)`
      : `Раунд ${room.round}: нікого не вигнали`
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

  if (room.status === 'ended') {
    generateFinale(room);
  }
}

// =============================================
// ФІНАЛ З ШІ
// =============================================
async function generateFinale(room) {
  const survivors = room.players.filter(p => p.alive);
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