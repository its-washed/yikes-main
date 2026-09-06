const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'undeafenall',
        description: 'Undeafen everyone in voice channel',
        usage: ',undeafenall'
    },
    aliases: ['undefall'],
    cooldown: 10,

    async execute(message) {
        if (!hasPermission(message.member, 'DeafenMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Deafen Members permission.')] });
        }

        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });

        let count = 0;
        for (const [, member] of channel.members) {
            try {
                await member.voice.setDeaf(false);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Undeafen All', `Undeafened **${count}** members in **${channel.name}**.`)] });
    }
};
