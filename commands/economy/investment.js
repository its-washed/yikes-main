const { sendCard } = require('../../utils/helpCard');
const { warn, approve } = require('../../utils/context');
const { run, first, query } = require('../../utils/database');
const { ensureEconomy } = require('../../utils/predicates');
const { COLORS } = require('../../utils/styles');
const { createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'investment', description: 'Manage your investments', usage: ',investment <subcommand>' },
    aliases: ['invest'],
    cooldown: 5,
    subcommands: ['start', 'list', 'status', 'complete'],
    subUsages: {
        start: ',investment start <name>',
        list: ',investment list',
        status: ',investment status',
        complete: ',investment complete'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        start: {
            data: { name: 'investment start', description: 'Start an investment', usage: ',investment start <name>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You need to provide an investment name.\n> **Usage:** `,investment start <name>`');
                if (first('SELECT 1 AS ok FROM economy_investments_started WHERE user_id = ? AND active = 1', userId)) {
                    return warn(message, 'You have an active investment.');
                }
                const investment = first('SELECT * FROM economy_investments WHERE LOWER(name) = LOWER(?)', name);
                if (!investment) return warn(message, 'Investment with this name does not exist.');
                const row = E.ensureAccount(userId);
                if (row.cash < investment.cost) {
                    return warn(message, `You don't have enough cash to start this investment.\n> Required: **${E.humanize(investment.cost)}** \ud83d\udcb5`);
                }
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', investment.cost, userId);
                run('INSERT OR REPLACE INTO economy_investments_started (id, user_id, timestamp, active) VALUES (?, ?, ?, 1)',
                    investment.id, userId, Math.floor(Date.now() / 1000));
                return approve(message, `Successfully started the investment **${investment.name}**, for completion you gain **${E.humanize(investment.earnings)}** \ud83d\udcb5`);
            }
        },
        list: {
            data: { name: 'investment list', description: 'List all investments that exist', usage: ',investment list' },
            execute: async (message, args, client) => {
                const results = query('SELECT * FROM economy_investments ORDER BY cost ASC');
                if (!results.length) return warn(message, 'No investments found in the database.');
                const pages = results.map((result, index) => ({
                    color: COLORS.NEUTRAL,
                    title: result.name,
                    description: result.description || '',
                    fields: [
                        { name: 'Cost', value: `${E.humanize(result.cost)} \ud83d\udcb5`, inline: true },
                        { name: 'Earnings', value: `${E.humanize(result.earnings)} \ud83d\udcb5`, inline: true },
                        { name: 'Days', value: String(result.days), inline: true }
                    ],
                    footer: { text: `Page: ${index + 1}/${results.length} (${results.length} entries)` }
                }));
                const paginator = new Paginator(pages, { userId: message.author.id });
                const components = pages.length > 1 ? [paginator.buildRow()] : [];
                const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
                if (pages.length > 1) await paginator.start(message.channel, sent);
                return sent;
            }
        },
        status: {
            data: { name: 'investment status', description: 'View the status of your investment', usage: ',investment status' },
            aliases: ['info'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const started = first('SELECT * FROM economy_investments_started WHERE user_id = ? AND active = 1', userId);
                if (!started) return warn(message, "You don't have an active investment.");
                const investment = first('SELECT * FROM economy_investments WHERE id = ?', started.id);
                if (!investment) return warn(message, "Your investment can't be found in the database");
                const untilEnd = started.timestamp + (investment.days * 86400);
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.NEUTRAL,
                        title: investment.name,
                        fields: [
                            { name: 'Cost', value: `${E.humanize(investment.cost)} \ud83d\udcb5`, inline: true },
                            { name: 'Earnings', value: `${E.humanize(investment.earnings)} \ud83d\udcb5`, inline: true },
                            { name: 'Ends', value: `<t:${Math.floor(untilEnd)}:R>`, inline: true }
                        ]
                    })]
                });
            }
        },
        complete: {
            data: { name: 'investment complete', description: 'Complete your investment', usage: ',investment complete' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const started = first('SELECT * FROM economy_investments_started WHERE user_id = ? AND active = 1', userId);
                if (!started) return warn(message, "You don't have an active investment.");
                const investment = first('SELECT * FROM economy_investments WHERE id = ?', started.id);
                if (!investment) return warn(message, "Your investment can't be found in the database");
                const untilEnd = started.timestamp + (investment.days * 86400);
                if (untilEnd > Date.now() / 1000) {
                    return warn(message, `Your investment has not ended yet\n> Ends: <t:${Math.floor(untilEnd)}:R>`);
                }
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', investment.earnings, userId);
                E.logging(userId, investment.earnings, 'collect', 'investment');
                run('DELETE FROM economy_investments_started WHERE user_id = ?', userId);
                return approve(message, `Successfully completed the investment **${investment.name}** and gained **${E.humanize(investment.earnings)}** \ud83d\udcb5`);
            }
        }
    }
};
