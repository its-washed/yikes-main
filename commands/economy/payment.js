const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { sendCard } = require('../../utils/helpCard');

const ADD_METHODS = ['paypal', 'paysafecard', 'amazon', 'ltc', 'btc', 'eth', 'usdt', 'xrp', 'binance', 'banktransfer'];
const EDIT_METHODS = ['paypal', 'paysafecard', 'ltc', 'btc', 'eth', 'usdt', 'xrp', 'binance', 'banktransfer'];

function guildAuthor(message) {
    return {
        name: message.guild.name,
        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
    };
}

function resolveReceiver(message, method, receiver) {
    if (method === 'paysafecard' || method === 'amazon') {
        const id = String(receiver || '').replace(/[<@!>]/g, '');
        const member = /^\d{17,20}$/.test(id) ? message.guild.members.cache.get(id) : null;
        if (!member) {
            return { ok: false, usage: `\`${method === 'paysafecard' ? 'paysafecard' : 'amazon'} user.id\`` };
        }
    }
    return { ok: true, receiver: String(receiver) };
}

module.exports = {
    data: { name: 'payment', description: 'Manage payment methods', usage: ',payment <add|remove|edit|reset|list|currency>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['add', 'remove', 'edit', 'reset', 'list', 'currency'],
    subUsages: {
        add: ',payment add <method> <receiver>',
        remove: ',payment remove <method>',
        edit: ',payment edit <method> <receiver>',
        reset: ',payment reset',
        list: ',payment list',
        currency: ',payment currency <eur|usd>'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: ['create'],
            data: { name: 'payment add', description: 'Add a payment method to guild', usage: ',payment add <method> <receiver>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const method = (args[0] || '').toLowerCase();
                const receiver = args[1];
                if (!ADD_METHODS.includes(method) || !receiver) {
                    return warn(message, 'Invalid payment method.\n> **Supported methods:** `PayPal`, `Paysafecard`, `Amazon`, `LTC`, `BTC`, `ETH`, `USDT`, `Binance`, `Banktransfer`');
                }
                const resolved = resolveReceiver(message, method, args.slice(1).join(' '));
                if (!resolved.ok) {
                    return warn(message, `Receiver not found\n> **Usage:** \`payment add ${method} ${resolved.usage}\``);
                }
                if (first('SELECT 1 AS ok FROM payment_methods WHERE guild_id = ? AND method = ?', message.guild.id, method)) {
                    return warn(message, `A payment method for **${method}** already exists!`);
                }
                run('INSERT INTO payment_methods (guild_id, method, receiver, available) VALUES (?, ?, ?, 1)',
                    message.guild.id, method, resolved.receiver);
                return approve(message, `Added payment method for **${method}**`);
            }
        },
        remove: {
            aliases: ['delete', 'del'],
            data: { name: 'payment remove', description: 'Remove a payment method from guild', usage: ',payment remove <method>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const method = (args[0] || '').toLowerCase();
                if (!method) return warn(message, 'Usage: `payment remove <method>`');
                if (!first('SELECT 1 AS ok FROM payment_methods WHERE guild_id = ? AND method = ?', message.guild.id, method)) {
                    return warn(message, 'That is **not** an existing payment method');
                }
                run('DELETE FROM payment_methods WHERE guild_id = ? AND method = ?', message.guild.id, method);
                return approve(message, `Deleted the payment method **${method}**`);
            }
        },
        edit: {
            aliases: [],
            data: { name: 'payment edit', description: 'Edit a payment method', usage: ',payment edit <method> <receiver>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const method = (args[0] || '').toLowerCase();
                const receiver = args[1];
                if (!EDIT_METHODS.includes(method) || !receiver) {
                    return warn(message, 'Invalid payment method.\n> **Supported methods:** `PayPal`, `Paysafecard`, `LTC`, `BTC`, `ETH`, `USDT`, `Binance`, `Banktransfer`');
                }
                const resolved = resolveReceiver(message, method, args.slice(1).join(' '));
                if (!resolved.ok) {
                    return warn(message, `Receiver not found\n> **Usage:** \`payment edit ${method} ${resolved.usage}\``);
                }
                if (!first('SELECT 1 AS ok FROM payment_methods WHERE guild_id = ? AND method = ?', message.guild.id, method)) {
                    return warn(message, `No payment method found for **${method}**`);
                }
                run('UPDATE payment_methods SET receiver = ? WHERE guild_id = ? AND method = ?', resolved.receiver, message.guild.id, method);
                return approve(message, `Updated payment method for **${method}**`);
            }
        },
        reset: {
            aliases: [],
            data: { name: 'payment reset', description: 'Reset every payment method for this guild', usage: ',payment reset' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                if (!first('SELECT 1 AS ok FROM payment_methods WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'There are **no** payment methods set');
                }
                return confirm(message, `${message.author}: Are you sure you want to **delete** all payment methods?`,
                    async i => {
                        run('DELETE FROM payment_methods WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Removed all **payment methods**`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Payment methods deletion got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },
        list: {
            aliases: [],
            data: { name: 'payment list', description: 'View a list of every payment method in guild', usage: ',payment list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query('SELECT * FROM payment_methods WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There are **no** payment methods set');
                const lines = rows.map(row => `${String(row.method).toLowerCase()} - ${row.receiver}`);
                return paginate(message, lines, 'Payment Methods', guildAuthor(message));
            }
        },
        currency: {
            aliases: [],
            data: { name: 'payment currency', description: 'Set the currency for the guild', usage: ',payment currency <eur|usd>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const currency = (args[0] || '').toLowerCase();
                if (currency !== 'eur' && currency !== 'usd') {
                    return warn(message, 'Invalid currency. Supported currencies: `EUR` & `USD`');
                }
                const existing = first('SELECT 1 AS ok FROM payment_currency WHERE guild_id = ?', message.guild.id);
                run('INSERT INTO payment_currency (guild_id, currency) VALUES (?, ?) ON CONFLICT (guild_id) DO UPDATE SET currency = ?',
                    message.guild.id, currency, currency);
                return approve(message, `${existing ? 'Updated' : 'Set'} the currency to **${currency.toUpperCase()}**`);
            }
        }
    }
};
