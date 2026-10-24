const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'deafenall',
        description: 'Deafen everyone in voice channel',
        usage: ',deafenall'
    },
    aliases: ['defall'],
    cooldown: 10,

    async execute(message) {
        if (!hasPermission(message.member, 'DeafenMembers')) {
            return message.reply({ embeds: [permissionDenied(message, 'deafen_members')] });
        }

        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });

        let count = 0;
        for (const [, member] of channel.members) {
            try {
                await member.voice.setDeaf(true);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Deafen All', `Deafened **${count}** members in **${channel.name}**.`)] });
    }
};
