const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { createEmbed, COLORS } = require('../../utils/embeds');
const { ensureEconomy } = require('../../utils/predicates');
const { logging, addWinGame, addWinMoney, humanize, cleanHumanize, parseAmount } = require('../../utils/econ');
const { EMOJIS } = require('../../utils/styles');

const MULTIPLIERS = {
    '🍒': 1.25,
    '🍊': 1.5,
    '🍇': 2,
    '🍓': 2.5,
    '🍉': 3,
    '🍋': 3.5,
    '🍎': 4,
    '🍏': 4.5
};
const SYMBOLS = Object.keys(MULTIPLIERS);

const activeGames = new Map();
const channelGames = new Map();

function fetchBalance(userId) {
    const row = first('SELECT cash FROM economy WHERE user_id = ?', userId);
    return row ? Number(row.cash || 0) : 0;
}

function row(disabled) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('slot_spin').setLabel('Spin').setStyle(ButtonStyle.Primary).setDisabled(Boolean(disabled)),
        new ButtonBuilder().setCustomId('slot_bet').setLabel('Change Bet').setStyle(ButtonStyle.Primary).setDisabled(Boolean(disabled)),
        new ButtonBuilder().setCustomId('slot_exit').setLabel('Exit').setStyle(ButtonStyle.Danger).setDisabled(Boolean(disabled))
    );
}

class SlotGame {
    constructor(message, bet) {
        this.message = message;
        this.channel = message.channel;
        this.author = message.author;
        this.client = message.client;
        this.bet = bet;
        this.winnings = 0;
        this.spinCount = 0;
        this.awaitingBetChange = false;
        this.limit = Math.floor(Math.random() * (2000000 - 100000 + 1)) + 100000;
        this.resultMessage = null;
        this.usingWinnings = false;
        this.active = true;
        this.sent = null;
        this.timeout = setTimeout(() => this.onTimeout(), 60000);
    }

    createEmbed(slots, newBet, footerText) {
        const embed = createEmbed({
            description: '### 🎰 Slot Machine',
            color: COLORS.NEUTRAL,
            fields: [
                { name: '​', value: '​', inline: true },
                { name: `${this.author.username}'s Slots`, value: `​`, inline: true },
                { name: '​', value: '​', inline: true },
                {
                    name: '​',
                    value: `**Bet:** ${this.bet.toFixed(2)} 💵`.replace('Bet:', 'Bet:'),
                    inline: true
                },
                {
                    name: '​',
                    value: this.usingWinnings
                        ? `${EMOJIS.WARNING} **Winnings:** ${this.winnings.toFixed(2)} 💵`
                        : `**Winnings:** ${this.winnings.toFixed(2)} 💵`,
                    inline: true
                }
            ]
        });
        if (slots && slots.length >= 3) {
            embed.fields[1].value = `\`\`\`${slots[0]} | ${slots[1]} | ${slots[2]}\`\`\``;
        }
        if (this.resultMessage) {
            embed.fields.splice(3, 0, { name: '​', value: `>>> ${this.resultMessage}`, inline: false });
        }
        if (newBet !== undefined && newBet !== null) {
            embed.fields[embed.fields.length - 2].value = `**Bet:** ${Number(newBet).toFixed(2)} 💵`;
        }
        if (footerText) embed.footer = { text: footerText };
        return embed;
    }

    pickWeights() {
        const weights = {};
        for (const s of SYMBOLS) weights[s] = MULTIPLIERS[s] / 200;
        return weights;
    }

    weightedPick() {
        const weights = this.pickWeights();
        const entries = Object.entries(weights);
        const total = entries.reduce((sum, [, w]) => sum + w, 0);
        let r = Math.random() * total;
        for (const [symbol, w] of entries) {
            r -= w;
            if (r <= 0) return symbol;
        }
        return entries[entries.length - 1][0];
    }

    async edit(slots, footerText) {
        if (!this.sent) return;
        await this.sent.edit({ embeds: [this.createEmbed(slots, undefined, footerText)], components: [row(false)] }).catch(() => {});
    }

    async spin() {
        this.spinCount++;
        const balance = fetchBalance(this.author.id);
        const totalBet = this.bet;
        logging(this.author.id, totalBet, 'spent', 'slots');

        if (totalBet > balance) {
            if (this.winnings > 0) {
                this.usingWinnings = true;
                let remaining = totalBet - balance;
                remaining = Math.min(remaining, this.winnings);
                this.winnings -= remaining;
                run('UPDATE economy SET cash = MAX(0, cash - ?) WHERE user_id = ?', balance, this.author.id);
            } else {
                this.resultMessage = 'Not enough cash to spin!';
                await this.edit(['❌', '❌', '❌']);
                return null;
            }
        } else {
            run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', totalBet, this.author.id);
        }

        const threeChance = totalBet >= this.limit ? 0.09 : 0.14;
        const twoChance = totalBet >= this.limit ? 0.15 : 0.24;

        let finalResult;
        const roll = Math.random();
        if (roll <= threeChance) {
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            finalResult = [symbol, symbol, symbol];
        } else if (roll <= threeChance + twoChance) {
            const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            const others = SYMBOLS.filter(s => s !== symbol);
            const other = others[Math.floor(Math.random() * others.length)];
            finalResult = [symbol, symbol, other];
            for (let i = finalResult.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [finalResult[i], finalResult[j]] = [finalResult[j], finalResult[i]];
            }
        } else {
            const pool = [...SYMBOLS];
            finalResult = [];
            for (let i = 0; i < 3; i++) {
                finalResult.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
            }
        }

        let footerText = `Spins: ${this.spinCount} • evelina.bot`;
        for (let i = 0; i < 2; i++) {
            const temp = [
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
                SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
            ];
            footerText = `Spins: ${this.spinCount} • evelina.bot`;
            await this.edit(temp, footerText);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const counts = {};
        for (const s of finalResult) counts[s] = (counts[s] || 0) + 1;
        const maxCount = Math.max(...Object.values(counts));
        const maxSymbol = Object.keys(counts).find(s => counts[s] === maxCount);

        if (maxCount === 3) {
            const winAmount = totalBet * MULTIPLIERS[maxSymbol];
            this.resultMessage = `Congratulations! You **won** ${winAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 💵!`;
            this.winnings += winAmount;
            logging(this.author.id, winAmount, 'won', 'slots');
        } else if (maxCount === 2) {
            const multiplier = MULTIPLIERS[maxSymbol] / 2;
            const winAmount = totalBet * (1 + multiplier);
            this.resultMessage = `You got **two** ${maxSymbol}! You **won** ${winAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 💵!`;
            this.winnings += winAmount;
            logging(this.author.id, winAmount, 'won', 'slots');
        } else {
            this.resultMessage = 'You **lost**. Better luck next time!';
            logging(this.author.id, totalBet, 'lost', 'slots');
        }

        await this.edit(finalResult, footerText);
        return finalResult;
    }

    async handleSpin(i) {
        await i.deferUpdate().catch(() => {});
        if (this.resultMessage) this.resultMessage = null;
        if (this.sent) await this.sent.edit({ components: [row(true)] }).catch(() => {});
        const slots = await this.spin();
        if (!slots) {
            if (this.sent) await this.sent.edit({ embeds: [this.createEmbed(['❌', '❌', '❌'])], components: [row(false)] }).catch(() => {});
            return;
        }
        if (this.sent) await this.sent.edit({ embeds: [this.createEmbed(slots)], components: [row(false)] }).catch(() => {});
    }

    async handleChangeBet(i) {
        if (this.awaitingBetChange) {
            return i.reply({ content: 'Please enter the new bet amount in the chat.', ephemeral: true }).catch(() => {});
        }
        this.awaitingBetChange = true;
        if (this.sent) await this.sent.edit({ components: [row(true)] }).catch(() => {});
        await i.reply({ content: 'Please enter the new bet amount in the chat.', ephemeral: true }).catch(() => {});

        try {
            const collected = await this.channel.awaitMessages({
                filter: m => m.author.id === this.author.id && m.channel.id === this.channel.id,
                max: 1,
                time: 60000,
                errors: ['time']
            });
            const msg = collected.first();
            const newBet = Number(String(msg.content).replace(/,/g, ''));
            const balance = fetchBalance(this.author.id);
            if (Number.isFinite(newBet) && newBet > 0 && newBet <= balance) {
                this.bet = newBet;
                await msg.react('✅').catch(() => {});
                await i.editReply({ content: `Bet changed to ${cleanHumanize(newBet)} 💵` }).catch(() => {});
                if (this.sent) {
                    await this.sent.edit({
                        embeds: [this.createEmbed(['🟦', '🟦', '🟦'], newBet)],
                        components: [row(false)]
                    }).catch(() => {});
                }
                await msg.delete().catch(() => {});
            } else {
                await msg.react('❌').catch(() => {});
                await i.editReply({ content: 'Invalid bet amount. Please try again.' }).catch(() => {});
            }
        } catch (err) {
            await i.editReply({ content: 'Bet change timed out.' }).catch(() => {});
        } finally {
            this.awaitingBetChange = false;
            if (this.sent) await this.sent.edit({ components: [row(false)] }).catch(() => {});
        }
    }

    async handleExit(i) {
        if (this.sent) await this.sent.edit({ components: [] }).catch(() => {});
        if (this.winnings > 0) {
            run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', this.winnings, this.author.id);
        }
        addWinGame(this.author.id, 'slots');
        addWinMoney(this.author.id, 'slots', this.winnings - this.bet);
        this.winnings = 0;
        this.usingWinnings = false;
        clearTimeout(this.timeout);
        activeGames.delete(this.author.id);
        channelGames.delete(this.channel.id);
        await i.update({ components: [] }).catch(() => {});
    }

    onTimeout() {
        if (this.winnings > 0) {
            run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', this.winnings, this.author.id);
        }
        this.winnings = 0;
        this.usingWinnings = false;
        activeGames.delete(this.author.id);
        channelGames.delete(this.channel.id);
        if (this.sent) this.sent.edit({ components: [row(true)] }).catch(() => {});
    }
}

function parseBetAmount(token, cash) {
    const raw = String(token).toLowerCase().replace(/,/g, '');
    if (raw === 'all') return Math.floor(cash);
    if (raw === 'half') return Math.floor(cash / 2);
    const pct = /^(\d+(?:\.\d+)?)%$/.exec(raw);
    if (pct) return Math.floor((cash * parseFloat(pct[1])) / 100);
    if (raw.endsWith('k')) return Math.floor(parseFloat(raw) * 1000);
    if (raw.endsWith('m')) return Math.floor(parseFloat(raw) * 1000000);
    if (raw.endsWith('b')) return Math.floor(parseFloat(raw) * 1000000000);
    const value = Number(raw);
    return Number.isFinite(value) ? value : NaN;
}

module.exports = {
    data: { name: 'slot', description: 'Play a slot machine game', usage: ',slot 125', params: ['amount'] },
    aliases: ['slots'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        if (activeGames.has(message.author.id)) {
            return warn(message, 'You **already** have an active slot game.');
        }
        if (channelGames.has(message.channel.id)) {
            return warn(message, 'There is **already an active slot game** in this channel.');
        }

        const cash = fetchBalance(message.author.id);
        if (cash <= 0) return warn(message, 'You do **not** have any cash in your **pockets**.');
        if (!args[0]) return warn(message, 'Usage: `slot <amount>`');
        if (['nan', 'inf'].includes(String(args[0]).toLowerCase())) return warn(message, 'This is **not** a number.');

        const amount = parseBetAmount(args[0], cash);
        if (Number.isNaN(amount)) return warn(message, `**${args[0]}** is **not** a number`);
        if (amount <= 0) return warn(message, 'You do **not** have any cash in your **pockets**.');

        logging(message.author.id, amount, 'gamble', 'slot');

        const embed = createEmbed({
            color: COLORS.ECONOMY || COLORS.NEUTRAL,
            description: '### 🎰 Slot Machine',
            fields: [
                { name: '​', value: 'Press Hit to start.', inline: false },
                { name: 'Bet', value: `${humanize(amount)}.00 💵`, inline: false }
            ]
        });

        const sent = await message.reply({ embeds: [embed], components: [row(false)] });
        const game = new SlotGame(message, amount);
        game.sent = sent;
        activeGames.set(message.author.id, game);
        channelGames.set(message.channel.id, game);

        const collector = sent.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 });
        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'This is not your game!', ephemeral: true }).catch(() => {});
            }
            if (i.customId === 'slot_spin') return game.handleSpin(i);
            if (i.customId === 'slot_bet') return game.handleChangeBet(i);
            if (i.customId === 'slot_exit') return game.handleExit(i);
        });
        collector.on('end', () => {
            if (activeGames.get(message.author.id) === game) {
                game.onTimeout();
                collector.stop();
            }
        });

        return sent;
    }
};
