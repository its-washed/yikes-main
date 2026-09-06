# Yikes

Premium all-in-one Discord bot for moderation, security, and community management.

## Features

- **198 Commands** across moderation, server, utility, music, and fun
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
- **Booster Roles** — custom booster role system with gradient colors and icons
- **AFK System** — set AFK status, notify when mentioned
- **Anime Card Trading** — claim, collect, and trade anime character cards
- **UWULock** — lock users to only send uwu messages

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

### Moderation (37)
| Command | Description |
|---------|-------------|
| `,ban` | Ban a member |
| `,unban` | Unban a user |
| `,kick` | Kick a member |
| `,mute` | Timeout a member |
| `,unmute` | Remove timeout |
| `,untimeout` | Remove timeout from member |
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
| `,massban` | Ban multiple users at once |
| `,masskick` | Kick multiple users at once |
| `,roleall` | Give role to all members |
| `,deafen` | Deafen a member |
| `,undeafen` | Undeafen a member |
| `,deafenall` | Deafen all in voice |
| `,undeafenall` | Undeafen all in voice |
| `,voicekick` | Disconnect from voice |
| `,move` | Move to another voice channel |
| `,muteall` | Mute all in voice |
| `,unmuteall` | Unmute all in voice |
| `,freeze` | Freeze a channel (admin only) |
| `,unfreeze` | Unfreeze a channel |
| `,history` | View mod history |
| `,uwulock` | Lock user to uwu messages |

### Server (33)
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
| `,hide` | Hide a channel |
| `,unhide` | Unhide a channel |
| `,clone` | Clone a channel |
| `,category` | Create a category |
| `,rolecolor` | Change role color |
| `,lockdown` | Lock all channels |
| `,unlockdown` | Unlock all channels |
| `,bump` | Bump reminder |
| `,ticket` | Support ticket system |
| `,counter` | Counter channels |
| `,reactionrole` | Reaction role setup |
| `,suggestion` | Suggestion system |
| `,jointocreate` | Join-to-create voice |
| `,ghostpingsetup` | Auto ghost ping on join |
| `,boostersetup` | Configure booster role |
| `,boostconfig` | Booster role position/settings |
| `,boostrole` | Customize your booster role |
| `,boosters` | View all server boosters |
| `,boostlog` | Set boost log channel |

### Utility (52)
| Command | Description |
|---------|-------------|
| `,botinfo` / `,bi` | Bot information |
| `,userinfo` / `,ui` | User information |
| `,whois` | Detailed user info |
| `,serverinfo` / `,si` | Server information |
| `,serverstats` | Detailed server stats |
| `,serverage` | Show server age |
| `,serveravatar` | Get server icon |
| `,serverbanner` | Get server banner |
| `,avatar` | Get user avatar |
| `,role` | Add/remove roles |
| `,roleinfo` | Get role info |
| `,rolecount` | Show all roles |
| `,channelinfo` | Get channel info |
| `,nick` | Change nickname |
| `,embed` | Create custom embeds |
| `,say` | Make bot say something |
| `,poll` | Quick yes/no poll |
| `,poll2` | Advanced poll with timer |
| `,pollresults` | Check poll results |
| `,remindme` | DM reminder |
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
| `,spoiler` | Send spoiler text |
| `,charcount` | Count characters |
| `,weather` | Weather info |
| `,define` | Dictionary lookup |
| `,google` | Google search |
| `,youtube` | YouTube search |
| `,github` | GitHub user info |
| `,webhook` | Manage webhooks |
| `,shutdown` | Shut down bot |
| `,firstmessage` | Get first message in channel |
| `,membercount` | Show member count |
| `,emojicount` | Show emoji count |
| `,perms` | Check user permissions |
| `,badge` | Check user badges |
| `,pronouns` | Check user pronouns |
| `,spotify` | Show Spotify presence |
| `,largeemojis` | Send emojis full size |
| `,removereaction` | Remove reactions from message |
| `,discover` | Discover servers |

### Social Lookups (8)
| Command | Description |
|---------|-------------|
| `,steam` | Get Steam profile |
| `,roblox` | Get Roblox user info |
| `,tiktok` | Get TikTok profile |
| `,instagram` | Get Instagram profile |
| `,twitter` | Get Twitter/X profile |
| `,twitch` | Get Twitch streamer info |
| `,reddit` | Get Reddit user info |
| `,crypto` | Get cryptocurrency price |

### Music (11)
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

### Fun (47)
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
| `,fact` | Random fun fact |
| `,character` | Random anime character |
| `,advice` | Random advice |
| `,bored` | Activity suggestion |
| `,card` | Draw a playing card |
| `,race` | Race animals |
| `,typingtest` | Test typing speed |
| `,binarygame` | Guess binary numbers |
| `,emojify` | Convert text to flag emojis |
| `,clap` | CLAP YOUR TEXT |
| `,owo` | OwO-ify text |
| `,uwuify` | UwU-ify text |
| `,zalgo` | Zalgo text |
| `,vaporwave` | Vaporwave text |
| `,fliptext` | Flip text upside down |
| `,typewriter` | Typing effect |
| `,mock` | MoCk TeXt |
| `,reverse` | Reverse text |
| `,claim` | Claim anime card |
| `,cards` | View your cards |
| `,cardinfo` | Get card info |
| `,trade` | Trade a card |
| `,deletecard` | Delete a card |
| `,topcards` | Top collectors |
| `,qr` | Generate QR code |
| `,shorten` | Shorten a URL |
| `,age` | Calculate age |
| `,iplookup` | IP lookup (placeholder) |

## Tech Stack

- [Node.js](https://nodejs.org/)
- [discord.js v14](https://discord.js.org/)

## License

MIT

## Author

**its_washed** — [itswashed.lol](https://itswashed.lol)
