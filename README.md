# Yikes

Premium all-in-one Discord bot for moderation, security, and community management.

## Features

- **530 commands** across moderation, server, utility, music, fun, economy, and developer tools
- **Command groups** — all commands organized by category, viewable with `,help` or `,commandlist`
- **Sleek embed system** with variables, pagination, and template support
- **Security** — antinuke, fake permissions, auto-moderation, honeypot
- **Server management** — VoiceMaster, reaction roles, button roles, vanity roles, invite tracker, starboard, counters, boosters
- **System messages** — welcome, goodbye, boost, join DM, auto messages on interval
- **Activity tracking** — message and VC leaderboards with auto-updating channels
- **Economy** — business, laboratory, company, shop, fishing, hunting, crime, duels, trivia
- **Moderation** — ban, kick, mute, purge, mass actions, warnings, lock/unlock
- **Utility** — embeds, AFK, calc, QR codes, weather, wiki, timestamps, password generator
- **Music** — queue, play, skip, shuffle, volume, bass
- **Fun** — 8ball, memes, rps, ship, hack, quote, jokes, fakeban, and more

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
```

### Running

```bash
npm start
```

## Bot Intents

Enable these in the [Discord Developer Portal](https://discord.com/developers/applications) under your bot's settings:

- Presence Intent
- Server Members Intent
- Message Content Intent

## Command List

### Moderation (72)
`,ban`, `,unban`, `,kick`, `,mute`, `,unmute`, `,warn`, `,warnings`, `,unwarn`, `,purge`, `,nuke`, `,banall`, `,unbanall`, `,massban`, `,masskick`, `,massnick`, `,massrole`, `,lock`, `,unlock`, `,hide`, `,unhide`, `,lockdown`, `,purgelinks`, `,slowmode`, `,delmsg`, `,freeze`, `,unfreeze`, `,freezeall`, `,timeoutall`, `,softban`, `,tempban`, `,deafen`, `,undeafen`, `,move`, `,warnall`

### Server (98)
`,setup`, `,prefix`, `,welcome`, `,goodbye`, `,setwelcome`, `,setgoodbye`, `,setlogs`, `,setautorole`, `,autorole`, `,setstarboard`, `,starboard`, `,setbooster`, `,boosters`, `,boostrole`, `,boostconfig`, `,setcounter`, `,counter`, `,setantispam`, `,antispam`, `,automod`, `,fakeperms`, `,antinuke`, `,vanity`, `,reactionrole`, `,buttonmessage`, `,voicemaster`, `,systemmessage`, `,timer`, `,autorespond`, `,invites`, `,ticket`, `,giveaway`, `,announce`, `,clone`, `,category`, `,level`, `,autoreact`, `,alias`, `,youtube`, `,twitter`, `,twitch`, `,tiktok`, `,instagram`, `,setupactivity`, `,removeactivity`

### Utility (158)
`,embed`, `,help`, `,botinfo`, `,ping`, `,avatar`, `,banner`, `,userinfo`, `,serverinfo`, `,channelinfo`, `,roleinfo`, `,calc`, `,qr`, `,afk`, `,remind`, `,poll`, `,suggest`, `,links`, `,support`, `,afklist`, `,aliases`, `,commandlist`, `,commandcount`, `,color`, `,convert`, `,binary`, `,base64`, `,charcount`, `,age`, `,createdat`, `,choose`, `,crypto`, `,discover`, `,say`, `,dm`, `,editsnipe`, `,snipe`, `,stealemote`, `,weather`, `,wiki`, `,define`, `,password`, `,uuid`, `,timestamp`, `,members`, `,channels`, `,roles`, `,uptime`, `,activity`, `,activityleaderboard`

### Economy (29)
`,balance`, `,daily`, `,weekly`, `,monthly`, `,work`, `,beg`, `,pay`, `,deposit`, `,withdraw`, `,economyleaderboard`, `,coinflip`, `,slots`, `,roulette`, `,rob`, `,pray`, `,duel`, `,crime`, `,fish`, `,hunt`, `,trivia`, `,shop`, `,buy`, `,sell`, `,inventory`, `,interest`, `,business`, `,laboratory`, `,company`

### Fun (127)
`,8ball`, `,meme`, `,rate`, `,ship`, `,rps`, `,fact`, `,lovecalc`, `,insult`, `,compliment`, `,joke`, `,quote`, `,emojify`, `,advice`, `,fliptext`, `,hug`, `,lyrics`, `,howgay`, `,simp`, `,iq`, `,clap`, `,ascii`, `,bmi`, `,calculate`, `,roast`, `,trash`, `,bored`, `,hack`, `,urban`, `,frog`, `,cat`, `,fakeban`

### Developer (34)
`,eval`, `,exec`, `,shell`, `,servers`, `,serverinfodev`, `,broadcast`, `,leaveguild`, `,maintenance`, `,botstats`, `,blacklist`, `,backup`, `,restart`, `,deploy`, `,setstatus`, `,setactivity`, `,setavatar`, `,setbotname`, `,dm`, `,ghostping`, `,spam`, `,snipe`, `,editsnipe`, `,freezuser`, `,unfreezuser`, `,git`, `,npm`, `,env`, `,delmsg`, `,debug`, `,purge`, `,massrole`, `,stealemote`

### Music (12)
`,play`, `,stop`, `,skip`, `,queue`, `,shuffle`, `,loop`, `,volume`, `,bass`, `,nowplaying`, `,remove`, `,musicinfo`, `,musicmanage`

## Tech Stack

- [Node.js](https://nodejs.org/)
- [discord.js v14](https://discord.js.org/)
- [chalk](https://www.npmjs.com/package/chalk)

## License

MIT

## Author

**its_washed** — [itswashed.lol](https://itswashed.lol)
