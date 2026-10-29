const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

const GRID = 4;
const MULTIPLIERS = [1.02, 1.06, 1.12, 1.19, 1.28, 1.39, 1.53, 1.74, 2.05, 2.27, 2.56, 2.98, 3.59, 4.63, 6.69];
const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INVISIBLE = '\u200e';

function generateMines(count) {
    const mines = new Set();
    while (mines.size < count) {
        mines.add(`${Math.floor(Math.random() * GRID)}-${Math.floor(Math.random() * GRID)}`);
    }
    return mines;
}

module.exports = {
    data: { name: 'mines', description: 'Start a mines game', usage: ',mines <bet> [count]' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const userId = message.author.id;
        const row = E.ensureAccount(userId);
        const amount = E.parseAmount(args[0], row.cash);
        const count = args[1] ? parseInt(args[1], 10) : 4;
        if (!Number.isFinite(amount) || amount < 10) return warn(message, "You can't bet less than **10** \ud83d\udcb5");
        if (amount > row.cash) return warn(message, "You don't have enough cash for this bet.");
        if (!Number.isFinite(count) || count < 1 || count > 15) return warn(message, 'The number of mines must be between 1 and 15.');

        E.logging(userId, amount, 'gamble', 'mines');
        run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, userId);

        const mines = generateMines(count);
        const state = { revealed: new Set(), correct: 0, ended: false, busy: false };

        const multiplier = () => {
            if (state.correct === 0) return 1;
            const index = Math.min((count - 1) + state.correct - 1, MULTIPLIERS.length - 1);
            return MULTIPLIERS[Math.max(index, 0)];
        };
        const winnings = () => state.correct === 0 ? 0 : amount * multiplier();

        const buildRows = () => {
            const rows = [];
            for (let x = 0; x < GRID; x++) {
                const rowBuilder = new ActionRowBuilder();
                for (let y = 0; y < GRID; y++) {
                    const key = `${x}-${y}`;
                    const button = new ButtonBuilder().setCustomId(`m_${key}`).setLabel(INVISIBLE).setStyle(ButtonStyle.Secondary);
                    if (state.ended) {
                        if (mines.has(key)) button.setStyle(ButtonStyle.Danger).setLabel('\ud83d\udca3');
                        else if (state.revealed.has(key)) button.setStyle(ButtonStyle.Success);
                        button.setDisabled(true);
                    }
                    rowBuilder.addComponents(button);
                }
                rows.push(rowBuilder);
            }
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('m_collect').setLabel('Collect').setStyle(ButtonStyle.Primary).setDisabled(state.ended),
                new ButtonBuilder().setCustomId('m_exit').setLabel('Exit').setStyle(ButtonStyle.Danger).setDisabled(state.ended)
            ));
            return rows;
        };

        const buildEmbed = () => createEmbed({
            color: COLORS.NEUTRAL,
            title: `Playing Mines with ${money(amount)} \ud83d\udcb5 and ${count} mines`,
            fields: [
                { name: 'Fields', value: `${state.correct} / ${GRID * GRID - count}`, inline: true },
                { name: 'Multiplier', value: multiplier().toFixed(2), inline: true },
                { name: 'Winnings', value: `${money(winnings())} \ud83d\udcb5`, inline: true }
            ]
        });

        const finish = async (i, embed, ephemeral) => {
            state.ended = true;
            collector.stop();
            if (ephemeral) return i.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
            return i.update({ embeds: [embed], components: buildRows() }).catch(() => {});
        };

        const sent = await message.reply({ embeds: [buildEmbed()], components: buildRows() });
        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 300000 });

        collector.on('collect', async i => {
            if (state.busy || state.ended) return;
            state.busy = true;
            try {
                if (i.customId.startsWith('m_') && i.customId.length > 2 && i.customId[2] !== 'c' && i.customId[2] !== 'e') {
                    const key = i.customId.slice(2);
                    if (state.revealed.has(key)) {
                        await i.reply({ content: `${EMOJIS.WARNING} This tile is already revealed!`, ephemeral: true }).catch(() => {});
                        state.busy = false;
                        return;
                    }
                    state.revealed.add(key);
                    if (mines.has(key)) {
                        E.logging(userId, amount, 'lost', 'mines');
                        await finish(i, createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: You hit a mine! You lost **${money(amount)}** \ud83d\udcb5` }));
                        state.busy = false;
                        return;
                    }
                    state.correct += 1;
                    if (state.correct + count === GRID * GRID) {

                        const total = winnings();
                        run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', total, userId);
                        E.addWinGame(userId, 'mines');
                        E.addWinMoney(userId, 'mines', total - amount);
                        E.logging(userId, total - amount, 'won', 'mines');
                        state.ended = true;
                        collector.stop();
                        await i.update({ embeds: [buildEmbed()], components: buildRows() }).catch(() => {});
                        await i.followUp({
                            embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Congratulations, you've cleared the board and won **${money(total)}** \ud83d\udcb5` })]
                        }).catch(() => {});
                        state.busy = false;
                        return;
                    }
                    await i.update({ embeds: [buildEmbed()], components: buildRows() }).catch(() => {});
                    state.busy = false;
                    return;
                }

                if (i.customId === 'm_collect') {
                    const total = winnings();
                    if (total < 10) {
                        await i.reply({ content: `${EMOJIS.WARNING} You can't collect **${money(total)}** \ud83d\udcb5`, ephemeral: true }).catch(() => {});
                        state.busy = false;
                        return;
                    }
                    run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', total, userId);
                    E.addWinGame(userId, 'mines');
                    E.addWinMoney(userId, 'mines', total - amount);
                    E.logging(userId, total - amount, 'won', 'mines');
                    await finish(i, createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: You've successfully collected **${money(total)}** \ud83d\udcb5` }));
                    state.busy = false;
                    return;
                }

                if (i.customId === 'm_exit') {
                    run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', amount, userId);
                    E.logging(userId, amount, 'returned', 'mines');
                    await finish(i, createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Your bet of **${money(amount)}** \ud83d\udcb5 has been returned.` }));
                    state.busy = false;
                    return;
                }
            } finally {
                state.busy = false;
            }
        });

        collector.on('end', () => {
            state.ended = true;
            sent.edit({ components: [] }).catch(() => {});
        });
    }
};
