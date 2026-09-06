const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'unmuteall',
        description: 'Unmute everyone in voice channel',
        usage: ',unmuteall'
    },
    aliases: ['undeafenall'],
    cooldown: 10,

    async execute(message) {
        if (!hasPermission(message.member, 'MuteMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Mute Members permission.')] });
        }

        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });

        let count = 0;
        for (const [, member] of channel.members) {
            try {
                await member.voice.setMute(false);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Unmute All', `Unmuted **${count}** members in **${channel.name}**.`)] });
    }
};
