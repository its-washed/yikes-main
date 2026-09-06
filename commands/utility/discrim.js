const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'discrim', description: 'Find users with a discriminator', usage: ',discrim [#0001]' },
    aliases: ['tag'],
    cooldown: 10,
    async execute(message, args) {
        const disc = args[0];
        if (!disc) return message.reply({ embeds: [errorEmbed('Missing Discriminator', 'Usage: ,discrim [#0001]')] });
        const users = message.guild.members.cache.filter(m => m.user.discriminator === disc.replace('#', ''));
        if (users.size === 0) return message.reply({ embeds: [errorEmbed('Not Found', 'No users with that discriminator.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Users with ${disc}`, description: users.map(m => m.user.tag).join('\n').slice(0, 2000) })] });
    }
};
