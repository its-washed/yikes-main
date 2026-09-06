const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'lockdown',
        description: 'Lock all channels in the server',
        usage: ',lockdown'
    },
    aliases: ['serverlock'],
    cooldown: 30,

    async execute(message) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator permission.')] });
        }

        const channels = message.guild.channels.cache.filter(c => c.type === 0);

        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Lockdown', `Locked **${channels.size}** channels.`)] });
    }
};
