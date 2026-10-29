const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff, invokeDm, invokeMessage, insertCase, sendModLog, splitReason, caseId } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');

module.exports = {
    permission: "moderate members",
    data: { name: 'unmute', description: 'Remove the timeout from a member', usage: ',unmute its_washed rassist --s', params: ['member', '[reason]'], flags: { s: 'Punish a user silently' } },
    aliases: ['untimeout'],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ModerateMembers)) return;

        const member = await noStaff(message, args[0], 'unmute');
        if (!member) return;

        if (!member.isTimedOut()) {
            return warn(message, `${member} is **not** muted`);
        }

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;
        const silent = parsed.silent;
        const discordReason = `${reason} | ${message.author.username} (${message.author.id})`;

        await member.timeout(null, discordReason).catch(() => null);

        if (!silent) {
            const sent = await invokeDm(member, message.guild.id, 'unmute', { reason, duration: null })
                .catch(() => false);
            if (!sent) {
                await member.send({
                    embeds: [{
                        color: 0x39ffb8,
                        description: `You have been unmuted on **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`
                    }]
                }).catch(() => {});
            }
        }

        const historyId = insertCase(message, member, 'Unmute', 'None', reason, Date.now() / 1000, null);

        await sendModLog(message.guild, {
            user: member,
            moderator: message.author,
            reason,
            description: 'unmuted',
            punishment: 'Unmute',
            historyId
        });

        const invoked = await invokeMessage(message, 'unmute', member, { reason, duration: null, historyId }).catch(() => false);
        if (!invoked) {
            return approve(message, `Unmuted ${member} (\`#${historyId}\`) - ${reason}`);
        }
        return null;
    }
};
