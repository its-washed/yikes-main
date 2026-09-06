const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'muteall',
        description: 'Mute everyone in voice channel',
        usage: ',muteall'
    },
    aliases: ['deafenall'],
    cooldown: 10,

    async execute(message) {
        if (!message.member.permissions.has('MuteMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Mute Members permission.')] });
        }

        const channel = message.member.voice.channel;
        if (!channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });

        let count = 0;
        for (const [, member] of channel.members) {
            try {
                await member.voice.setMute(true);
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Mute All', `Muted **${count}** members in **${channel.name}**.`)] });
    }
};
