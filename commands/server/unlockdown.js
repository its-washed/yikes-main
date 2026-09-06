const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'unlockdown',
        description: 'Unlock all channels',
        usage: ',unlockdown'
    },
    aliases: ['unlockall'],
    cooldown: 60,

    async execute(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const channels = message.guild.channels.cache.filter(c => c.type === 0 && c.manageable);
        let count = 0;

        for (const [, channel] of channels) {
            try {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                }, { reason: `Unlockdown by ${message.author.tag}` });
                count++;
            } catch {}
        }

        return message.reply({ embeds: [successEmbed('Unlockdown Complete', `Unlocked **${count}** text channel(s).`)] });
    }
};
