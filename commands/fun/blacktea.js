const fs = require('fs');
const path = require('path');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { record } = require('../../utils/gameStats');

const WORDLIST_PATH = path.join(__dirname, '../../data/wordlist.txt');

let words = null;
let wordsSet = null;

function loadWords() {
    if (!words) {
        words = fs.readFileSync(WORDLIST_PATH, 'utf8').split(/\r?\n/).filter(Boolean);
    }
    return words;
}

function hasWord(word) {
    if (!wordsSet) wordsSet = new Set(loadWords().map(w => w.toLowerCase()));
    return wordsSet.has(String(word).toLowerCase());
}

function randomPrefix() {
    const pool = loadWords().filter(word => word.length > 3);
    const word = pool[Math.floor(Math.random() * pool.length)] || 'blacktea';
    return word.slice(0, 3).toLowerCase();
}

function createEmbed(description, emoji, mention) {
    return {
        color: 0x729bb0,
        description: mention ? `${emoji} ${mention}: ${description}` : `${emoji} ${description}`
    };
}

class BlackTeaGame {
    constructor() {
        this.gameActive = false;
        this.lifes = new Map();
        this.players = [];
        this.message = null;
        this.channel = null;
        this.guild = null;
        this.activeContent = null;
        this.awaiting = null;
        this.timer = null;
    }

    stop() {
        this.gameActive = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.resolveWait) {
            const resolve = this.resolveWait;
            this.resolveWait = null;
            resolve();
        }
        this.awaiting = null;
        this.activeContent = null;
        if (games) {
            for (const [guildId, game] of games) {
                if (game === this) games.delete(guildId);
            }
        }
    }

    settle() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.resolveWait) {
            const resolve = this.resolveWait;
            this.resolveWait = null;
            resolve();
        }
    }

    eliminate(userId) {
        this.players = this.players.filter(id => id !== userId);
        if (this.players.length === 1 && this.gameActive) {
            const winner = this.players[0];
            record(winner, null, 'win', 'blacktea');
            this.channel.send({ embeds: [{ color: COLORS.WARNING, description: `🥇 <@${winner}> Won the game!` }] }).catch(() => {});
            this.stop();
        }
    }

    handleGuess(message) {
        if (!this.gameActive || !this.awaiting) return false;
        if (message.channel.id !== (this.channel && this.channel.id)) return false;
        if (String(message.author.id) !== String(this.awaiting.userId)) return false;

        const prefix = this.awaiting.prefix;
        const strikes = this.lifes.get(message.author.id) || 0;
        const content = message.content.toLowerCase();

        if (content.includes(prefix) && hasWord(content)) {
            message.react('✅').catch(() => {});
            this.awaiting = null;
            this.settle();
            return true;
        }

        const nextStrikes = strikes + 1;
        this.lifes.set(message.author.id, nextStrikes);
        const remaining = 3 - nextStrikes;

        if (nextStrikes >= 3) {
            message.channel.send({ embeds: [{ color: COLORS.ERROR, description: `☠️ <@${message.author.id}> You're eliminated!` }] }).catch(() => {});
            record(null, message.author.id, 'win', 'blacktea');
            this.eliminate(message.author.id);
        } else {
            message.channel.send({
                embeds: [{ color: COLORS.ERROR, description: `💥 <@${message.author.id}>: Wrong answer! You have **${remaining}** lifes left!` }]
            }).catch(() => {});
            this.awaiting = null;
        }
        this.settle();
        return true;
    }

    timeoutTurn() {
        if (!this.gameActive || !this.awaiting) return;
        const userId = this.awaiting.userId;
        const strikes = this.lifes.get(userId) || 0;
        const nextStrikes = strikes + 1;
        this.lifes.set(userId, nextStrikes);
        const remaining = 3 - nextStrikes;

        if (nextStrikes >= 3) {
            this.channel.send({ embeds: [{ color: COLORS.ERROR, description: `☠️ <@${userId}> You're eliminated!` }] }).catch(() => {});
            record(null, userId, 'win', 'blacktea');
            this.eliminate(userId);
        } else {
            this.channel.send({
                embeds: [{ color: COLORS.ERROR, description: `⏰ <@${userId}>: Time is up! You have **${remaining}** lifes left!` }]
            }).catch(() => {});
            this.awaiting = null;
        }
    }

    async runLoop() {
        const EMOJI = '🍵';
        while (this.gameActive && this.players.length > 1) {
            for (const userId of [...this.players]) {
                if (!this.gameActive) break;
                if (!this.players.includes(userId)) continue;
                const prefix = randomPrefix();
                const timestamp = Math.floor(Date.now() / 1000) + 10;
                this.awaiting = { userId, prefix };
                this.activeContent = prefix;
                try {
                    await this.channel.send({
                        content: `<@${userId}>`,
                        embeds: [createEmbed(`Say a word containing **\`${prefix}\`**\n> Time ends <t:${timestamp}:R>`, EMOJI, `<@${userId}>`)]
                    });
                } catch (err) {
                    this.stop();
                    return;
                }
                await new Promise(resolve => {
                    this.resolveWait = resolve;
                    this.timer = setTimeout(() => {
                        this.timer = null;
                        const done = this.resolveWait;
                        this.resolveWait = null;
                        if (this.awaiting && this.awaiting.userId === userId) {
                            this.awaiting = null;
                            this.timeoutTurn();
                        }
                        if (done) done();
                    }, 10000);
                });
                this.resolveWait = null;
                this.timer = null;
                if (this.awaiting && this.awaiting.userId === userId) {
                    this.awaiting = null;
                }
                if (!this.gameActive) break;
            }
        }
        if (this.gameActive && this.players.length < 2) this.stop();
    }
}

const games = new Map();
const starting = new Set();

async function startGame(message, client) {
    const guildId = message.guild.id;
    if (games.has(guildId) || starting.has(guildId)) {
        return warn(message, 'There is **already** a blacktea game **in progress**');
    }
    starting.add(guildId);
    try {
        const game = new BlackTeaGame();
        game.channel = message.channel;
        game.guild = message.guild;

        const embed = {
            color: 0x729bb0,
            title: 'BlackTea Matchmaking',
            fields: [{
                name: 'Guide',
                value: [
                    'React with `🍵` to join the round.',
                    '> You have 20 seconds to join',
                    '> The game starts only if there are at least 2 joined players',
                    '> Everyone has 3 lifes',
                    '> Think about a word that starts with the specific letters given'
                ].join('\n')
            }]
        };
        const mes = await message.reply({ embeds: [embed] });
        await mes.react('🍵').catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 20000));

        let fetched = null;
        try {
            fetched = await message.channel.messages.fetch(mes.id);
        } catch (err) {
            return warn(message, 'The blacktea message was deleted or an error occurred');
        }
        const reaction = fetched.reactions.cache.get('🍵');
        if (!reaction || reaction.count <= 1) {
            return warn(message, 'Reactions got removed from the message, canceling the match.. 😓');
        }
        const users = [];
        const reactorUsers = await reaction.users.fetch().catch(() => null);
        if (reactorUsers) {
            for (const [id, user] of reactorUsers) {
                if (!user.bot) users.push(id);
            }
        }
        if (users.length < 2) {
            return warn(message, 'Not enough players to start the blacktea match... 😓');
        }

        game.players = users;
        for (const id of users) game.lifes.set(id, 0);
        game.gameActive = true;
        games.set(guildId, game);
        game.runLoop().catch(() => game.stop());
    } finally {
        starting.delete(guildId);
    }
}

async function endGame(message) {
    const game = games.get(message.guild.id);
    if (game) {
        game.stop();
        return require('../../utils/context').approve(message, 'The blacktea game has been **forcefully** ended.');
    }
    return warn(message, 'No blacktea game is currently running.');
}

module.exports = {
    data: { name: 'blacktea', description: 'Play blacktea with the server members', usage: ',blacktea' },
    aliases: ['bt'],
    cooldown: 5,
    subcommands: ['end'],
    subUsages: { end: ',blacktea end' },

    async execute(message, args, client, config) {
        return startGame(message, client);
    },

    subs: {
        end: {
            aliases: ['stop'],
            data: { name: 'blacktea end', description: 'End the blacktea game', usage: ',blacktea end' },
            async execute(message, args, client, config) {
                return endGame(message);
            }
        }
    },

    handleGuess(message) {
        const game = games.get(message.guild.id);
        if (!game) return false;
        return game.handleGuess(message);
    },
    hasActive(guildId) {
        return games.has(guildId);
    }
};
