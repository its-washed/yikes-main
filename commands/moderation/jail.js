const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff, formatTimespan, jailConfig, requireJail, invokeDm, invokeMessage, invokeChannel, insertCase, sendModLog, splitReason, prefix } = require('../../utils/moderation');
const { approve, warn, parseTime } = require('../../utils/context');
const { sendPunishmentDm } = require('../../utils/appeals');
const { first, run } = require('../../utils/database');

const MAX_DURATION = 365 * 24 * 60 * 60;
const DEFAULT_DURATION = 2419200;

module.exports = {
    permission: "manage messages",
    data: { name: 'jail', description: 'Restrict someone from the server\'s channels', usage: ',jail its_washed 1d reason --s', params: ['member', '[duration]', '[reason]'], flags: { s: 'Punish a user silently' } },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageMessages)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageRoles)) return;
        if (!await requireJail(message)) return;

        const member = await noStaff(message, args[0], 'jail');
        if (!member) return;

        const time = args[1] ? parseTime(args[1]) : null;
        if (args[1] && time === null) {
            return warn(message, `**${args[1]}** is an invalid timespan`);
        }

        const duration = time || DEFAULT_DURATION;
        if (duration > MAX_DURATION) {
            return warn(message, 'You can\'t jail a user for more than **365 days**');
        }

        if (first('SELECT 1 AS ok FROM jail_members WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id)) {
            return warn(message, `${member} is **already** jailed`);
        }

        const check = await jailConfig(message.guild.id);
        const role = message.guild.roles.cache.get(String(check.role_id));
        if (!role) {
            return warn(message, `Jail role **not found**. Please \`${prefix(message)}unsetjail\` and set it back`);
        }

        const me = message.guild.members.me;
        if (me.roles.highest.position <= role.position) {
            return warn(message, `Role **${role}** is over my highest role`);
        }

        const parsed = splitReason(args, args[1] ? 2 : 1);
        const reason = parsed.reason;
        const silent = parsed.silent;
        const formatted = formatTimespan(duration);

        const assignable = member.roles.cache.filter(r => !r.managed && r.id !== message.guild.id && r.position < me.roles.highest.position && r.id !== role.id);
        const kept = member.roles.cache.filter(r => r.managed || r.id === message.guild.id || r.position >= me.roles.highest.position);
        const newRoles = [...kept.values(), role];

        await member.voice.disconnect().catch(() => {});

        try {
            await member.edit({ roles: newRoles, reason });
        } catch (err) {
            return warn(message, 'I don\'t have permission to jail this member. Please check my role hierarchy');
        }

        let dmMessageId = null;
        if (!silent) {
            const sent = await invokeDm(member, message.guild.id, 'jail', { reason, duration: formatted }).catch(() => false);
            if (!sent) {
                try {
                    dmMessageId = await sendPunishmentDm(member, message.guild.id, `You have been jailed for **${formatted}** on **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`);
                } catch (err) {
                    dmMessageId = null;
                }
            }
        }

        if (!first('SELECT 1 AS ok FROM jail_members WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id)) {
            run('INSERT OR IGNORE INTO jail_members (guild_id, user_id, roles, jailed_at, expires) VALUES (?, ?, ?, ?, ?)',
                message.guild.id, member.id, JSON.stringify([...assignable.keys()]),
                new Date().toISOString(), new Date(Date.now() + duration * 1000).toISOString());
        }

        const historyId = insertCase(message, member, 'Jail', formatted, reason, Date.now() / 1000, dmMessageId);
        const expiration = Math.floor(Date.now() / 1000 + duration);

        await sendModLog(message.guild, {
            user: member,
            moderator: message.author,
            reason,
            description: `jailed until <t:${expiration}:f>`,
            punishment: 'Jail',
            historyId
        });

        const invoked = await invokeMessage(message, 'jail', member, { reason, duration: formatted, historyId }).catch(() => false);
        if (!invoked) {
            await approve(message, `Jailed ${member} (\`#${historyId}\`) for ${formatted} - **${reason}**`);
        }

        const channel = message.guild.channels.cache.get(String(check.channel_id));
        if (channel) {
            const sent = await invokeChannel(channel, message.guild.id, 'jail', member, { reason, duration: formatted, historyId }).catch(() => false);
            if (!sent) {
                await channel.send(`${member} has been jailed for **${formatted}** - **${reason}**`).catch(() => {});
            }
        }
        return null;
    }
};
