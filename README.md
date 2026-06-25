# 🤖 KIBA PERSONAL BOT

A lightweight Minecraft bot built with [mineflayer](https://github.com/PrismarineJS/mineflayer) for **offline/cracked servers**.  
It auto-connects, stays online with anti-AFK, and responds to in-game commands from authorised owners.

---

## ✨ Features

- 🔌 **Auto-reconnect** — reconnects automatically after kicks or disconnects (backs off up to 60 s)
- 🏃 **Anti-AFK** — nudges movement every 30 s so the server never idles the bot out
- 🍞 **Auto-eat** — equips and eats food when health drops below 4 ❤️
- 💀 **Auto-respawn** — respawns automatically on death
- 🧭 **Pathfinding** — navigates to owners using `mineflayer-pathfinder`
- 💬 **Chat commands** — owner-only command system via public chat or `/msg`

---

## 📋 Requirements

| Tool | Version |
|------|---------|
| Node.js | 18 or higher |
| npm / pnpm | any |

---

## ⚡ Quick Start

```bash
# 1. Clone / download this repo
git clone https://github.com/your-username/kiba-personal-bot.git
cd kiba-personal-bot

# 2. Install dependencies
npm install

# 3. Edit config (host, port, username, owners)
nano src/bot.js

# 4. Run the bot
npm start
```

---

## ⚙️ Configuration

Open `src/bot.js` and edit the `CONFIG` block at the top:

```js
const CONFIG = {
  host: '144.31.46.7',       // ← Your server IP
  port: 11641,                // ← Your server port
  username: 'KIBA_PersonalBot', // ← In-game name (max 16 chars)
  version: '1.21.11',         // ← Must match your server version
  auth: 'offline',            // ← 'offline' for cracked servers
  reconnectDelay: 5000,       // ms before first reconnect attempt
  afkInterval: 30000,         // ms between anti-AFK nudges

  // Only these players can issue commands to the bot
  owners: ['KIBA', 'KIBA_OWNER'],  // ← Add your username here!
};
```

### Finding your server version

Run this one-liner to auto-detect the protocol/version:

```bash
node -e "
const dns = require('dns');
const net = require('net');
// Or just check your server's version.json / server.properties
console.log('Check your server panel or ask your host');
"
```

Or use a tool like [mcstatus.io](https://mcstatus.io) — paste your IP:port and it will show the version.

---

## 💬 Commands

Commands work in **public chat** and **private messages** (`/msg`).  
Only usernames listed in `CONFIG.owners` can use them.

| Command | Description |
|---------|-------------|
| `!help` | List all commands |
| `!pos` | Show the bot's current XYZ coordinates |
| `!health` | Show health and food levels |
| `!inv` | List items in the bot's inventory |
| `!come` | Bot pathfinds to your location |
| `!stop` | Stop all movement |
| `!version` | Show the connected Minecraft version |

**Example:**
```
<KIBA> !come
<KIBA_PersonalBot> Coming to KIBA!
```

---

## 📁 Project Structure

```
kiba-personal-bot/
├── src/
│   └── bot.js        # Main bot — config, events, commands
├── package.json
└── README.md
```

---

## 🛡️ Security Notes

- Commands are **owner-only** — any non-owner who types `!` commands gets denied.
- Do **not** commit your real server IP/port to a public repo if you want it private — use environment variables or a `.env` file and add `.env` to `.gitignore`.

### Using environment variables (optional)

```js
const CONFIG = {
  host: process.env.MC_HOST || '144.31.46.7',
  port: parseInt(process.env.MC_PORT || '11641'),
  // ...
};
```

```bash
MC_HOST=your.server.ip MC_PORT=25565 npm start
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| [mineflayer](https://github.com/PrismarineJS/mineflayer) | Minecraft bot API |
| [mineflayer-pathfinder](https://github.com/PrismarineJS/mineflayer-pathfinder) | Pathfinding / navigation |
| [vec3](https://github.com/nicktindall/vec3) | 3D vector math |

---

## 🤝 Contributing

Pull requests are welcome! For major changes, open an issue first.

---

## 📄 License

MIT — free to use, modify, and distribute.
