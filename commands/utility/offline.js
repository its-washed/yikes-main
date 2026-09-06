const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'offline', description: 'Show offline members', usage: ',offline' },
    aliases: ['whooff'],
    cooldown: 10,
    async execute(message) {
        const offline = message.guild.members.cache.filter(m => m.presence?.status === 'offline' && !m.user.bot);
        return message.reply({ embeds: [createEmbed({ color: 0x6b7280, title: `Offline Members (${offline.size})`, description: offline.map(m => m.user.tag).join('\n').slice(0, 2000) || 'None' })] });
    }
};
