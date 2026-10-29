const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first, run } = require('../../utils/database');

module.exports = {
    permission: "move members",
    data: { name: 'voiceunban', description: 'Voice unban a member', usage: ',voiceunban <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        const member = await noStaff(message, args[0], 'voiceunban');
        if (!member) return;

        const check = first('SELECT * FROM voiceban WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
        if (!check) {
            return warn(message, `${member} is **not** voice banned`);
        }

        run('DELETE FROM voiceban WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);

        return approve(message, `Voice unbanned ${member}`);
    }
};
