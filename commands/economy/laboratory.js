const { PermissionFlagsBits } = require('discord.js');
const { sendCard } = require('../../utils/helpCard');
const { warn, approve } = require('../../utils/context');
const { run, first } = require('../../utils/database');
const { confirm, needPerm } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const { EMOJIS, COLORS } = require('../../utils/styles');
const { createEmbed } = require('../../utils/embeds');
const E = require('../../utils/econ');

const LAB_COST = 5000000;

function cardFields(used, prefix) {
    if (!used) return [];
    const stars = '\u2b50'.repeat(used.stars);
    return [
        { name: prefix, value: `\`\`\`${used.name} | ${stars}\`\`\``, inline: true },
        { name: 'Storage', value: `\`\`\`${used.storage}h\`\`\``, inline: true },
        { name: 'Multiplier', value: `\`\`\`${used.multiplier}x\`\`\``, inline: true }
    ];
}

module.exports = {
    data: { name: 'lab', description: "Buy a laboratory business which generates money over time and needs to be maintained", usage: ',lab <subcommand>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['buy', 'ampoules', 'sell', 'upgrade', 'info', 'collect', 'add', 'remove'],
    subUsages: {
        buy: ',lab buy',
        ampoules: ',lab ampoules <amount|all>',
        sell: ',lab sell',
        upgrade: ',lab upgrade',
        info: ',lab info [user]',
        collect: ',lab collect',
        add: ',lab add <user> <upgrade state>',
        remove: ',lab remove <user>'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        buy: {
            data: { name: 'lab buy', description: 'Buy a laboratory business', usage: ',lab buy' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                if (first('SELECT 1 AS ok FROM economy_lab WHERE user_id = ?', userId)) {
                    return warn(message, 'You **already own** a laboratory.');
                }
                const row = E.ensureAccount(userId);
                if (row.cash < LAB_COST) {
                    return warn(message, `You **do not** have enough cash to buy a laboratory\n> You need **${E.humanize(LAB_COST)}** \ud83d\udcb5`);
                }
                run('INSERT INTO economy_lab (user_id, ampoules, last_collected, upgrade_state) VALUES (?, 100, ?, 0)', userId, Math.floor(Date.now() / 1000));
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', LAB_COST, userId);
                E.logging(userId, LAB_COST, 'buy', 'laboratory');
                E.loggingLab(userId, client.user ? client.user.id : userId, LAB_COST, 'buy', 0);
                return approve(message, "You've successfully **bought** a laboratory");
            }
        },
        ampoules: {
            data: { name: 'lab ampoules', description: 'Buy ampoules for your laboratory', usage: ',lab ampoules <amount|all>' },
            aliases: ['restock', 'ba'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
                if (!lab) return warn(message, "You **don't own** a laboratory.");
                const amountArg = String(args[0] || '').toLowerCase();
                if (!amountArg) return warn(message, 'You need to provide an amount.\n> **Usage:** `,lab ampoules <amount|all>`');

                const row = E.ensureAccount(userId);
                const { earningsPerHour } = E.labEarnings(userId, lab.upgrade_state || 0);
                const costFor100 = Math.trunc(earningsPerHour * 12 * 0.20);
                const ampouleCost = costFor100 / 100;
                const currentAmpoules = lab.ampoules || 0;

                let amount;
                if (amountArg === 'all') {
                    const maxAffordable = Math.min(Math.floor(row.cash / ampouleCost), 100 - currentAmpoules);
                    if (maxAffordable <= 0) return warn(message, "You either can't afford any ampoules or your laboratory is full");
                    amount = maxAffordable;
                } else {
                    amount = parseInt(amountArg.replace(/,/g, ''), 10);
                    if (!Number.isFinite(amount) || amount <= 0) return warn(message, "Please provide a valid number or 'all'");
                }
                if (currentAmpoules + amount > 100) {
                    return warn(message, "You can't have more than **100** ampoules in your laboratory");
                }
                const totalCost = Math.trunc(ampouleCost * amount);
                if (row.cash < totalCost) {
                    return warn(message, `You **do not** have enough cash to buy **${amount}** ampoules\n> You need **${E.humanize(totalCost)}** \ud83d\udcb5`);
                }
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', totalCost, userId);
                run('UPDATE economy_lab SET ampoules = ampoules + ? WHERE user_id = ?', amount, userId);
                E.logging(userId, totalCost, 'buy', 'ampoules');
                return approve(message, `You've successfully bought **${amount}** ampoules for **${E.humanize(totalCost)}** \ud83d\udcb5`);
            }
        },
        sell: {
            data: { name: 'lab sell', description: 'Sell your laboratory business', usage: ',lab sell' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
                if (!lab) return warn(message, "You **don't own** a laboratory.");
                const upgradeState = lab.upgrade_state || 0;
                let totalUpgradeCost = 0;
                for (let level = 1; level <= upgradeState; level++) {
                    totalUpgradeCost += E.labEarnings(userId, level).nextUpgradeCost;
                }
                const refund = (LAB_COST * 0.1) + (totalUpgradeCost * 0.1);
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to sell your lab for **${E.humanize(refund)}** \ud83d\udcb5?`,
                    async (i) => {
                        const stillOwned = first('SELECT 1 AS ok FROM economy_lab WHERE user_id = ?', userId);
                        if (!stillOwned) {
                            return i.update({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: You **do not** own a laboratory` }], components: [] });
                        }
                        run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', refund, userId);
                        run('DELETE FROM economy_lab WHERE user_id = ?', userId);
                        E.logging(userId, refund, 'sell', 'laboratory');
                        E.loggingLab(userId, userId, refund, 'sell', upgradeState);
                        const usedCard = first('SELECT card_id FROM economy_cards_used WHERE user_id = ? AND business = ?', userId, 'lab');
                        if (usedCard) {
                            run('UPDATE economy_cards_user SET active = 1 WHERE user_id = ? AND card_id = ?', userId, usedCard.card_id);
                            run('DELETE FROM economy_cards_used WHERE user_id = ? AND card_id = ?', userId, usedCard.card_id);
                        }
                        await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: You've **successfully** sold your laboratory\n> Received: **${E.humanize(refund)}** \ud83d\udcb5` }], components: [] });
                    },
                    async (i) => {
                        await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Sale got canceled` }], components: [] });
                    });
            }
        },
        upgrade: {
            data: { name: 'lab upgrade', description: "Upgrade your laboratory business by one level.", usage: ',lab upgrade' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
                if (!lab) return warn(message, "You **don't own** a laboratory.");
                const upgradeState = lab.upgrade_state || 0;
                if (upgradeState >= 50) return warn(message, "You've **maxed out** your lab");
                const { nextUpgradeCost } = E.labEarnings(userId, upgradeState);
                const row = E.ensureAccount(userId);
                if (row.cash < nextUpgradeCost) {
                    return warn(message, `You **do not** have enough cash to upgrade\n> You need **${E.humanize(nextUpgradeCost)}** \ud83d\udcb5`);
                }
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', nextUpgradeCost, userId);
                run('UPDATE economy_lab SET upgrade_state = upgrade_state + 1 WHERE user_id = ?', userId);
                E.logging(userId, nextUpgradeCost, 'upgrade', 'laboratory');
                E.loggingLab(userId, client.user ? client.user.id : userId, nextUpgradeCost, 'upgrade', upgradeState);
                return approve(message, `You've successfully upgraded your lab to level **${upgradeState + 1}**\n> The total upgrade cost was **${E.humanize(nextUpgradeCost)}** \ud83d\udcb5`);
            }
        },
        info: {
            data: { name: 'lab info', description: "Check the status of your laboratory business", usage: ',lab info [user]' },
            aliases: ['status'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const target = (message.mentions && message.mentions.users && message.mentions.users.first()) || message.author;
                const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', target.id);
                if (!lab) return warn(message, "You **don't own** a laboratory.");
                const now = Math.floor(Date.now() / 1000);
                const lastCollected = lab.last_collected || now;
                const upgradeState = lab.upgrade_state || 0;
                const { earningsPerHour, earningsCap, nextUpgradeCost } = E.labEarnings(target.id, upgradeState);
                const timePassed = now - lastCollected;
                const used = E.getUsedCard(target.id, 'lab');
                const prefix = used ? (upgradeState >= 16 ? 'Scientist' : 'Manager') : null;

                const embed = createEmbed({ color: COLORS.NEUTRAL, title: 'Laboratory Status' });
                if (timePassed < 3600) {
                    embed.addFields({ name: 'Next collection time', value: `<t:${Math.floor(lastCollected + 3600)}:R>`, inline: false });
                    if (used) embed.addFields(...cardFields(used, prefix));
                    embed.addFields(
                        { name: 'Ampoules', value: `\`\`\`${lab.ampoules || 0}\`\`\``, inline: true },
                        { name: 'Upgrade State', value: `\`\`\`${upgradeState}\`\`\``, inline: true },
                        { name: 'Earnings per Hour', value: `\`\`\`${E.humanize(earningsPerHour)} \ud83d\udcb5\`\`\``, inline: true },
                        { name: 'Next Upgrade Cost', value: upgradeState >= 50 ? '```Maxed Out```' : `\`\`\`${E.humanize(nextUpgradeCost)}\`\`\``, inline: true }
                    );
                    return message.reply({ embeds: [embed] });
                }
                const hoursPassed = Math.floor(timePassed / 3600);
                let earnings = earningsPerHour * hoursPassed;
                if (earnings > earningsCap) earnings = earningsCap;
                if (used) embed.addFields(...cardFields(used, prefix));
                embed.addFields(
                    { name: 'Ampoules', value: `\`\`\`${lab.ampoules || 0}\`\`\``, inline: true },
                    { name: 'Upgrade State', value: `\`\`\`${upgradeState}\`\`\``, inline: true },
                    { name: 'Earnings per Hour', value: `\`\`\`${E.humanize(earningsPerHour)} \ud83d\udcb5\`\`\``, inline: true },
                    { name: 'Next Upgrade Cost', value: upgradeState >= 50 ? '```Maxed Out```' : `\`\`\`${E.humanize(nextUpgradeCost)}\`\`\``, inline: true },
                    { name: 'Earnings', value: `\`\`\`${E.humanize(earnings)} \ud83d\udcb5\`\`\``, inline: true },
                    { name: earnings === earningsCap ? '\u26a0\ufe0f Storage' : 'Storage', value: `\`\`\`${E.humanize(earningsCap)} \ud83d\udcb5\`\`\``, inline: true }
                );
                return message.reply({ embeds: [embed] });
            }
        },
        collect: {
            data: { name: 'lab collect', description: "Collect your laboratory business earnings", usage: ',lab collect' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', userId);
                if (!lab) return warn(message, "You **don't own** a laboratory.");
                const now = Math.floor(Date.now() / 1000);
                const lastCollected = lab.last_collected || now;
                const upgradeState = lab.upgrade_state || 0;
                const ampoules = lab.ampoules || 0;
                const timePassed = now - lastCollected;
                if (timePassed < 3600) {
                    return warn(message, `You can **only** collect your lab earnings **once** every hour\n> Next collection time: <t:${Math.floor(lastCollected + 3600)}:R>`);
                }
                const used = E.getUsedCard(userId, 'lab');
                const storage = used && used.storage ? Number(used.storage) : 6;
                const hoursPassed = Math.min(Math.floor(timePassed / 3600), Math.floor(storage));
                const ampoulesNeeded = hoursPassed * 5;
                if (ampoules < ampoulesNeeded) {
                    return warn(message, 'You **do not** have enough ampoules to collect your earnings.');
                }
                const { earningsPerHour, earningsCap } = E.labEarnings(userId, upgradeState);
                let earnings = earningsPerHour * hoursPassed;
                if (earnings > earningsCap) earnings = earningsCap;

                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', earnings, userId);
                run('UPDATE economy_lab SET last_collected = ?, ampoules = ampoules - ? WHERE user_id = ?', now, ampoulesNeeded, userId);
                E.addCollectMoney(userId, 'lab', earnings);
                E.logging(userId, earnings, 'collect', 'laboratory');
                E.loggingLab(userId, client.user ? client.user.id : userId, earnings, 'collect', upgradeState);
                return approve(message, `You've collected **$${E.humanize(earnings)}** \ud83d\udcb5\n> Next collection available <t:${Math.floor(now + 3600)}:R>`);
            }
        },
        add: {
            data: { name: 'lab add', description: 'Add a laboratory to a user', usage: ',lab add <user> <upgrade state>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = message.mentions && message.mentions.users ? message.mentions.users.first() : null;
                const upgradeState = parseInt(args[1], 10);
                if (!target || !Number.isFinite(upgradeState) || upgradeState < 0) {
                    return warn(message, 'Invalid arguments.\n> **Usage:** `,lab add <user> <upgrade state>`');
                }
                if (first('SELECT 1 AS ok FROM economy_lab WHERE user_id = ?', target.id)) {
                    return warn(message, `${target} already owns a laboratory.`);
                }
                run('INSERT INTO economy_lab (user_id, ampoules, last_collected, upgrade_state) VALUES (?, 100, ?, ?)', target.id, Math.floor(Date.now() / 1000), upgradeState);
                E.loggingLab(target.id, message.author.id, 0, 'add', upgradeState);
                return approve(message, `Successfully added a laboratory to ${target}.`);
            }
        },
        remove: {
            data: { name: 'lab remove', description: 'Remove a laboratory from a user', usage: ',lab remove <user>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = message.mentions && message.mentions.users ? message.mentions.users.first() : null;
                if (!target) return warn(message, 'You need to mention a user.\n> **Usage:** `,lab remove <user>`');
                const lab = first('SELECT * FROM economy_lab WHERE user_id = ?', target.id);
                if (!lab) return warn(message, `${target} doesn't own a laboratory.`);
                run('DELETE FROM economy_lab WHERE user_id = ?', target.id);
                E.loggingLab(target.id, message.author.id, 0, 'remove', lab.upgrade_state || 0);
                return approve(message, `Successfully removed a laboratory from ${target}.`);
            }
        }
    }
};
