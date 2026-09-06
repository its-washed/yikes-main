const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'unlockdown',
        description: 'Unlock all channels in the server',
        usage: ',unlockdown'
    },
    aliases: ['serverunlock'],
    cooldown: 30,

    async execute(message) {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Administrator permission.')] });
        }

        const channels = message.guild.channels.cache.filter(c => c.type === 0);

        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Unlocked', `Unlocked **${channels.size}** channels.`)] });
    }
};
