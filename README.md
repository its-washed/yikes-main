# Yikes

Premium all-in-one Discord bot for moderation, security, and community management.

## Features

- **98+ Commands** across moderation, server, utility, music, and fun
- **Fake Permissions** — strip dangerous permissions from roles via API
- **Honeypot System** — trap channels that auto-ban raid bots
- **Ticket System** — support tickets with buttons
- **Starboard** — showcase starred messages
- **Reaction Roles** — self-assignable roles
- **Auto Moderation** — spam detection, link filtering, word filters
- **Join to Create** — temporary voice channels
- **Ghost Ping** — auto-ghost ping new members
- **Counter Channels** — live server stats in voice channel names
- **Bump Reminders** — Disboard bump reminders
- **Leveling System** — XP, levels, and leaderboards
- **Suggestion System** — approve/deny suggestions with buttons

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

## Commands

### Moderation
| Command | Description |
|---------|-------------|
| `,ban` | Ban a member |
| `,unban` | Unban a user |
| `,kick` | Kick a member |
| `,mute` | Timeout a member |
| `,unmute` | Remove timeout |
| `,warn` | Issue a warning |
| `,warnings` | View warnings |
| `,clearwarn` | Remove warnings |
| `,purge` | Bulk delete messages |
| `,slowmode` | Set slowmode |
| `,lock` | Lock a channel |
| `,unlock` | Unlock a channel |
| `,nuke` | Clone and recreate channel |
| `,softban` | Ban + unban to purge messages |
| `,tempban` | Temporary ban |
| `,massban` | Ban multiple users |
| `,masskick` | Kick multiple users |
| `,roleall` | Give role to all members |
| `,deafen` | Deafen a member |
| `,undeafen` | Undeafen a member |
| `,voicekick` | Disconnect from voice |
| `,move` | Move to another voice channel |
| `,muteall` | Mute all in voice |
| `,unmuteall` | Unmute all in voice |
| `,freeze` | Freeze a channel |
| `,unfreeze` | Unfreeze a channel |
| `,history` | View mod history |

### Server
| Command | Description |
|---------|-------------|
| `,setup` | Interactive setup wizard |
| `,prefix` | Change command prefix |
| `,autorole` | Auto-assign roles |
| `,welcome` | Configure welcome messages |
| `,goodbye` | Configure farewell messages |
| `,logging` | Set audit log channel |
| `,antispam` | Configure anti-spam |
| `,automod` | Configure auto moderation |
| `,starboard` | Set up starboard |
| `,levels` | Configure leveling |
| `,fakeperms` | Strip dangerous permissions |
| `,honeypot` | Auto-ban trap channels |
| `,announce` | Create announcement embeds |
| `,giveaway` | Start a giveaway |
| `,hide` / `,unhide` | Hide/unhide channels |
| `,clone` | Clone a channel |
| `,category` | Create a category |
| `,rolecolor` | Change role color |
| `,lockdown` / `,unlockdown` | Lock/unlock all channels |
| `,bump` | Bump reminder |
| `,ticket` | Support ticket system |
| `,counter` | Counter channels |
| `,reactionrole` | Reaction role setup |
| `,suggestion` | Suggestion system |
| `,jointocreate` | Join-to-create voice |
| `,ghostpingsetup` | Auto ghost ping on join |

### Utility
| Command | Description |
|---------|-------------|
| `,botinfo` / `,bi` | Bot information |
| `,userinfo` / `,ui` | User information |
| `,serverinfo` / `,si` | Server information |
| `,avatar` | Get user avatar |
| `,role` | Add/remove roles |
| `,nick` | Change nickname |
| `,embed` | Create custom embeds |
| `,poll` | Create a poll |
| `,remind` | Set a reminder |
| `,snipe` | View deleted messages |
| `,translate` | Translate text |
| `,calc` | Calculator |
| `,ping` | Check latency |
| `,help` | Show all commands |
| `,uptime` | Bot uptime |
| `,stats` | Bot statistics |
| `,invite` | Bot invite link |
| `,support` | Support server |
| `,choose` | Choose between options |
| `,timer` | Set a timer |
| `,color` | Preview a color |
| `,base64` | Encode/decode base64 |
| `,hash` | Hash text |
| `,binary` | Convert to/from binary |
| `,roman` | Roman numeral converter |
| `,rank` | Check rank/level |
| `,leaderboard` | XP leaderboard |
| `,ghostping` | Ghost ping a user |
| `,note` | Save notes |
| `,todo` | To-do list |
| `,pomodoro` | Focus timer |
| `,reverse` | Reverse text |
| `,mock` | MoCk TeXt |
| `,spoiler` | Send spoiler text |
| `,charcount` | Count characters |
| `,remindme` | DM reminder |
| `,weather` | Weather info |
| `,define` | Dictionary lookup |
| `,google` | Google search |
| `,youtube` | YouTube search |
| `,github` | GitHub user info |
| `,webhook` | Manage webhooks |
| `,shutdown` | Shut down bot |

### Music
| Command | Description |
|---------|-------------|
| `,play` | Play a song |
| `,queue` | Show music queue |
| `,skip` | Skip current song |
| `,stop` | Stop and leave |
| `,nowplaying` | Currently playing |
| `,shuffle` | Shuffle queue |
| `,volume` | Set volume |
| `,loop` | Toggle loop mode |
| `,remove` | Remove from queue |
| `,bass` | Toggle bass boost |
| `,musicinfo` | Music system info |

### Fun
| Command | Description |
|---------|-------------|
| `,8ball` | Magic 8-ball |
| `,meme` | Random meme |
| `,coinflip` | Flip a coin |
| `,dice` | Roll a dice |
| `,rps` | Rock paper scissors |
| `,ship` | Ship two users |
| `,hug` | Hug someone |
| `,slap` | Slap someone |
| `,pat` | Pat someone |
| `,poke` | Poke someone |
| `,joke` | Random joke |
| `,f` | Pay respects |
| `,rate` | Rate something |
| `,quote` | Quote a message |
| `,urban` | Urban Dictionary |
| `,trivia` | Trivia game |
| `,lyrics` | Song lyrics |

## Tech Stack

- [Node.js](https://nodejs.org/)
- [discord.js v14](https://discord.js.org/)

## License

MIT

## Author

**its_washed** — [itswashed.lol](https://itswashed.lol)
