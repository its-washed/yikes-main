const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needSupporter } = require('../../utils/predicates');
const { logSystem, addRole, removeRole, guildName } = require('../../utils/manage');
const { sendCard } = require('../../utils/helpCard');

const PREMIUM_ROLE = '1242474452353290291';

function resolveGuildId(message, token) {
    if (!token) return null;
    const inviteMatch = token.match(/discord(?:\.gg|\.com\/invite)\/([a-zA-Z0-9-]+)/);
    if (inviteMatch) return { invite: inviteMatch[1] };
    const bare = String(token).replace(/[<@>]/g, '');
    if (/^\d{17,20}$/.test(bare)) return { guildId: bare };
    return { invite: token };
}

module.exports = {
    permission: "bot supporter",
    data: { name: 'premium', description: 'Premium commands', usage: ',premium <add|remove|transfer|inspect|check|list>' },
    aliases: ['prem'],
    cooldown: 5,
    subcommands: ['add', 'remove', 'transfer', 'inspect', 'check', 'list'],
    subUsages: {
        add: ',premium add <member> <invite|guildid>',
        remove: ',premium remove <invite|guildid>',
        transfer: ',premium transfer <old> <new>',
        inspect: ',premium inspect <user>',
        check: ',premium check <invite|guildid>',
        list: ',premium list'
    },
    execute: async (message, args, client) => {
        if (!await needSupporter(message)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        add: {
            aliases: [],
            data: { name: 'premium add', description: 'Add premium to a guild', usage: ',premium add <member> <invite|guildid>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const member = message.mentions.users.first();
                const token = args[1];
                if (!member || !token) return warn(message, 'Usage: `premium add <member> <invite|guildid>`');
                const resolved = resolveGuildId(message, token);
                const guildId = resolved.guildId || resolved.invite;
                if (!guildId) return warn(message, 'Usage: `premium add <member> <invite|guildid>`');
                const check = first('SELECT * FROM premium WHERE guild_id = ?', guildId);
                if (check) return warn(message, 'This guild is **already** premium');
                run('INSERT INTO premium (guild_id, user_id, timestamp, transfers) VALUES (?, ?, ?, 3)', guildId, member.id, Date.now() / 1000);
                await addRole(client, member, PREMIUM_ROLE);
                await logSystem(client, message.author, `Added **premium** subscription to \`${member.username}\`\n > **Guild ID:** ${guildId}`);
                const name = await guildName(client, guildId);
                return approve(message, `Premium added to ${name}, requested by **${member}**`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'premium remove', description: 'Remove premium from a guild', usage: ',premium remove <invite|guildid>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const token = args[0];
                const resolved = resolveGuildId(message, token);
                const guildId = resolved.guildId || resolved.invite;
                if (!guildId) return warn(message, 'Usage: `premium remove <invite|guildid>`');
                const check = first('SELECT * FROM premium WHERE guild_id = ?', guildId);
                if (!check) return warn(message, 'This guild is **not** premium');
                run('DELETE FROM premium WHERE guild_id = ?', guildId);
                const member = await client.users.fetch(String(check.user_id)).catch(() => null);
                if (member) await removeRole(client, member, PREMIUM_ROLE);
                await logSystem(client, message.author, `Removed **premium** subscription from \`${member ? member.username : check.user_id}\`\n > **Guild ID:** ${guildId}`);
                const name = await guildName(client, guildId);
                return approve(message, `Premium removed from ${name}`);
            }
        },
        transfer: {
            aliases: [],
            data: { name: 'premium transfer', description: 'Transfer premium from one guild to another', usage: ',premium transfer <old> <new>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const oldResolved = resolveGuildId(message, args[0]);
                const newResolved = resolveGuildId(message, args[1]);
                const oldId = oldResolved && (oldResolved.guildId || oldResolved.invite);
                const newId = newResolved && (newResolved.guildId || newResolved.invite);
                if (!oldId || !newId) return warn(message, 'Usage: `premium transfer <old> <new>`');
                const check = first('SELECT * FROM premium WHERE guild_id = ?', oldId);
                if (!check) return warn(message, 'The first guild id is **not** premium');
                const transfers = check.transfers;
                if (!transfers) return warn(message, 'This server has ran out of transfers :(');
                run('UPDATE premium SET guild_id = ?, transfers = ? WHERE guild_id = ?', newId, transfers - 1, oldId);
                await logSystem(client, message.author, `Transferred **premium** subscription from \`${oldId}\` to \`${newId}\``);
                const oldName = await guildName(client, oldId);
                const newName = await guildName(client, newId);
                return approve(message, `Transferred **premium** subscription from ${oldName} to ${newName}\n > **Transfers left:** ${transfers - 1}`);
            }
        },
        inspect: {
            aliases: [],
            data: { name: 'premium inspect', description: 'Inspect all premium guilds of a member', usage: ',premium inspect <user>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const mentioned = message.mentions.users.first();
                const token = args[0] ? String(args[0]).replace(/[<@!>]/g, '') : null;
                const user = mentioned || (token && /^\d{17,20}$/.test(token) ? await client.users.fetch(token).catch(() => null) : null);
                if (!user) return warn(message, 'Usage: `premium inspect <user>`');
                const rows = query('SELECT * FROM premium WHERE user_id = ?', user.id);
                if (!rows.length) return warn(message, `${user} doesn't have any premium guilds`);
                const lines = rows.map(r => {
                    const guild = client.guilds.cache.get(String(r.guild_id));
                    if (guild) return `**${guild.name}** (\`${r.guild_id}\`) - <t:${Math.floor(r.timestamp)}:R> (\`${r.transfers}\`)`;
                    return `**${r.guild_id}** - <t:${Math.floor(r.timestamp)}:R> (\`${r.transfers}\`)`;
                });
                return paginate(message, lines, `Premium Guilds of ${user.username}`,
                    { name: message.author.username, icon_url: message.author.displayAvatarURL() });
            }
        },
        check: {
            aliases: [],
            data: { name: 'premium check', description: 'Check if a server has premium', usage: ',premium check <invite|guildid>' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const resolved = resolveGuildId(message, args[0]);
                const guildId = resolved && (resolved.guildId || resolved.invite);
                if (!guildId) return warn(message, 'Usage: `premium check <invite|guildid>`');
                const check = first('SELECT * FROM premium WHERE guild_id = ?', guildId);
                const guild = client.guilds.cache.get(String(guildId));
                if (!check) return warn(message, `Guild **${guild ? guild.name : guildId}** has no **premium**`);
                const premiumGuild = client.guilds.cache.get(String(check.guild_id));
                return approve(message, `Guild **${premiumGuild ? premiumGuild.name : check.guild_id}** has premium since <t:${Math.floor(check.timestamp)}:R> with **${check.transfers} transfers** left`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'premium list', description: 'List all premium guilds', usage: ',premium list' },
            execute: async (message, args, client) => {
                if (!await needSupporter(message)) return;
                const rows = query('SELECT * FROM premium');
                if (!rows.length) return warn(message, 'There are no premium guilds');
                const lines = rows.map(r => {
                    const guild = client.guilds.cache.get(String(r.guild_id));
                    if (guild) return `**${guild.name}** (\`${r.guild_id}\`) - <t:${Math.floor(r.timestamp)}:R> (\`${r.transfers}\`)`;
                    return `**${r.guild_id}** - <t:${Math.floor(r.timestamp)}:R> (\`${r.transfers}\`)`;
                });
                return paginate(message, lines, 'Premium Guilds',
                    { name: message.author.username, icon_url: message.author.displayAvatarURL() });
            }
        }
    }
};
