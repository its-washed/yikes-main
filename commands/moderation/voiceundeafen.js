const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');

module.exports = {
    permission: "move members",
    data: { name: 'voiceundeafen', description: 'Voice undeafen a member', usage: ',voiceundeafen [member]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        let member = message.member;
        if (args[0]) {
            member = await noStaff(message, args[0], 'voiceundeafen');
            if (!member) return;
        }

        if (!member.voice || !member.voice.deaf) {
            return warn(message, 'This member is **not** deafened');
        }

        await member.voice.setDeaf(false, `Voice undeafened by ${message.author}`).catch(() => {});
        return approve(message, `Voice undeafened ${member}`);
    }
};
