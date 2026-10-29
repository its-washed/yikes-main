const { PermissionFlagsBits } = require('discord.js');
const { sendCard } = require('../../utils/helpCard');
const { warn, approve } = require('../../utils/context');
const { run, first, query } = require('../../utils/database');
const { needPerm, needBotPerm, parseTime } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const { EMOJIS, COLORS } = require('../../utils/styles');
const { createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const E = require('../../utils/econ');

function shopEnabled(guildId) {
    const check = first('SELECT * FROM economy_shop WHERE guild_id = ?', guildId);
    if (check) return check.state === 1 || check.state === true;
    return true;
}

function resolveRole(message, token) {
    const raw = String(token || '').replace(/[<@!&>]/g, '');
    if (!/^\d{17,20}$/.test(raw)) return null;
    return message.guild.roles.cache.get(raw) || null;
}

module.exports = {
    data: { name: 'shop', description: "Manage you server economy shop", usage: ',shop <subcommand>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'add', 'remove', 'view', 'buy', 'collect', 'balance'],
    subUsages: {
        enable: ',shop enable',
        disable: ',shop disable',
        add: ',shop add <role> <amount> <name> [--limit n] [--time t]',
        remove: ',shop remove <role>',
        view: ',shop view',
        buy: ',shop buy <name>',
        collect: ',shop collect',
        balance: ',shop balance'
    },
    execute: async (message, args, client) => {
        if (args[0]) return sendCard(message, module.exports);

        return sendCard(message, module.exports);
    },
    subs: {
        enable: {
            data: { name: 'shop enable', description: 'Enable your server economy shop', usage: ',shop enable' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT * FROM economy_shop WHERE guild_id = ?', message.guild.id);
                if (check && (check.state === 1 || check.state === true)) return warn(message, 'Your economy shop is **already** enabled');
                if (check) run('UPDATE economy_shop SET state = 1 WHERE guild_id = ?', message.guild.id);
                else run('INSERT INTO economy_shop (guild_id, state) VALUES (?, 1)', message.guild.id);
                return approve(message, 'Your economy shop got **enabled**');
            }
        },
        disable: {
            data: { name: 'shop disable', description: 'Disable your server economy shop', usage: ',shop disable' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const check = first('SELECT * FROM economy_shop WHERE guild_id = ?', message.guild.id);
                if (check && (check.state === 0 || check.state === false)) return warn(message, 'Your economy shop is **already** disabled');
                if (check) run('UPDATE economy_shop SET state = 0 WHERE guild_id = ?', message.guild.id);
                else run('INSERT INTO economy_shop (guild_id, state) VALUES (?, 0)', message.guild.id);
                return approve(message, 'Your economy shop got **disabled**');
            }
        },
        add: {
            data: { name: 'shop add', description: "Add a item to your economy shop", usage: ',shop add <role> <amount> <name> [--limit n] [--time t]' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const role = resolveRole(message, args[0]);
                const amount = parseInt(String(args[1] || '').replace(/,/g, ''), 10);
                if (!role) return warn(message, 'You need to mention a valid role.\n> **Usage:** `,shop add <role> <amount> <name>`');
                if (!Number.isFinite(amount) || amount <= 0) return warn(message, 'You need to provide a valid price.');

                let nameTokens = args.slice(2);
                if (!nameTokens.length) return warn(message, 'You need to provide an item name.\n> **Usage:** `,shop add <role> <amount> <name>`');

                let limit = null;
                let time = null;
                const rest = [];
                for (let i = 0; i < nameTokens.length; i++) {
                    const token = nameTokens[i];
                    if (token === '--limit') {
                        limit = parseInt(nameTokens[++i], 10);
                        if (!Number.isFinite(limit)) return warn(message, 'Invalid limit value provided.');
                        continue;
                    }
                    if (token === '--time') {
                        const seconds = parseTime(nameTokens[++i]);
                        if (!seconds) return warn(message, 'Invalid time value provided.');
                        time = Math.floor(Date.now() / 1000) + seconds;
                        continue;
                    }
                    rest.push(token);
                }
                const name = rest.join(' ').trim();
                if (!name) return warn(message, 'You need to provide an item name.');

                const check = first('SELECT * FROM economy_shop_items WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                if (check) {
                    return warn(message, `Item ${role} already exists as **${check.name}** for **${E.humanizeClean(check.amount)}** \ud83d\udcb5`);
                }
                run('INSERT INTO economy_shop_items (guild_id, role_id, amount, name, "limit", time) VALUES (?, ?, ?, ?, ?, ?)',
                    message.guild.id, role.id, amount, name, limit, time);
                return approve(message, `Item ${role} added as **${name}** for **${E.humanizeClean(amount)}** \ud83d\udcb5`);
            }
        },
        remove: {
            data: { name: 'shop remove', description: "Remove a item from your economy shop", usage: ',shop remove <role>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const role = resolveRole(message, args[0]);
                if (!role) return warn(message, 'You need to mention a valid role.\n> **Usage:** `,shop remove <role>`');
                const check = first('SELECT * FROM economy_shop_items WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                if (!check) return warn(message, `Item ${role} doesn't exist`);
                run('DELETE FROM economy_shop_items WHERE guild_id = ? AND role_id = ?', message.guild.id, role.id);
                return approve(message, `Item ${role} got removed from economy shop`);
            }
        },
        view: {
            data: { name: 'shop view', description: "Displays all items in the economy shop", usage: ',shop view' },
            aliases: ['list'],
            execute: async (message, args, client) => {
                if (!shopEnabled(message.guild.id)) return warn(message, 'Economy shop is **disabled**');
                const items = query('SELECT * FROM economy_shop_items WHERE guild_id = ?', message.guild.id);
                if (!items.length) return warn(message, 'There are no items available in the shop.');
                const userRoles = new Set(message.member.roles.cache.map(r => r.id));
                const pages = [];
                for (let i = 0; i < items.length; i += 6) {
                    const chunk = items.slice(i, i + 6);
                    const fields = [];
                    for (const item of chunk) {
                        const role = message.guild.roles.cache.get(String(item.role_id));
                        if (!role) continue;
                        fields.push({
                            name: `> ${item.name}`,
                            value: `**Role:** ${role}\n**Price:** ${E.humanizeClean(item.amount)} \ud83d\udcb5\n**Stock:** ${item.limit !== null && item.limit !== undefined ? item.limit : 'Unlimited'}\n**Expires:** ${item.time ? `<t:${item.time}:R>` : 'Never'}\n**Purchased:** ${userRoles.has(String(role.id)) ? EMOJIS.APPROVE : EMOJIS.DENY}`,
                            inline: true
                        });
                    }
                    pages.push({
                        color: COLORS.NEUTRAL,
                        title: 'Economy Shop',
                        fields,
                        footer: { text: `Page: ${pages.length + 1}/${Math.ceil(items.length / 6)} (${items.length} entries)` }
                    });
                }
                const paginator = new Paginator(pages, { userId: message.author.id });
                const components = pages.length > 1 ? [paginator.buildRow()] : [];
                const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
                if (pages.length > 1) await paginator.start(message.channel, sent);
                return sent;
            }
        },
        buy: {
            data: { name: 'shop buy', description: 'Buy an item from the economy shop', usage: ',shop buy <name>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
                if (!shopEnabled(message.guild.id)) return warn(message, 'Economy shop is **disabled**');
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You need to provide an item name.\n> **Usage:** `,shop buy <name>`');
                const item = first('SELECT * FROM economy_shop_items WHERE guild_id = ? AND name = ?', message.guild.id, name);
                if (!item) return warn(message, `**${name}** is not available in the shop`);

                const userId = message.author.id;
                const balance = E.econRow(userId);
                if (!balance || balance.cash < item.amount) return warn(message, "You don't have enough money to buy this item");
                const role = message.guild.roles.cache.get(String(item.role_id));
                if (!role) return warn(message, 'This item is no longer available.');
                if (message.member.roles.cache.has(role.id)) return warn(message, 'You already have this role and can\u2019t buy it again.');
                if (item.time && item.time < Date.now() / 1000) return warn(message, `Item **${name}** has expired <t:${item.time}:R>`);
                if (item.limit !== null && item.limit !== undefined) {
                    if (item.limit < 1) return warn(message, `Item **${name}** is out of stock`);
                    run('UPDATE economy_shop_items SET "limit" = "limit" - 1 WHERE guild_id = ? AND name = ?', message.guild.id, name);
                }
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', item.amount, userId);
                run('INSERT INTO economy_shop_earnings (guild_id, amount) VALUES (?, ?) ON CONFLICT (guild_id) DO UPDATE SET amount = amount + excluded.amount',
                    message.guild.id, item.amount * 0.75);
                await message.member.roles.add(role, `[Economy] Purchased for ${item.amount}`).catch(() => {});
                E.logging(userId, item.amount, 'buy', 'shop');
                return approve(message, `You have successfully purchased ${role} for **${E.humanizeClean(item.amount)} \ud83d\udcb5**`);
            }
        },
        collect: {
            data: { name: 'shop collect', description: 'Collect the earnings from the economy shop', usage: ',shop collect' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!shopEnabled(message.guild.id)) return warn(message, 'Economy shop is **disabled**');
                const earnings = first('SELECT amount FROM economy_shop_earnings WHERE guild_id = ?', message.guild.id);
                if (!earnings || !earnings.amount) return warn(message, 'There are no earnings to collect');
                run('UPDATE economy_shop_earnings SET amount = 0 WHERE guild_id = ?', message.guild.id);
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', earnings.amount, message.author.id);
                E.logging(message.author.id, earnings.amount, 'collect', 'shop');
                return approve(message, `You have successfully collected **${E.humanizeClean(earnings.amount)} \ud83d\udcb5**`);
            }
        },
        balance: {
            data: { name: 'shop balance', description: 'Check the current balance of the economy shop', usage: ',shop balance' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!shopEnabled(message.guild.id)) return warn(message, 'Economy shop is **disabled**');
                const earnings = first('SELECT amount FROM economy_shop_earnings WHERE guild_id = ?', message.guild.id);
                const amount = earnings && earnings.amount ? earnings.amount : 0;
                return message.reply({ embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `Current balance of the economy shop is **${E.humanizeClean(amount)} \ud83d\udcb5**` })] });
            }
        }
    }
};
