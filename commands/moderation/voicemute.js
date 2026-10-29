const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');

module.exports = {
    permission: "move members",
    data: { name: 'voicemute', description: 'Voice mute a member', usage: ',voicemute [member]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        let member = message.member;
        if (args[0]) {
            member = await noStaff(message, args[0], 'voicemute');
            if (!member) return;
        }

        if (!member.voice || !member.voice.channel) {
            return warn(message, 'This member is **not** in a voice channel');
        }
        if (member.voice.mute) {
            return warn(message, 'This member is **already** muted');
        }

        await member.voice.setMute(true, `Member voice muted by ${message.author}`).catch(() => {});
        return approve(message, `Voice muted ${member}`);
    }
};
