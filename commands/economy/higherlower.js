const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function updateMultipliers(state) {
    const possibleHigher = 100 - state.current;
    const possibleLower = state.current - 1;
    state.higherMultiplier = possibleHigher > 0 ? ((100 / possibleHigher) - 1) * 0.25 + 1 : 1.0;
    state.lowerMultiplier = possibleLower > 0 ? ((100 / possibleLower) - 1) * 0.25 + 1 : 1.0;
}

module.exports = {
    data: { name: 'higherlower', description: 'Guess if the number is higher or lower', usage: ',higherlower <bet>' },
    aliases: ['hl'],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const userId = message.author.id;
        const row = E.ensureAccount(userId);
        const amount = E.parseAmount(args[0], row.cash);
        if (!Number.isFinite(amount) || amount < 10) return warn(message, "You can't bet less than **10** \ud83d\udcb5");
        if (amount > row.cash) return warn(message, "You don't have enough cash for this bet.");

        E.logging(userId, amount, 'gamble', 'higherlower');
        run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, userId);

        const state = {
            current: 2 + Math.floor(Math.random() * 98),
            totalMultiplier: 1.00,
            firstClick: true,
            clicks: 0,
            ended: false,
            lastAction: 0
        };
        updateMultipliers(state);

        const buildRows = () => [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('hl_higher').setLabel('Higher').setStyle(ButtonStyle.Success).setDisabled(state.ended),
            new ButtonBuilder().setCustomId('hl_lower').setLabel('Lower').setStyle(ButtonStyle.Danger).setDisabled(state.ended),
            new ButtonBuilder().setCustomId('hl_cashout').setLabel('Cashout').setStyle(ButtonStyle.Primary).setDisabled(state.ended)
        )];

        const buildEmbed = () => createEmbed({
            color: COLORS.NEUTRAL,
            author: { name: `Playing Higher or Lower with ${money(amount)} \ud83d\udcb5` },
            fields: [
                { name: 'Number', value: String(state.current), inline: true },
                { name: 'Higher', value: `${state.higherMultiplier.toFixed(2)}x`, inline: true },
                { name: 'Lower', value: `${state.lowerMultiplier.toFixed(2)}x`, inline: true },
                { name: 'Total', value: `${state.totalMultiplier.toFixed(2)}x`, inline: true },
                { name: 'Winnings', value: `${money(amount * state.totalMultiplier)} \ud83d\udcb5`, inline: true }
            ]
        });

        const sent = await message.reply({ embeds: [buildEmbed()], components: buildRows() });
        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 300000 });

        const endGame = async (i, description) => {
            state.ended = true;
            collector.stop();
            await i.update({
                embeds: [createEmbed({ color: COLORS.ERROR, description })],
                components: buildRows()
            }).catch(() => {});
        };

        collector.on('collect', async i => {
            const now = Date.now() / 1000;
            if (now - state.lastAction < 2) {
                return i.reply({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: You are too fast, please wait a little bit...` })], ephemeral: true }).catch(() => {});
            }
            state.lastAction = now;
            if (state.ended) return;

            if (i.customId === 'hl_cashout') {
                if (state.firstClick) {
                    return i.reply({ content: `${EMOJIS.WARNING} You can't cashout before making a prediction`, ephemeral: true }).catch(() => {});
                }
                const winnings = amount * state.totalMultiplier;
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', winnings, userId);
                E.addWinGame(userId, 'higherlower');
                E.addWinMoney(userId, 'higherlower', winnings - amount);
                E.logging(userId, winnings - amount, 'won', 'higherlower');
                state.ended = true;
                collector.stop();
                return i.update({
                    embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Congratulations! You won **${money(winnings)}** \ud83d\udcb5` })],
                    components: buildRows()
                }).catch(() => {});
            }

            const prediction = i.customId === 'hl_higher' ? 'higher' : 'lower';
            const oldNumber = state.current;
            const newNumber = 1 + Math.floor(Math.random() * 100);
            const success = prediction === 'higher' ? newNumber >= oldNumber : newNumber <= oldNumber;

            if (!success) {
                E.logging(userId, amount, 'lost', 'higherlower');
                return endGame(i, `${EMOJIS.DENY} ${i.user}: You lost **${money(amount)}** \ud83d\udcb5.\n> Old number: **${oldNumber}** | New number: **${newNumber}** | You predicted: **${prediction}**`);
            }

            const playedMultiplier = prediction === 'higher' ? state.higherMultiplier : state.lowerMultiplier;
            state.totalMultiplier = Math.max(state.totalMultiplier + playedMultiplier - 1, 1.00);
            state.firstClick = false;
            state.current = newNumber;
            state.clicks += 1;
            updateMultipliers(state);

            const limitReached = state.clicks >= 5 || state.totalMultiplier >= 5.00;
            if (limitReached) {
                const winnings = amount * state.totalMultiplier;
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', winnings, userId);
                E.addWinGame(userId, 'higherlower');
                E.addWinMoney(userId, 'higherlower', winnings - amount);
                E.logging(userId, winnings - amount, 'won', 'higherlower');
                state.ended = true;
                collector.stop();
                return i.update({
                    embeds: [createEmbed({
                        color: COLORS.SUCCESS,
                        description: `${EMOJIS.APPROVE} ${i.user}: You reached **${state.totalMultiplier.toFixed(2)}x** and won **${money(winnings)}** \ud83d\udcb5`
                    })],
                    components: buildRows()
                }).catch(() => {});
            }

            return i.update({ embeds: [buildEmbed()], components: buildRows() }).catch(() => {});
        });

        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });
    }
};
