const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'online', description: 'Show online members', usage: ',online' },
    aliases: ['whosonline'],
    cooldown: 10,
    async execute(message) {
        const online = message.guild.members.cache.filter(m => m.presence?.status !== 'offline' && !m.user.bot);
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: `Online Members (${online.size})`, description: online.map(m => m.user.tag).join('\n').slice(0, 2000) || 'None' })] });
    }
};
