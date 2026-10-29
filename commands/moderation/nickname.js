const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff } = require('../../utils/moderation');
const { warn, approve } = require('../../utils/context');

module.exports = {
    permission: "manage nicknames",
    data: { name: 'nickname', description: "Change a member's nickname", usage: ',nickname <member> [nick|none]' },
    aliases: ['nick'],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.ManageNicknames)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.ManageNicknames)) return;
        if (args.length < 2) return warn(message, 'Usage: `nickname <member> [nick|none]`');

        const member = await noStaff(message, args[0], 'nickname');
        if (!member) return;

        let nick = args.slice(1).join(' ');
        if (nick.toLowerCase() === 'none') nick = null;
        if (nick && nick.length > 32) return warn(message, "Nickname can't be longer than 32 characters");

        try {
            await member.setNickname(nick, `Nickname ${nick ? 'changed' : 'removed'} by ${message.author}`);
        } catch (err) {
            if (err && err.code === 50013) {
                return warn(message, "I don't have permission to change this member's nickname. Please check the role hierarchy.");
            }
            return warn(message, 'Display name contains community flagged words');
        }
        return approve(message, nick ? `Changed ${member} nickname to **${nick}**` : `Removed ${member}'s nickname`);
    }
};
