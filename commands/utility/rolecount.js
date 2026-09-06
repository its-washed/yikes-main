const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rolecount', description: 'Show role count and list', usage: ',rolecount' },
    aliases: ['rc', 'roles'],
    cooldown: 5,
    async execute(message) {
        const roles = message.guild.roles.cache.sort((a, b) => b.position - a.position);
        const list = roles.map(r => `${r.name} (${r.members.size})`).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Roles (${roles.size})`, description: list.slice(0, 2000) })] });
    }
};
