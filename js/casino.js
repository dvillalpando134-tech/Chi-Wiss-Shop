/* ============================================================
   Casino · ruleta, dados, moneda y mesa simulada
   ============================================================ */

import {
  COIN_SIDES,
  DICE_MULTIPLIERS,
  FEED_BETS,
  GAMES,
  PLAYERS,
  RIVAL,
  ROULETTE_COLORS,
  ROULETTE_SEQUENCE,
  rouletteColor,
} from "./config.js";
import {
  getCartCount,
  getCartLines,
  getState,
  getSubtotal,
  resetCasino,
  settleRound,
  subscribe,
} from "./store.js";
import {
  animateNumber,
  escapeHTML,
  formatMXN,
  formatSigned,
  formatTime,
  pick,
  prefersReducedMotion,
  randomInt,
  timeAgo,
  uid,
} from "./format.js";
import { announce, icon, toast } from "./ui.js";

/* ---------- Estado local del módulo ---------- */

const bets = {
  roulette: { type: "color", value: "rojo" },
  dice: { type: "sum", value: 7 },
  coin: { type: "side", value: "cara" },
};

const visual = {
  roulette: null,
  dice: [3, 4],
  coin: "cara",
};

let elements = {};
let initialized = false;
let mounted = false;
let activeGame = "roulette";
let playing = false;
let wheelRotation = 0;
let coinRotation = 0;
let lastBalance = 0;
let rivalStatus = "Esperando tu jugada…";
let feed = [];
let feedTimer = 0;
let feedAgeTimer = 0;

const reducedMotion = () => prefersReducedMotion();

/* ---------- Pequeños helpers de dominio ---------- */

function multiplierFor(game, bet) {
  if (game === "roulette") {
    return bet.type === "number" ? 35 : ROULETTE_COLORS[bet.value].multiplier;
  }
  if (game === "dice") return DICE_MULTIPLIERS[bet.value] ?? 1;
  return COIN_SIDES[bet.value].multiplier;
}

function betLabel(game, bet) {
  if (game === "roulette") {
    return bet.type === "number"
      ? `Número ${bet.value}`
      : ROULETTE_COLORS[bet.value].label;
  }
  if (game === "dice") return `Suma ${bet.value}`;
  return COIN_SIDES[bet.value].label;
}

function resultLabel(game, result) {
  if (game === "roulette") {
    return `Salió ${result.number} · ${ROULETTE_COLORS[result.color].label}`;
  }
  if (game === "dice") {
    return `${result.dice[0]} + ${result.dice[1]} = ${result.sum}`;
  }
  return result.side === "cara" ? "Salió cara" : "Salió cruz";
}

function isWinner(game, bet, result) {
  if (game === "roulette") {
    return bet.type === "number"
      ? result.number === bet.value
      : result.color === bet.value;
  }
  if (game === "dice") return result.sum === bet.value;
  return result.side === bet.value;
}

function rivalBetFor(game) {
  if (game === "roulette") {
    return Math.random() < 0.55
      ? { type: "color", value: pick(["rojo", "uva", "verde"]) }
      : { type: "number", value: randomInt(0, 36) };
  }
  if (game === "dice") return { type: "sum", value: randomInt(2, 12) };
  return { type: "side", value: pick(["cara", "cruz"]) };
}

/* ---------- Visuales ---------- */

function wheelMarkup() {
  const step = 360 / ROULETTE_SEQUENCE.length;
  const stops = ROULETTE_SEQUENCE.map((number, index) => {
    const from = index * step;
    const to = (index + 1) * step;
    return `var(--roulette-${rouletteColor(number)}) ${from}deg ${to}deg`;
  }).join(", ");

  const labels = ROULETTE_SEQUENCE.map((number, index) => {
    const angle = index * step + step / 2;
    return `<span class="wheel__label" style="--angle:${angle}deg">${number}</span>`;
  }).join("");

  const last =
    visual.roulette === null
      ? "—"
      : `${visual.roulette} · ${ROULETTE_COLORS[rouletteColor(visual.roulette)].label}`;

  return `
    <div class="wheel-wrap">
      <span class="wheel__pointer" aria-hidden="true"></span>
      <div
        class="wheel"
        style="--rotation:${wheelRotation}deg; transform:rotate(${wheelRotation}deg); --wheel:conic-gradient(from 0deg, ${stops})"
        role="img"
        aria-label="Ruleta europea de 37 números"
      >
        ${labels}
        <span class="wheel__hub">CW</span>
      </div>
    </div>
    <p class="visual-caption">
      <span>Último giro</span>
      <strong data-wheel-result>${last}</strong>
      <span>37 sectores</span>
    </p>
  `;
}

function dieMarkup(face, label) {
  return `<div class="die" data-face="${face}" role="img" aria-label="${label}">${"<i></i>".repeat(
    9,
  )}</div>`;
}

function diceMarkup(faces) {
  const sum = faces[0] + faces[1];
  return `
    <div class="dice-wrap">
      <div class="dice-tray" data-sum="${sum}">
        ${dieMarkup(faces[0], "Dado 1")}
        ${dieMarkup(faces[1], "Dado 2")}
      </div>
      <p class="visual-caption">
        <span>Suma</span>
        <strong data-dice-sum>${sum}</strong>
        <span>de 12</span>
      </p>
    </div>
  `;
}

function coinMarkup(face) {
  return `
    <div class="coin-wrap">
      <div class="coin-scene">
        <div class="coin" data-face="${face}" style="transform:rotateY(${coinRotation}deg)">
          <span class="coin__face coin__face--front">CARA</span>
          <span class="coin__face coin__face--back">CRUZ</span>
        </div>
      </div>
      <p class="visual-caption">
        <span>Último lanzamiento</span>
        <strong data-coin-face>${face.toUpperCase()}</strong>
        <span>50 / 50</span>
      </p>
    </div>
  `;
}

function visualMarkup() {
  if (activeGame === "roulette") return wheelMarkup();
  if (activeGame === "dice") return diceMarkup(visual.dice);
  return coinMarkup(visual.coin);
}

/* ---------- Controles ---------- */

function playRow(multiplier) {
  const subtotal = getSubtotal();
  const count = getCartCount();
  const game = GAMES[activeGame];

  return `
    <div class="play-row">
      <div class="play-row__stat">
        <span>Apuesta completa</span>
        <strong data-stake-label>${formatMXN(subtotal)}</strong>
      </div>
      <div class="play-row__stat play-row__stat--mult">
        <span>Pago</span>
        <strong data-mult-label>x${multiplier}</strong>
      </div>
      <button class="btn btn--lilac btn--full play-btn" type="button" data-play
        ${subtotal <= 0 ? "disabled" : ""}>
        ${icon(game.icon)}
        <span data-play-label>${game.action}</span>
      </button>
    </div>
    <p class="play-note">
      ${icon("users")}
      <span data-play-note>${
        subtotal > 0
          ? `Juegas contra ${RIVAL.name} · ${count} ${count === 1 ? "ítem" : "ítems"} en tu bolsa`
          : "Agrega objetos a tu bolsa para empezar a apostar."
      }</span>
    </p>
  `;
}

function rouletteControls() {
  const selected = bets.roulette;
  const isColor = selected.type === "color";
  const multiplier = isColor
    ? ROULETTE_COLORS[selected.value].multiplier
    : 35;

  const colors = Object.entries(ROULETTE_COLORS)
    .map(
      ([key, config]) => `
        <button class="bet-chip bet-chip--${key} ${
          isColor && selected.value === key ? "is-selected" : ""
        }" type="button" data-bet-type="color" data-bet-value="${key}"
          aria-pressed="${isColor && selected.value === key}">
          <i aria-hidden="true"></i>${config.label}<small>x${config.multiplier}</small>
        </button>`,
    )
    .join("");

  const numbers = Array.from({ length: 37 }, (_, number) => {
    const color = rouletteColor(number);
    const active = !isColor && selected.value === number;
    return `<button class="number-btn number-btn--${color} ${
      active ? "is-selected" : ""
    }" type="button" data-bet-type="number" data-bet-value="${number}"
      aria-pressed="${active}" aria-label="Número ${number}, ${ROULETTE_COLORS[color].label}">${number}</button>`;
  }).join("");

  return `
    <div class="bet-panel">
      <div class="bet-panel__head">
        <div>
          <p class="overline">Tu apuesta</p>
          <h3>¿Dónde cae la bola?</h3>
        </div>
        <span class="multiplier" data-multiplier>x${multiplier}</span>
      </div>

      <div class="bet-group">
        <span class="bet-group__label">Color</span>
        <div class="bet-options bet-options--colors">${colors}</div>
      </div>

      <div class="bet-group">
        <span class="bet-group__label">Número exacto <small>x35</small></span>
        <div class="number-grid" role="group" aria-label="Elegir número ganador">
          ${numbers}
        </div>
      </div>

      ${playRow(multiplier)}
    </div>
  `;
}

function diceControls() {
  const selected = bets.dice.value;
  const multiplier = DICE_MULTIPLIERS[selected];

  const sums = Array.from({ length: 11 }, (_, index) => index + 2)
    .map(
      (sum) => `
        <button class="sum-btn ${selected === sum ? "is-selected" : ""}" type="button"
          data-bet-type="sum" data-bet-value="${sum}" aria-pressed="${selected === sum}">
          <strong>${sum}</strong><small>x${DICE_MULTIPLIERS[sum]}</small>
        </button>`,
    )
    .join("");

  return `
    <div class="bet-panel">
      <div class="bet-panel__head">
        <div>
          <p class="overline">Tu apuesta</p>
          <h3>¿Qué suma saldrá?</h3>
        </div>
        <span class="multiplier" data-multiplier>x${multiplier}</span>
      </div>

      <div class="bet-group">
        <span class="bet-group__label">Suma de los dos dados</span>
        <div class="sum-grid" role="group" aria-label="Elegir suma de los dados">
          ${sums}
        </div>
      </div>

      ${playRow(multiplier)}
    </div>
  `;
}

function coinControls() {
  const selected = bets.coin.value;
  const multiplier = 2;

  const options = Object.entries(COIN_SIDES)
    .map(
      ([key, config]) => `
        <button class="coin-bet ${selected === key ? "is-selected" : ""}" type="button"
          data-bet-type="side" data-bet-value="${key}" aria-pressed="${selected === key}">
          <span class="coin-bet__symbol" aria-hidden="true">${key === "cara" ? "C" : "X"}</span>
          <strong>${config.label}</strong>
          <small>x${config.multiplier}</small>
        </button>`,
    )
    .join("");

  return `
    <div class="bet-panel">
      <div class="bet-panel__head">
        <div>
          <p class="overline">Tu apuesta</p>
          <h3>¿Cara o cruz?</h3>
        </div>
        <span class="multiplier" data-multiplier>x${multiplier}</span>
      </div>

      <div class="bet-group">
        <span class="bet-group__label">Elige un lado de la moneda</span>
        <div class="coin-options">${options}</div>
      </div>

      ${playRow(multiplier)}
    </div>
  `;
}

function controlsMarkup() {
  if (activeGame === "roulette") return rouletteControls();
  if (activeGame === "dice") return diceControls();
  return coinControls();
}

/* ---------- Render ---------- */

function renderGame() {
  if (!elements.visual || !elements.controls) return;

  elements.visual.innerHTML = visualMarkup();
  elements.controls.innerHTML = controlsMarkup();

  if (elements.panel) {
    elements.panel.setAttribute("aria-labelledby", `tab-${activeGame}`);
  }

  if (playing) {
    elements.controls.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  } else {
    syncStake();
  }
}

function renderControls() {
  if (!elements.controls) return;
  elements.controls.innerHTML = controlsMarkup();
  if (playing) {
    elements.controls.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });
  }
}

function renderStake() {
  if (!elements.stakeValue) return;

  const lines = getCartLines();
  const subtotal = getSubtotal();
  const count = getCartCount();

  elements.stakeValue.textContent = formatMXN(subtotal);
  elements.stakeBadge.textContent = `${count} ${count === 1 ? "ítem" : "ítems"}`;
  elements.stakeMeta.textContent = count
    ? `${count} ${count === 1 ? "producto" : "productos"} · apuesta completa`
    : "Tu bolsa está vacía.";

  if (!lines.length) {
    elements.stakeList.innerHTML = `<li class="stake-list__empty">Agrega objetos para apostar.</li>`;
    return;
  }

  const visible = lines.slice(0, 5);
  const extra = lines.length - visible.length;

  elements.stakeList.innerHTML = `
    ${visible
      .map(
        (line) => `
        <li>
          <span>${escapeHTML(line.name)} <small>×${line.qty}</small></span>
          <strong>${formatMXN(line.lineTotal)}</strong>
        </li>`,
      )
      .join("")}
    ${
      extra > 0
        ? `<li class="stake-list__more">+ ${extra} ${extra === 1 ? "producto" : "productos"} más</li>`
        : ""
    }
  `;
}

function syncStake() {
  const subtotal = getSubtotal();
  const count = getCartCount();

  document
    .querySelectorAll("[data-stake-label]")
    .forEach((element) => (element.textContent = formatMXN(subtotal)));

  const playButton = elements.controls?.querySelector("[data-play]");
  if (playButton && !playing) playButton.disabled = subtotal <= 0;

  const note = elements.controls?.querySelector("[data-play-note]");
  if (note) {
    note.textContent =
      subtotal > 0
        ? `Juegas contra ${RIVAL.name} · ${count} ${count === 1 ? "ítem" : "ítems"} en tu bolsa`
        : "Agrega objetos a tu bolsa para empezar a apostar.";
  }
}

function renderWallet(state, animate = false) {
  const { balance } = state.casino;

  if (elements.balanceValue) {
    if (animate) {
      animateNumber(elements.balanceValue, lastBalance, balance, 720);
    } else {
      elements.balanceValue.textContent = formatMXN(balance);
    }
    elements.balanceValue.classList.toggle("is-negative", balance < 0);
  }

  elements.wallet?.classList.toggle("is-negative", balance < 0);

  if (elements.balanceDelta) {
    const latest = state.casino.history[0];
    elements.balanceDelta.classList.remove("is-win", "is-lose");
    if (latest) {
      elements.balanceDelta.textContent = `${formatSigned(latest.profit)} en la última jugada`;
      elements.balanceDelta.classList.add(latest.win ? "is-win" : "is-lose");
    } else {
      elements.balanceDelta.textContent = "Sin movimientos";
    }
  }

  if (elements.novaBalance) {
    elements.novaBalance.textContent = formatMXN(state.casino.rivalBalance);
  }

  if (elements.menuBalance) {
    elements.menuBalance.textContent = formatMXN(balance);
  }

  if (elements.novaStatus) {
    elements.novaStatus.textContent = rivalStatus;
  }

  lastBalance = balance;
}

function renderHistory(state) {
  if (!elements.historyList) return;

  const history = state.casino.history;
  elements.historyCount.textContent = String(history.length);

  if (!history.length) {
    elements.historyList.innerHTML = `
      <li class="history-empty">
        ${icon("history")}
        <span>Todavía no hay jugadas. Elige un juego y apuesta tu bolsa.</span>
      </li>`;
    return;
  }

  elements.historyList.innerHTML = history
    .map(
      (entry) => `
      <li class="history-item ${entry.win ? "is-win" : "is-lose"}">
        <span class="history-item__icon">${icon(GAMES[entry.game]?.icon ?? "spark")}</span>
        <div class="history-item__copy">
          <strong>${escapeHTML(entry.gameLabel)} · ${escapeHTML(entry.betLabel)}</strong>
          <span>${escapeHTML(entry.resultLabel)} · ${formatTime(entry.createdAt)}</span>
        </div>
        <span class="history-item__amount">${formatSigned(entry.profit)}</span>
      </li>`,
    )
    .join("");
}

function renderResult(entry) {
  if (!elements.roundResult) return;

  elements.roundResult.hidden = false;
  elements.roundResult.className = `round-result ${entry.win ? "is-win" : "is-lose"}`;
  elements.roundResult.innerHTML = `
    <span class="round-result__icon">${icon(entry.win ? "spark" : "alert")}</span>
    <div class="round-result__copy">
      <strong>${entry.win ? "Ganaste" : "Perdiste"} ${formatSigned(entry.profit)}</strong>
      <span>${escapeHTML(entry.gameLabel)} · ${escapeHTML(
        entry.betLabel,
      )} · ${escapeHTML(entry.resultLabel)}</span>
      <small>${escapeHTML(entry.rivalLabel)}</small>
    </div>
    <span class="round-result__balance">
      <small>Saldo actualizado</small>
      <strong>${formatMXN(getState().casino.balance)}</strong>
    </span>
  `;
}

/* ---------- Feed de la mesa ---------- */

function makeFeedEvent(at = Date.now()) {
  const game = pick(Object.keys(FEED_BETS));
  const bet = pick(FEED_BETS[game]);
  const win = Math.random() < 0.46;
  const amount = randomInt(2, 60) * 50 * (win ? 1 : -1);

  return {
    id: uid("feed"),
    player: pick(PLAYERS),
    game,
    bet,
    win,
    amount,
    at,
  };
}

function renderFeed() {
  if (!elements.liveFeed) return;

  elements.liveFeed.innerHTML = feed
    .map(
      (event) => `
      <li class="feed-item">
        <span class="feed-avatar" aria-hidden="true">${escapeHTML(
          event.player.charAt(0),
        )}</span>
        <div class="feed-item__copy">
          <strong>${escapeHTML(event.player)}</strong>
          <span>${escapeHTML(GAMES[event.game].label)} · ${escapeHTML(
            event.bet,
          )} <em>${timeAgo(event.at)}</em></span>
        </div>
        <span class="feed-item__amount ${event.win ? "is-win" : "is-lose"}">
          ${formatSigned(event.amount)}
        </span>
      </li>`,
    )
    .join("");
}

function seedFeed() {
  feed = Array.from({ length: 5 }, (_, index) =>
    makeFeedEvent(Date.now() - randomInt(8, 55) * 1000 * (index + 1)),
  ).sort((a, b) => b.at - a.at);
  renderFeed();
}

function startFeed() {
  stopFeed();
  seedFeed();

  feedTimer = window.setInterval(() => {
    feed = [makeFeedEvent(), ...feed].slice(0, 6);
    renderFeed();
  }, 7000);

  feedAgeTimer = window.setInterval(renderFeed, 12000);
}

function stopFeed() {
  window.clearInterval(feedTimer);
  window.clearInterval(feedAgeTimer);
  feedTimer = 0;
  feedAgeTimer = 0;
}

/* ---------- Animaciones de juego ---------- */

function spinRoulette(resultNumber) {
  const wheel = elements.visual?.querySelector(".wheel");
  if (!wheel) return;

  const index = ROULETTE_SEQUENCE.indexOf(resultNumber);
  const step = 360 / ROULETTE_SEQUENCE.length;
  const target = -(index * step + step / 2);

  const currentMod = ((wheelRotation % 360) + 360) % 360;
  const targetMod = ((target % 360) + 360) % 360;
  let delta = targetMod - currentMod;
  if (delta < 0) delta += 360;

  wheelRotation += 360 * 6 + delta;
  wheel.style.setProperty("--rotation", `${wheelRotation}deg`);
  wheel.style.transform = `rotate(${wheelRotation}deg)`;
  wheel.classList.add("is-spinning");
}

function animateDice(finalFaces) {
  const tray = elements.visual?.querySelector(".dice-tray");
  if (!tray) return;

  const dice = [...tray.querySelectorAll(".die")];
  const sumEl = elements.visual?.querySelector("[data-dice-sum]");
  tray.classList.add("is-rolling");

  if (reducedMotion()) {
    dice.forEach((die, index) => {
      die.dataset.face = String(finalFaces[index]);
    });
    if (sumEl) sumEl.textContent = String(finalFaces[0] + finalFaces[1]);
    tray.classList.remove("is-rolling");
    return;
  }

  let ticks = 0;
  const interval = window.setInterval(() => {
    dice.forEach((die) => {
      die.dataset.face = String(randomInt(1, 6));
    });
    ticks += 1;
    if (ticks > 10) {
      window.clearInterval(interval);
      dice.forEach((die, index) => {
        die.dataset.face = String(finalFaces[index]);
      });
      if (sumEl) sumEl.textContent = String(finalFaces[0] + finalFaces[1]);
      tray.classList.remove("is-rolling");
    }
  }, 100);
}

function flipCoin(side) {
  const coin = elements.visual?.querySelector(".coin");
  if (!coin) return;

  const targetBase = side === "cruz" ? 180 : 0;
  const currentMod = ((coinRotation % 360) + 360) % 360;
  let delta = targetBase - currentMod;
  if (delta < 0) delta += 360;

  coinRotation += 1440 + delta;
  coin.style.transform = `rotateY(${coinRotation}deg)`;
}

/* ---------- Jugar ---------- */

function setPlaying(value) {
  playing = value;

  elements.controls?.querySelectorAll("button").forEach((button) => {
    button.disabled = value;
  });

  if (elements.reset) elements.reset.disabled = value;

  if (!value) syncStake();
}

function play() {
  if (playing || !mounted) return;

  const stake = getSubtotal();
  if (stake <= 0) {
    toast("Tu bolsa está vacía. Agrega objetos para apostar.", "error");
    announce("Tu bolsa está vacía. Agrega objetos para apostar.");
    return;
  }

  const game = activeGame;
  const bet = { ...bets[game] };
  const multiplier = multiplierFor(game, bet);

  setPlaying(true);
  if (elements.roundResult) elements.roundResult.hidden = true;

  let result;
  let delay;

  if (game === "roulette") {
    const number = randomInt(0, 36);
    result = { number, color: rouletteColor(number) };
    delay = reducedMotion() ? 420 : 3450;
    spinRoulette(number);
  } else if (game === "dice") {
    const dice = [randomInt(1, 6), randomInt(1, 6)];
    result = { dice, sum: dice[0] + dice[1] };
    delay = reducedMotion() ? 420 : 1650;
    animateDice(dice);
  } else {
    const side = pick(["cara", "cruz"]);
    result = { side };
    delay = reducedMotion() ? 420 : 1850;
    flipCoin(side);
  }

  window.setTimeout(() => settle(game, bet, stake, multiplier, result), delay);
}

function settle(game, bet, stake, multiplier, result) {
  const win = isWinner(game, bet, result);
  const profit = win ? Math.round(stake * (multiplier - 1)) : -stake;

  const rivalBet = rivalBetFor(game);
  const rivalMultiplier = multiplierFor(game, rivalBet);
  const rivalWin = isWinner(game, rivalBet, result);
  const rivalProfit = rivalWin
    ? Math.round(stake * (rivalMultiplier - 1))
    : -stake;

  const entry = {
    id: uid("round"),
    game,
    gameLabel: GAMES[game].label,
    betLabel: betLabel(game, bet),
    resultLabel: resultLabel(game, result),
    stake,
    multiplier,
    win,
    profit,
    rivalLabel: `${RIVAL.name} jugó a ${betLabel(
      game,
      rivalBet,
    )} y ${rivalWin ? "ganó" : "perdió"} ${formatSigned(rivalProfit)}.`,
    rivalWin,
    rivalProfit,
    createdAt: Date.now(),
  };

  rivalStatus = entry.rivalLabel;

  settleRound({ entry, profit, rivalProfit });

  if (game === "roulette") {
    visual.roulette = result.number;
    const caption = elements.visual?.querySelector("[data-wheel-result]");
    if (caption) {
      caption.textContent = `${result.number} · ${
        ROULETTE_COLORS[result.color].label
      }`;
    }
    elements.visual?.querySelector(".wheel")?.classList.remove("is-spinning");
  } else if (game === "dice") {
    visual.dice = result.dice;
  } else {
    visual.coin = result.side;
    const caption = elements.visual?.querySelector("[data-coin-face]");
    if (caption) caption.textContent = result.side.toUpperCase();
  }

  renderResult(entry);
  setPlaying(false);

  announce(
    `${win ? "Ganaste" : "Perdiste"} ${formatSigned(profit)}. ${
      entry.resultLabel
    }. Saldo actual: ${formatMXN(getState().casino.balance)}.`,
  );

  if (win && Math.abs(profit) >= 3000) {
    toast(`¡Gran jugada! ${formatSigned(profit)} para tu saldo demo.`, "success");
  }
}

/* ---------- Tabs ---------- */

function selectGame(game, focusTab = false) {
  if (!GAMES[game] || game === activeGame) return;
  if (playing) {
    toast("Deja que termine la jugada antes de cambiar de juego.", "info", 2400);
    return;
  }

  activeGame = game;

  const tabs = [...elements.tabs.querySelectorAll("[role='tab']")];
  tabs.forEach((tab) => {
    const selected = tab.dataset.game === game;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focusTab) tab.focus();
  });

  renderGame();
  if (elements.roundResult) elements.roundResult.hidden = true;
}

function handleTabKeys(event) {
  const tabs = [...elements.tabs.querySelectorAll("[role='tab']")];
  const index = tabs.indexOf(document.activeElement);
  if (index < 0) return;

  let next = null;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    next = (index + 1) % tabs.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    next = (index - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    next = 0;
  } else if (event.key === "End") {
    next = tabs.length - 1;
  }

  if (next === null) return;
  event.preventDefault();
  selectGame(tabs[next].dataset.game, true);
}

/* ---------- Init / mount ---------- */

export function initCasino() {
  if (initialized) return;
  initialized = true;

  elements = {
    visual: document.getElementById("gameVisual"),
    controls: document.getElementById("gameControls"),
    panel: document.getElementById("gamePanel"),
    tabs: document.getElementById("gameTabs"),
    roundResult: document.getElementById("roundResult"),
    historyList: document.getElementById("historyList"),
    historyCount: document.getElementById("historyCount"),
    balanceValue: document.getElementById("balanceValue"),
    balanceDelta: document.getElementById("balanceDelta"),
    wallet: document.getElementById("wallet"),
    reset: document.getElementById("resetCasino"),
    stakeValue: document.getElementById("stakeValue"),
    stakeMeta: document.getElementById("stakeMeta"),
    stakeBadge: document.getElementById("stakeBadge"),
    stakeList: document.getElementById("stakeList"),
    novaBalance: document.getElementById("novaBalance"),
    novaStatus: document.getElementById("novaStatus"),
    liveFeed: document.getElementById("liveFeed"),
    menuBalance: document.getElementById("menuBalance"),
  };

  elements.tabs?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-game]");
    if (tab) selectGame(tab.dataset.game);
  });

  elements.tabs?.addEventListener("keydown", handleTabKeys);

  elements.controls?.addEventListener("click", (event) => {
    const betButton = event.target.closest("[data-bet-type]");
    if (betButton && !playing) {
      const type = betButton.dataset.betType;
      const raw = betButton.dataset.betValue;
      const value = type === "number" || type === "sum" ? Number(raw) : raw;
      bets[activeGame] = { type, value };
      renderControls();
      elements.controls
        .querySelector(`[data-bet-type="${type}"][data-bet-value="${raw}"]`)
        ?.focus();
      return;
    }

    if (event.target.closest("[data-play]")) play();
  });

  elements.reset?.addEventListener("click", () => {
    if (playing) return;

    const confirmed = window.confirm(
      "¿Reiniciar el saldo demo, el saldo de Nova IA y todo el historial?",
    );
    if (!confirmed) return;

    resetCasino();
    rivalStatus = "Esperando tu jugada…";
    visual.roulette = null;
    visual.dice = [3, 4];
    visual.coin = "cara";
    wheelRotation = 0;
    coinRotation = 0;
    if (elements.roundResult) elements.roundResult.hidden = true;
    lastBalance = 0;
    renderWallet(getState(), false);
    renderStake();
    toast("Casino reiniciado. Saldo demo en $0.", "info");
    announce("Casino reiniciado. Saldo demo en $0.");
  });

  subscribe((state, changed) => {
    if (changed.includes("casino")) {
      renderWallet(state, true);
      renderHistory(state);
    }
    if (changed.includes("cart")) {
      renderStake();
      syncStake();
    }
  });

  renderWallet(getState(), false);
  renderStake();
  renderHistory(getState());
}

export function mountCasino() {
  if (!initialized) initCasino();
  mounted = true;
  activeGame = activeGame || "roulette";

  if (elements.roundResult) elements.roundResult.hidden = true;
  renderGame();
  renderStake();
  renderWallet(getState(), false);
  renderHistory(getState());
  startFeed();
}

export function unmountCasino() {
  mounted = false;
  stopFeed();
}
