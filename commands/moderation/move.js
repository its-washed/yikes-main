const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'move',
        description: 'Move a user to another voice channel',
        usage: ',move [@user] [channel]'
    },
    aliases: [],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has('MoveMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Move Members permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,move [@user] [#channel]')] });

        if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });

        const channel = message.mentions.channels.first() || message.member.voice.channel;
        if (!channel || channel.type !== 2) return message.reply({ embeds: [errorEmbed('Invalid Channel', 'Provide a voice channel.')] });

        await target.voice.setChannel(channel);

        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Moved', description: `Moved **${target.user.tag}** to **${channel.name}**.` })] });
    }
};
