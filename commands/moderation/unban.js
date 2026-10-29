const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, invokeDm, insertCase, sendModLog, splitReason, resolveUser } = require('../../utils/moderation');
const { warn, approve } = require('../../utils/context');

module.exports = {
    permission: "ban members",
    data: { name: 'unban', description: 'Unban a member from the server', usage: ',unban its_washed --s', params: ['user', '[reason]'], flags: { s: 'Punish a user silently' } },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.BanMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.BanMembers)) return;
        if (!args.length) return warn(message, 'Usage: `unban <user> [reason] [--s]`');

        const user = await resolveUser(message, client, args[0]);
        if (!user) return warn(message, `User **${args[0]}** couldn't be found`);

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;
        const silent = parsed.silent;
        const discordReason = `${reason} | ${message.author.username} (${message.author.id})`;

        try {
            await message.guild.bans.remove(user.id, discordReason);
        } catch (err) {
            const code = err && (err.code || (err.rawError && err.rawError.code));
            if (code === 10026) return warn(message, "Can't find this user in the ban list");
            return warn(message, `I couldn't unban **${user}**`);
        }

        if (!silent) {
            const invoked = await invokeDm(user, message.guild.id, 'unban', { reason }).catch(() => false);
            if (!invoked) {
                try {
                    await user.send({
                        embeds: [{
                            color: 0x39ffb8,
                            description: `You have been unbanned from **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`
                        }]
                    });
                } catch (err) {
                    return;
                }
            }
        }

        const historyId = insertCase(message, user, 'Unban', 'None', reason, Date.now() / 1000);
        await sendModLog(message.guild, {
            user,
            moderator: message.author,
            reason,
            description: 'unbanned',
            punishment: 'Unban',
            historyId
        });
        return approve(message, `Unbanned **${user}** (\`#${historyId}\`) - ${reason}`);
    }
};
