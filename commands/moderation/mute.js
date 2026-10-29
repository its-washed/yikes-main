const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff, formatTimespan, invokeDm, invokeMessage, insertCase, sendModLog, splitReason, caseId } = require('../../utils/moderation');
const { approve, warn, parseTime } = require('../../utils/context');
const { sendPunishmentDm } = require('../../utils/appeals');

const MAX_DURATION = 28 * 24 * 60 * 60;

module.exports = {
    permission: "moderate members",
    data: { name: 'mute', description: 'Timeout a member', usage: ',mute its_washed 1d rassist --s', params: ['member', '[duration]', '[reason]'], flags: { s: 'Punish a user silently' } },
    aliases: ['timeout'],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ModerateMembers)) return;

        const member = await noStaff(message, args[0], 'mute');
        if (!member) return;

        const time = args[1] ? parseTime(args[1]) : null;
        if (args[1] && time === null) {
            return warn(message, `**${args[1]}** is an invalid timespan`);
        }

        const duration = time || 3600;
        if (duration > MAX_DURATION) {
            return warn(message, "You can't mute a user for more than **28 days**");
        }
        if (member.isTimedOut()) {
            return warn(message, `${member} is **already** muted`);
        }
        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
            return warn(message, "You **can't** mute an administrator");
        }

        const parsed = splitReason(args, args[1] ? 2 : 1);
        const reason = parsed.reason;
        const silent = parsed.silent;
        const formatted = formatTimespan(duration);
        const discordReason = `${reason} | ${message.author.username} (${message.author.id})`;

        let dmMessageId = null;
        if (!silent) {
            const sent = await invokeDm(member, message.guild.id, 'mute', { reason, duration: formatted })
                .catch(() => false);
            if (!sent) {
                try {
                    dmMessageId = await sendPunishmentDm(member, message.guild.id, `You have been muted for **${formatted}** on **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`);
                } catch (err) {
                    dmMessageId = null;
                }
            }
        }

        await member.timeout(duration * 1000, discordReason).catch(() => null);

        const historyId = insertCase(message, member, 'Mute', formatted, reason, Date.now() / 1000, dmMessageId);
        const expiration = Math.floor(Date.now() / 1000 + duration);

        await sendModLog(message.guild, {
            user: member,
            moderator: message.author,
            reason,
            description: `muted until <t:${expiration}:f>`,
            punishment: 'Mute',
            historyId
        });

        const invoked = await invokeMessage(message, 'mute', member, { reason, duration: formatted, historyId }).catch(() => false);
        if (!invoked) {
            return approve(message, `Muted ${member} (\`#${historyId}\`) for ${formatted} - **${reason}**`);
        }
        return null;
    }
};
