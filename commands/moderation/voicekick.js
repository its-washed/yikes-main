const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');

module.exports = {
    permission: "move members",
    data: { name: 'voicekick', description: 'Kick a member from a voice channel', usage: ',voicekick [member]' },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        let member = message.member;
        if (args[0]) {
            member = await noStaff(message, args[0], 'voicekick');
            if (!member) return;
        }

        if (!member.voice || !member.voice.channel) {
            return warn(message, 'This member is **not** in a voice channel');
        }

        await member.voice.disconnect(`Member kicked from voice channel by ${message.author}`).catch(() => {});
        return approve(message, `Kicked ${member} from the voice channel`);
    }
};
