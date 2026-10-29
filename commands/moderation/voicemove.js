const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');
const { resolveMember } = require('../../utils/roleplay');

module.exports = {
    permission: "move members",
    data: { name: 'voicemove', description: 'Move a member to another voice channel', usage: ',voicemove <member>' },
    aliases: ['drag'],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.MoveMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        const member = await resolveMember(message, args[0]);
        if (!member) {
            return warn(message, `Member **${args[0] || ''}** couldn't be found`);
        }

        if (!member.voice || !member.voice.channel) {
            return warn(message, 'This member is **not** in a voice channel');
        }
        if (!message.member.voice || !message.member.voice.channel) {
            return warn(message, 'You are **not** in a voice channel');
        }
        if (message.member.voice.channel.id === member.voice.channel.id) {
            return warn(message, 'You are **already** in the same voice channel as this member');
        }
        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MoveMembers)) {
            return warn(message, "I don't have permission to move members");
        }

        try {
            await member.voice.setChannel(message.member.voice.channel, `Member moved by ${message.author}`);
            return approve(message, `Moved ${member} to ${message.member.voice.channel}`);
        } catch (err) {
            return warn(message, "I don't have permission to move this member");
        }
    }
};
