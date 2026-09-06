const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'deafenall',
        description: 'Deafen everyone in voice channel',
        usage: ',deafenall'
    },
    aliases: ['defall'],
    cooldown: 10,

    async execute(message) {
        if (!message.member.permissions.has('DeafenMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Deafen Members permission.')] });
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
