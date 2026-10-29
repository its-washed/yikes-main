const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { run } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

const money = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

module.exports = {
    data: { name: 'crash', description: 'Start a crash game', usage: ',crash <bet>' },
    aliases: [],
    cooldown: 5,
    async execute(message, args, client) {
        if (!await ensureEconomy(message, client)) return;

        const userId = message.author.id;
        const row = E.ensureAccount(userId);
        const amount = E.parseAmount(args[0], row.cash);
        if (!Number.isFinite(amount) || amount < 10) return warn(message, "You can't bet less than **10** \ud83d\udcb5");
        if (amount > row.cash) return warn(message, "You don't have enough cash for this bet.");

        E.logging(userId, amount, 'gamble', 'crash');
        run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, userId);

        const state = { multiplier: 1.0, crashed: false, cashoutDone: false, finalMultiplier: null };

        const cashoutRow = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('crash_cashout').setLabel('Cashout').setStyle(ButtonStyle.Primary).setDisabled(state.cashoutDone || state.crashed)
        );

        const embedFor = () => createEmbed({
            color: state.crashed ? COLORS.ERROR : COLORS.NEUTRAL,
            title: `Player Crash with ${money(amount)} \ud83d\udcb5`,
            description: state.crashed
                ? `> Crashed! You lost **${money(amount)}** \ud83d\udcb5`
                : state.cashoutDone
                    ? `> Congratulations! You won **${money(amount * state.finalMultiplier)}** \ud83d\udcb5`
                    : '> Click **Cashout** button to cashout',
            fields: [
                { name: 'Multiplier', value: `${state.multiplier.toFixed(2)}x`, inline: true },
                { name: 'Crash', value: state.finalMultiplier !== null ? `${state.finalMultiplier.toFixed(2)}x` : '—', inline: true },
                { name: state.cashoutDone ? 'Winnings' : state.crashed ? 'Losses' : 'Potential Winnings', value: `${money(state.crashed ? amount : amount * state.multiplier)} \ud83d\udcb5`, inline: true }
            ]
        });

        const sent = await message.reply({
            embeds: [createEmbed({
                color: COLORS.NEUTRAL,
                title: `Player Crash with ${money(amount)} \ud83d\udcb5`,
                description: '> Starting the game...',
                fields: [
                    { name: 'Multiplier', value: '1.00x', inline: true },
                    { name: 'Winnings', value: `${money(amount)} \ud83d\udcb5`, inline: true }
                ]
            })],
            components: [cashoutRow()]
        });

        const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 120000 });

        collector.on('collect', async i => {
            if (state.cashoutDone || state.crashed) return i.reply({ content: `${EMOJIS.WARNING} This game has already ended.`, ephemeral: true }).catch(() => {});
            state.cashoutDone = true;
            const cashoutMultiplier = state.multiplier;
            while (!state.crashed) {
                if (Math.random() >= 0.85) state.crashed = true;
                else state.multiplier += 0.12 + Math.random() * 0.13;
            }
            state.finalMultiplier = state.multiplier;
            collector.stop('cashed');
            const winnings = amount * cashoutMultiplier;
            run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', winnings, userId);
            E.addWinGame(userId, 'crash');
            E.addWinMoney(userId, 'crash', winnings - amount);
            E.logging(userId, winnings - amount, 'won', 'crash');
            state.multiplier = cashoutMultiplier;
            await i.update({ embeds: [embedFor()], components: [] }).catch(() => {});
        });

        const timer = setInterval(async () => {
            if (state.cashoutDone) return;
            if (Math.random() >= 0.85) {
                state.crashed = true;
                state.finalMultiplier = state.multiplier;
                E.logging(userId, amount, 'lost', 'crash');
                clearInterval(timer);
                try { await sent.edit({ embeds: [embedFor()], components: [] }); } catch (err) { }
                collector.stop('crashed');
                return;
            }
            state.multiplier += 0.07 + Math.random() * 0.13;
            try { await sent.edit({ embeds: [embedFor()], components: [cashoutRow()] }); } catch (err) {
                clearInterval(timer);
                collector.stop('deleted');
            }
        }, 2500);

        collector.on('end', () => {
            clearInterval(timer);
            sent.edit({ components: [] }).catch(() => {});
        });
    }
};
