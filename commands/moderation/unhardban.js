const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm, splitReason, insertCase, sendModLog, resolveUser } = require('../../utils/moderation');

module.exports = {
    permission: "administrator & antinuke admin",
    data: { name: 'unhardban', description: 'Unhardban a hardbanned member', usage: ',unhardban its_washed rassist', params: ['user', '[reason]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.BanMembers)) return;
        if (!args[0]) return warn(message, 'You must provide a user\n> Usage: `unhardban <user> [reason]`');

        const user = await resolveUser(message, client, args[0]);
        if (!user) return warn(message, `User **${args[0]}** couldn't be found`);

        const check = first('SELECT 1 AS ok FROM hardban WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
        if (!check) return warn(message, `${user} is **not** hardbanned`);

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;

        run('DELETE FROM hardban WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
        try {
            await message.guild.bans.remove(user, `Unhardbanned by ${message.author} (${message.author.id}): ${reason}`);
        } catch (err) {}

        const historyId = insertCase(message, user, 'Unhardban', 'None', reason, Date.now() / 1000);
        await sendModLog(message.guild, {
            user,
            moderator: message.author,
            reason,
            description: 'unhardbanned',
            punishment: 'Unhardban',
            historyId
        });
        return approve(message, `Unhardbanned ${user} (\`#${historyId}\`) - **${reason}**`);
    }
};
