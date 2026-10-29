const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needManager, addTeamRole, guildName, resolveServer } = require('../../utils/staff');

const OWNER_ROLE = '1284159368262324285';

async function parseUser(message, token) {
    if (!token) return null;
    const mentioned = message.mentions.users.first();
    if (mentioned && String(token).includes(mentioned.id)) return mentioned;
    const cleaned = String(token).replace(/[<@!>]/g, '');
    if (!/^\d{16,22}$/.test(cleaned)) return null;
    return message.client.users.fetch(cleaned).catch(() => null);
}

module.exports = {
    permission: "bot manager",
    data: { name: 'instances', description: "Manage the bot's instances", usage: ',instances <setup|add|remove|transfer|inspect|list>' },
    aliases: [],
    cooldown: 0,
    subcommands: ['setup', 'add', 'remove', 'transfer', 'inspect', 'list'],
    execute: async (message, args) => {
        if (!await needManager(message)) return;
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: setup, add, remove, transfer, inspect, list');
        return sendCard(message, module.exports);
    },
    subs: {
        setup: {
            aliases: [],
            data: { name: 'instances setup', description: 'Setup a new instance', usage: ',instances setup <bot> <owner> <server>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const instance = await parseUser(message, args[0]);
                const owner = await parseUser(message, args[1]);
                const server = await resolveServer(client, args[2]);
                if (!instance || !owner || !server) return warn(message, 'Usage: `instances setup <bot> <owner> <server>`');
                if (!instance.bot) return warn(message, 'Instance user must be a bot');
                run('INSERT OR REPLACE INTO instance (user_id, name, paid, owner_id, guild_id, transfers) VALUES (?, ?, ?, ?, ?, 3)',
                    instance.id, instance.username, Math.floor(Date.now() / 1000), owner.id, server, 3);
                await addTeamRole(client, owner.id, OWNER_ROLE);
                return approve(message, `Instance **${instance}** has been successfully created for **${guildName(client, server, true)}**\n> **Setuped:** <t:${Math.floor(Date.now() / 1000)}:R> **Owned by:** ${owner}`);
            }
        },
        add: {
            aliases: [],
            data: { name: 'instances add', description: 'Add a new instance server', usage: ',instances add <bot> <server>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const instance = await parseUser(message, args[0]);
                const server = await resolveServer(client, args[1]);
                if (!instance || !server) return warn(message, 'Usage: `instances add <bot> <server>`');
                if (!instance.bot) return warn(message, 'Instance user must be a bot');
                const data = first('SELECT * FROM instance WHERE user_id = ?', instance.id);
                if (!data) return warn(message, `Instance **${instance}** not found`);
                if (first('SELECT * FROM instance WHERE user_id = ? AND guild_id = ?', instance.id, server)) {
                    return warn(message, `Instance **${instance}** is already in **${guildName(client, server, true)}**`);
                }
                if (first('SELECT * FROM instance_addon WHERE user_id = ? AND guild_id = ?', instance.id, server)) {
                    return warn(message, `Instance **${instance}** is already in **${guildName(client, server, true)}**`);
                }
                run('INSERT INTO instance_addon (user_id, paid, owner_id, guild_id) VALUES (?, ?, ?, ?)',
                    instance.id, Math.floor(Date.now() / 1000), data.owner_id, server);
                return approve(message, `Instance **${instance}** has been successfully added to **${guildName(client, server, true)}**`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'instances remove', description: 'Remove an instance server', usage: ',instances remove <bot> <server>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const instance = await parseUser(message, args[0]);
                const server = await resolveServer(client, args[1]);
                if (!instance || !server) return warn(message, 'Usage: `instances remove <bot> <server>`');
                if (!instance.bot) return warn(message, 'Instance user must be a bot');
                if (!first('SELECT * FROM instance WHERE user_id = ?', instance.id)) {
                    return warn(message, `Instance **${instance}** not found`);
                }
                if (!first('SELECT * FROM instance_addon WHERE user_id = ? AND guild_id = ?', instance.id, server)) {
                    return warn(message, `Instance **${instance}** is not in **${guildName(client, server, true)}**`);
                }
                run('DELETE FROM instance_addon WHERE user_id = ? AND guild_id = ?', instance.id, server);
                return approve(message, `Instance **${instance}** has been successfully removed from **${guildName(client, server, true)}**`);
            }
        },
        transfer: {
            aliases: [],
            data: { name: 'instances transfer', description: 'Transfer an instance', usage: ',instances transfer <owner|server>' },
            subcommands: ['owner', 'server'],
            execute: async (message) => {
                if (!await needManager(message)) return;
                return sendCard(message, module.exports.subs.transfer);
            },
            subs: {
                owner: {
                    aliases: [],
                    data: { name: 'instances transfer owner', description: 'Transfer an instance owner', usage: ',instances transfer owner <old> <new>' },
                    execute: async (message, args) => {
                        if (!await needManager(message)) return;
                        const oldOwner = await parseUser(message, args[0]);
                        const newOwner = await parseUser(message, args[1]);
                        if (!oldOwner || !newOwner) return warn(message, 'Usage: `instances transfer owner <old> <new>`');
                        if (!first('SELECT * FROM instance WHERE owner_id = ?', oldOwner.id)) {
                            return warn(message, `Instance owner **${oldOwner}** not found`);
                        }
                        run('UPDATE instance SET owner_id = ? WHERE owner_id = ?', newOwner.id, oldOwner.id);
                        run('UPDATE instance_addon SET owner_id = ? WHERE owner_id = ?', newOwner.id, oldOwner.id);
                        return approve(message, `Instance owner **${oldOwner}** has been successfully transferred to **${newOwner}**`);
                    }
                },
                server: {
                    aliases: [],
                    data: { name: 'instances transfer server', description: 'Transfer an instance server', usage: ',instances transfer server <bot> <old> <new>' },
                    execute: async (message, args, client) => {
                        if (!await needManager(message)) return;
                        const instance = await parseUser(message, args[0]);
                        const oldServer = await resolveServer(client, args[1]);
                        const newServer = await resolveServer(client, args[2]);
                        if (!instance || !oldServer || !newServer) return warn(message, 'Usage: `instances transfer server <bot> <old> <new>`');
                        if (!instance.bot) return warn(message, 'Instance user must be a bot');
                        const data = first('SELECT * FROM instance WHERE user_id = ?', instance.id);
                        if (!data) return warn(message, `Instance **${instance}** not found`);
                        if (!first('SELECT * FROM instance WHERE user_id = ? AND guild_id = ?', instance.id, oldServer)) {
                            return warn(message, `Instance **${instance}** is not in **${guildName(client, oldServer, true)}**`);
                        }
                        const transfers = Number(data.transfers || 0);
                        if (transfers <= 0) return warn(message, `Instance **${instance}** has no transfers left`);
                        run('UPDATE instance SET guild_id = ?, transfers = ? WHERE user_id = ? AND guild_id = ?',
                            newServer, transfers - 1, instance.id, oldServer);
                        return approve(message, `Instance **${instance}** has been successfully transferred from **${guildName(client, oldServer, true)}** to **${guildName(client, newServer, true)}**`);
                    }
                }
            }
        },
        inspect: {
            aliases: [],
            data: { name: 'instances inspect', description: 'Inspect all instances from a user', usage: ',instances inspect <user>' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const user = await parseUser(message, args[0]);
                if (!user) return warn(message, 'Usage: `instances inspect <user>`');
                const rows = query('SELECT * FROM instance WHERE owner_id = ? ORDER BY paid DESC', user.id);
                if (!rows.length) return warn(message, `${user} doesn't have any instances`);
                const lines = rows.map(row => `<@${row.user_id}> - ${guildName(client, row.guild_id, false)} (<t:${Math.floor(Number(row.paid || 0))}:R>)`);
                return paginate(message, lines, `Instances of ${user.username}`, { name: message.author.username, icon_url: message.author.displayAvatarURL({ size: 256 }) });
            }
        },
        list: {
            aliases: [],
            data: { name: 'instances list', description: 'List all instances', usage: ',instances list' },
            execute: async (message, args, client) => {
                if (!await needManager(message)) return;
                const rows = query('SELECT * FROM instance ORDER BY paid DESC');
                if (!rows.length) return warn(message, 'No instances found');
                const lines = rows.map(row => `<@${row.user_id}> - <@${row.owner_id}> (<t:${Math.floor(Number(row.paid || 0))}:R>)`);
                return paginate(message, lines, 'Instances', { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        }
    }
};
