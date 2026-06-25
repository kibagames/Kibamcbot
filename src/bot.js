const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

// ──────────────────────────────────────────────
//  CONFIG
// ──────────────────────────────────────────────
const CONFIG = {
  host: '144.31.46.7',
  port: 11641,
  username: 'KIBA_PersonalBot',  // 16 chars max — Minecraft username limit
  version: '1.21.11',        // detected via server ping (protocol 774)
  auth: 'offline',           // cracked / offline-mode server
  reconnectDelay: 5000,      // ms before reconnect attempt
  afkInterval: 30000,        // ms between anti-AFK moves

  // ── AUTHORIZATION ────────────────────────────
  // Only these usernames can issue bot commands.
  // Add your Minecraft username here.
  owners: ['KIBA', 'KIBA_OWNER'],
};

let bot = null;
let afkTimer = null;
let afkTapTimers = [];       // track nested tap/jump timeouts
let reconnectTimer = null;
let reconnectAttempts = 0;
let isReconnecting = false;  // single-flight guard

// ──────────────────────────────────────────────
//  LOGGER
// ──────────────────────────────────────────────
function log(level, msg) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${level.toUpperCase()}] ${msg}`);
}

// ──────────────────────────────────────────────
//  ANTI-AFK
// ──────────────────────────────────────────────
function clearAfkTaps() {
  for (const t of afkTapTimers) clearTimeout(t);
  afkTapTimers = [];
  // Make sure all movement keys are released
  if (bot) {
    for (const dir of ['left', 'right', 'forward', 'back', 'jump']) {
      try { bot.setControlState(dir, false); } catch (_) {}
    }
  }
}

function startAntiAfk() {
  stopAntiAfk();
  const directions = ['left', 'right', 'forward', 'back'];
  let i = 0;
  afkTimer = setInterval(() => {
    if (!bot || !bot.entity) return;
    const dir = directions[i % directions.length];
    i++;

    bot.setControlState(dir, true);
    const t1 = setTimeout(() => {
      if (bot) bot.setControlState(dir, false);
      afkTapTimers = afkTapTimers.filter(t => t !== t1);
    }, 300);
    afkTapTimers.push(t1);

    if (i % 3 === 0) {
      bot.setControlState('jump', true);
      const t2 = setTimeout(() => {
        if (bot) bot.setControlState('jump', false);
        afkTapTimers = afkTapTimers.filter(t => t !== t2);
      }, 200);
      afkTapTimers.push(t2);
    }

    log('afk', `Anti-AFK nudge: ${dir}`);
  }, CONFIG.afkInterval);
}

function stopAntiAfk() {
  if (afkTimer) {
    clearInterval(afkTimer);
    afkTimer = null;
  }
  clearAfkTaps();
}

// ──────────────────────────────────────────────
//  AUTHORIZATION
// ──────────────────────────────────────────────
function isOwner(username) {
  return CONFIG.owners.includes(username);
}

// ──────────────────────────────────────────────
//  COMMAND HANDLER  (triggered via chat / whisper)
// ──────────────────────────────────────────────
function handleCommand(sender, cmd) {
  if (!isOwner(sender)) {
    bot.chat(`Sorry ${sender}, you are not authorized to control me.`);
    log('warn', `Unauthorized command from ${sender}: ${cmd}`);
    return;
  }

  const args = cmd.trim().split(/\s+/);
  const command = args[0].toLowerCase();

  switch (command) {
    case '!help':
      bot.chat('Commands: !help !pos !health !inv !come !stop !version');
      break;

    case '!pos':
      if (bot.entity) {
        const p = bot.entity.position;
        bot.chat(`Position: X=${p.x.toFixed(1)} Y=${p.y.toFixed(1)} Z=${p.z.toFixed(1)}`);
      }
      break;

    case '!health':
      bot.chat(`Health: ${bot.health?.toFixed(1) ?? '?'}/20  Food: ${bot.food ?? '?'}/20`);
      break;

    case '!inv': {
      const items = bot.inventory.items();
      if (items.length === 0) {
        bot.chat('Inventory is empty.');
      } else {
        const summary = items.map(i => `${i.displayName}x${i.count}`).join(', ');
        bot.chat(`Inventory: ${summary}`);
      }
      break;
    }

    case '!come': {
      const target = bot.players[sender]?.entity;
      if (!target) {
        bot.chat(`Can't find ${sender}.`);
        break;
      }
      const defaultMove = new Movements(bot);
      bot.pathfinder.setMovements(defaultMove);
      bot.pathfinder.setGoal(new goals.GoalNear(
        target.position.x,
        target.position.y,
        target.position.z,
        2
      ));
      bot.chat(`Coming to ${sender}!`);
      break;
    }

    case '!stop':
      bot.pathfinder.setGoal(null);
      bot.chat('Stopped.');
      break;

    case '!version':
      bot.chat(`Running mineflayer on Minecraft ${bot.version}`);
      break;

    default:
      bot.chat(`Unknown command: ${command}. Type !help for a list.`);
      break;
  }
}

// ──────────────────────────────────────────────
//  RECONNECT  (single-flight)
// ──────────────────────────────────────────────
function scheduleReconnect() {
  // Guard: don't schedule if already waiting
  if (isReconnecting) return;
  isReconnecting = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  const delay = Math.min(CONFIG.reconnectDelay * reconnectAttempts, 60000);
  const actual = Math.max(delay, CONFIG.reconnectDelay);
  log('info', `Reconnecting in ${actual / 1000}s…`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    isReconnecting = false;   // clear flag before creating bot
    createBot();
  }, actual);
}

// ──────────────────────────────────────────────
//  CREATE BOT
// ──────────────────────────────────────────────
function createBot() {
  log('info', `Connecting to ${CONFIG.host}:${CONFIG.port} as ${CONFIG.username} (attempt ${++reconnectAttempts})…`);

  bot = mineflayer.createBot({
    host: CONFIG.host,
    port: CONFIG.port,
    username: CONFIG.username,
    version: CONFIG.version || undefined,
    auth: CONFIG.auth,
    hideErrors: false,
  });

  bot.loadPlugin(pathfinder);

  // ── Events ──────────────────────────────────

  bot.once('spawn', () => {
    reconnectAttempts = 0;
    log('info', `✓ Spawned as ${bot.username} on Minecraft ${bot.version}`);
    startAntiAfk();
    bot.chat('KIBA PERSONAL BOT is online!');
  });

  bot.on('chat', (username, message) => {
    log('chat', `<${username}> ${message}`);
    if (username === bot.username) return;
    if (message.startsWith('!')) handleCommand(username, message);
  });

  bot.on('whisper', (username, message) => {
    log('whisper', `[PM from ${username}] ${message}`);
    if (message.startsWith('!')) handleCommand(username, message);
  });

  bot.on('health', () => {
    if (bot.health <= 4) {
      log('warn', `Low health! (${bot.health}/20) – trying to eat…`);
      const food = bot.inventory.items().find(i =>
        i.name.includes('bread') ||
        i.name.includes('cooked') ||
        i.name.includes('apple') ||
        i.name.includes('carrot') ||
        i.name.includes('potato')
      );
      if (food) bot.equip(food, 'hand').then(() => bot.consume()).catch(() => {});
    }
  });

  bot.on('death', () => {
    log('warn', 'Bot died. Respawning…');
    bot.respawn();
  });

  // Use a single handler that guards with isReconnecting
  function onDisconnect(reason) {
    log('info', `Disconnected (${reason ?? 'unknown'})`);
    stopAntiAfk();
    scheduleReconnect();
  }

  bot.on('kicked', (reason) => {
    log('warn', `Kicked: ${reason}`);
    onDisconnect('kicked: ' + reason);
  });

  bot.on('error', (err) => {
    log('error', `Error: ${err.message}`);
  });

  bot.on('end', (reason) => {
    onDisconnect(reason);
  });
}

// ──────────────────────────────────────────────
//  GRACEFUL SHUTDOWN
// ──────────────────────────────────────────────
process.on('SIGINT', () => {
  log('info', 'Shutting down…');
  stopAntiAfk();
  isReconnecting = true; // prevent reconnect on shutdown
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (bot) {
    try { bot.chat('KIBA PERSONAL BOT going offline. Bye!'); } catch (_) {}
    bot.quit('shutdown');
  }
  process.exit(0);
});

// ──────────────────────────────────────────────
//  START
// ──────────────────────────────────────────────
log('info', '=== KIBA PERSONAL BOT starting ===');
log('info', `Authorized owners: ${CONFIG.owners.join(', ')}`);
createBot();
