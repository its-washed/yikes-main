const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { first, run } = require('../../utils/database');

module.exports = {
    permission: "move members",
    data: { name: 'voiceban', description: 'Voice ban a member', usage: ',voiceban <member>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        const member = await noStaff(message, args[0], 'voiceban');
        if (!member) return;

        const check = first('SELECT * FROM voiceban WHERE guild_id = ? AND user_id = ?', message.guild.id, member.id);
        if (check) {
            return warn(message, `${member} is **already** voice banned`);
        }

        if (member.voice && member.voice.channel) {
            await member.voice.disconnect(`Voice ban by ${message.author}`).catch(() => {});
        }

        run('INSERT INTO voiceban (guild_id, user_id, moderator_id, timestamp) VALUES (?, ?, ?, ?)',
            message.guild.id, member.id, message.author.id, Date.now() / 1000);

        return approve(message, `Voice banned ${member}`);
    }
};
