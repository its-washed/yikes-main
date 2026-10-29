const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');

module.exports = {
    permission: "move members",
    data: { name: 'voiceunmute', description: 'Voice unmute a member', usage: ',voiceunmute [member]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        let member = message.member;
        if (args[0]) {
            member = await noStaff(message, args[0], 'voiceunmute');
            if (!member) return;
        }

        if (!member.voice || !member.voice.mute) {
            return warn(message, 'This member is **not** voice muted');
        }

        await member.voice.setMute(false, `Member voice unmuted by ${message.author}`).catch(() => {});
        return approve(message, `Voice unmuted ${member}`);
    }
};
