const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'bots', description: 'Show all bots in the server', usage: ',bots' },
    aliases: ['botlist'],
    cooldown: 10,
    async execute(message) {
        const bots = message.guild.members.cache.filter(m => m.user.bot);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Bots (${bots.size})`, description: bots.map(m => m.user.tag).join('\n').slice(0, 2000) || 'None' })] });
    }
};
