# Yikes

Premium all-in-one Discord bot for moderation, security, and community management.

## Features

- **453 Commands** across moderation, server, utility, music, fun, economy, and developer tools
- Premium system with exclusive commands
- Developer tools for bot management
- Full economy system with gambling, jobs, and trading

## Setup

### Prerequisites

- [Node.js 18+](https://nodejs.org/)
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
git clone https://github.com/its-washed/yikes.git
cd yikes
npm install
```

### Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_bot_token_here
DEFAULT_PREFIX=,
```

### Running

```bash
npm start
```

## Bot Intents

Enable these in the [Discord Developer Portal](https://discord.com/developers/applications) under your bot's settings:

- ✅ Presence Intent
- ✅ Server Members Intent
- ✅ Message Content Intent

## Tech Stack

- [Node.js](https://nodejs.org/)
- [discord.js v14](https://discord.js.org/)

## License

MIT

## Author

**its_washed** — [itswashed.lol](https://itswashed.lol)
