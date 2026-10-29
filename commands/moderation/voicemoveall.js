const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm } = require('../../utils/moderation');
const { approve, warn } = require('../../utils/context');

function resolveVoiceChannel(message, value) {
    if (!value) return null;
    const id = String(value).replace(/[<#>]/g, '');
    const channels = message.guild.channels.cache.filter(channel =>
        channel.type === 2 && (/^\d{17,20}$/.test(id) ? channel.id === id : channel.name.toLowerCase() === String(value).toLowerCase()));
    if (channels.size === 1) return channels.first();
    return null;
}

module.exports = {
    permission: "Move all members",
    data: { name: 'voicemoveall', description: 'Move all members from a specific voice channel to the author\'s channel', usage: ',voicemoveall <channel> [other_channel]' },
    aliases: ['dragall'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.MoveMembers)) return;

        const channel = resolveVoiceChannel(message, args[0]);
        if (!channel) {
            return warn(message, `No voice channel named \`${args[0] || ''}\` found`);
        }
        if (!message.member.voice || !message.member.voice.channel) {
            return warn(message, 'You are **not** in a voice channel');
        }

        const authorChannel = message.member.voice.channel;
        const otherChannel = args[1] ? resolveVoiceChannel(message, args[1]) : null;
        if (args[1] && !otherChannel) {
            return warn(message, `No voice channel named \`${args[1]}\` found`);
        }

        const targetChannel = otherChannel || channel;
        const membersToMove = otherChannel ? [...channel.members.values()] : [...authorChannel.members.values()];

        if (!membersToMove.length) {
            return warn(message, `No members in \`${channel.name}\` to move`);
        }

        for (const member of membersToMove) {
            if (member.voice && member.voice.channel) {
                await member.voice.setChannel(targetChannel, `Moved by ${message.author}`).catch(() => {});
            } else {
                await warn(message, `${member} is not connected to a voice channel`);
            }
        }

        return approve(message, `Moved ${membersToMove.length} member(s) from ${authorChannel} to ${channel}`);
    }
};
