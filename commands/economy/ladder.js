const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

const MULTIPLIERS = [1, 1.25, 1.50, 1.75, 2, 2.25, 2.50, 2.75, 3];
const LIMIT = 25000000;

function buildRows(state) {
    const hit = new ButtonBuilder().setCustomId('ladder_hit').setLabel('Hit').setStyle(ButtonStyle.Primary).setDisabled(state.ended);
    const collect = new ButtonBuilder().setCustomId('ladder_collect').setLabel('Collect').setStyle(ButtonStyle.Primary).setDisabled(state.ended || !state.reachedTop);
    const exit = new ButtonBuilder().setCustomId('ladder_exit').setLabel('Exit').setStyle(ButtonStyle.Danger).setDisabled(state.ended);
    return [new ActionRowBuilder().addComponents(hit, collect, exit)];
}

function buildEmbed(bet, state) {
    const lines = [];
    for (let i = MULTIPLIERS.length - 1; i >= 0; i--) {
        const reached = i <= state.index;
        lines.push(`> ${reached ? '\u{1F7E2}' : '\u26AB'} ${MULTIPLIERS[i]}x`);
    }
    return createEmbed({
        color: COLORS.NEUTRAL,
        title: `Playing Ladder with ${bet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} \ud83d\udcb5`,
        description: 'You will lose your bet if you fall 5 times!',
        fields: [
            { name: '\u200b', value: '\u200b', inline: true },
            { name: 'Multipliers', value: lines.join('\n'), inline: true },
            { name: '\u200b', value: '\u200b', inline: true }
        ]
    });
}

module.exports = {
    data: { name: 'ladder', description: 'Start a ladder game', usage: ',ladder <bet>' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const userId = message.author.id;
        const row = E.ensureAccount(userId);
        const amount = E.parseAmount(args[0], row.cash);
        if (!Number.isFinite(amount) || amount < 10) return warn(message, "You can't bet less than **10** \ud83d\udcb5");
        if (amount > row.cash) return warn(message, "You don't have enough cash for this bet.");

        E.logging(userId, amount, 'gamble', 'ladder');
        run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, userId);

        const state = { index: 0, falls: 0, ended: false, reachedTop: false, lastAction: 0 };

        const sent = await message.reply({ embeds: [buildEmbed(amount, state)], components: buildRows(state) });
        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 300000 });

        collector.on('collect', async i => {
            const now = Date.now() / 1000;
            if (now - state.lastAction < 2) {
                return i.reply({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: You are too fast, please wait a little bit...` })], ephemeral: true }).catch(() => {});
            }
            state.lastAction = now;

            if (i.customId === 'ladder_hit') {
                const chance = Math.max(0.7 - (amount / LIMIT) * 0.01, 0.1);
                if (Math.random() < chance) {
                    state.index = Math.min(state.index + 1, MULTIPLIERS.length - 1);
                    if (state.index === MULTIPLIERS.length - 1) state.reachedTop = true;
                } else {
                    state.index = Math.max(state.index - 1, 0);
                    state.falls += 1;
                    if (state.falls >= 5) {
                        state.ended = true;
                        collector.stop();
                        E.logging(userId, amount, 'lost', 'ladder');
                        return i.update({
                            embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: You've lost **${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}** \ud83d\udcb5 after falling 5 times!` })],
                            components: buildRows(state)
                        }).catch(() => {});
                    }
                    if (state.index === 0) {
                        state.ended = true;
                        collector.stop();
                        E.logging(userId, amount, 'lost', 'ladder');
                        return i.update({
                            embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: You've lost **${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}** \ud83d\udcb5 due to a fall.` })],
                            components: buildRows(state)
                        }).catch(() => {});
                    }
                }
                return i.update({ embeds: [buildEmbed(amount, state)], components: buildRows(state) }).catch(() => {});
            }

            if (i.customId === 'ladder_collect') {
                const winnings = amount * MULTIPLIERS[state.index];
                state.ended = true;
                collector.stop();
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', winnings, userId);
                E.addWinGame(userId, 'ladder');
                E.addWinMoney(userId, 'ladder', winnings - amount);
                E.logging(userId, winnings, 'won', 'ladder');
                return i.update({
                    embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: You've successfully collected **${winnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}** \ud83d\udcb5` })],
                    components: buildRows(state)
                }).catch(() => {});
            }

            if (i.customId === 'ladder_exit') {
                state.ended = true;
                collector.stop();
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', amount, userId);
                E.logging(userId, amount, 'returned', 'ladder');
                return i.update({
                    embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Your bet of **${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}** \ud83d\udcb5 has been returned.` })],
                    components: buildRows(state)
                }).catch(() => {});
            }
        });

        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });
    }
};
