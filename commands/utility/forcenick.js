const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { needPerks } = require('../../utils/predicates');
const { sendCard } = require('../../utils/helpCard');

function noStaff(message) {
    const member = message.mentions.members.first();
    if (!member) return { error: 'Usage: mention a member' };
    const me = message.guild.members.me;
    if (me && member.roles.highest.position >= me.roles.highest.position) {
        return { error: `Member **${member.displayName}** couldn't be found` };
    }
    if (member.id === message.guild.ownerId && message.author.id !== message.guild.ownerId) {
        return { error: "You can't punish the server owner" };
    }
    return { member };
}

module.exports = {
    permission: "manage nicknames, donator",
    data: { name: 'forcenick', description: 'Managing force nicknames', usage: ',forcenick <set|remove|list>' },
    aliases: ['fn'],
    cooldown: 5,
    subcommands: ['set', 'remove', 'list'],
    subUsages: {
        set: ',forcenick set <member> <nickname>',
        remove: ',forcenick remove <member>',
        list: ',forcenick list'
    },
    execute: async (message, args, client) => {
        if (!await needPerks(message, client)) return;
        if (!await needPerm(message, PermissionFlagsBits.ManageNicknames)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageNicknames)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        set: {
            aliases: [],
            data: { name: 'forcenick set', description: "Set or update a member's forced nickname", usage: ',forcenick set <member> <nickname>' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const resolved = noStaff(message);
                if (resolved.error) return warn(message, resolved.error);
                const member = resolved.member;
                const nickname = args.slice(1).join(' ').trim();
                if (!nickname) return warn(message, 'Usage: `forcenick set <member> <nickname>`');
                if (nickname.length > 32) return warn(message, "Nickname can't be longer than 32 characters");
                try {
                    const existing = first('SELECT * FROM force_nick WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                    if (existing) run('UPDATE force_nick SET nickname = ? WHERE guild_id = ? AND user_id = ?', nickname, message.guild.id, member.id);
                    else run('INSERT INTO force_nick (guild_id, user_id, nickname) VALUES (?, ?, ?)', message.guild.id, member.id, nickname);
                    await member.setNickname(nickname, 'Force nickname applied to this member');
                    return approve(message, `Force nicknamed ${member.toString()} to **${nickname}**`);
                } catch (err) {
                    if (err.code === 50013) return warn(message, "I don't have permission to change this member's nickname. Please check the role hierarchy");
                    return warn(message, 'Display name contains community flagged words');
                }
            }
        },
        remove: {
            aliases: [],
            data: { name: 'forcenick remove', description: 'Remove a force nickname from a member', usage: ',forcenick remove <member>' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const resolved = noStaff(message);
                if (resolved.error) return warn(message, resolved.error);
                const member = resolved.member;
                try {
                    const existing = first('SELECT * FROM force_nick WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                    if (!existing) return warn(message, 'There is no force nickname assigned for this member');
                    run('DELETE FROM force_nick WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
                    await member.setNickname(null, 'Removed the force nickname from this member');
                    return approve(message, 'Removed the nickname from this member');
                } catch (err) {
                    if (err.code === 50013) return warn(message, "I don't have permission to change this member's nickname. Please check the role hierarchy");
                    return warn(message, 'Display name contains community flagged words');
                }
            }
        },
        list: {
            aliases: [],
            data: { name: 'forcenick list', description: 'List all members with force nicknames', usage: ',forcenick list' },
            execute: async (message, args, client) => {
                if (!await needPerks(message, client)) return;
                const rows = query('SELECT * FROM force_nick WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'No force nicknames set');
                const lines = rows.map(r => `<@${r.user_id}>: ${r.nickname}`);
                return paginate(message, lines, 'Force Nicknames',
                    { name: message.guild.name, icon_url: message.guild.iconURL({ size: 256 }) || undefined });
            }
        }
    }
};
