const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serveravatar', description: 'Get server icon', usage: ',serveravatar' },
    aliases: ['sicon', 'guildicon'],
    cooldown: 3,
    async execute(message) {
        const icon = message.guild.iconURL({ size: 1024, dynamic: true });
        if (!icon) return message.reply({ embeds: [errorEmbed('No Icon', 'This server has no icon.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${message.guild.name} Icon`, image: { url: icon } })] });
    }
};
