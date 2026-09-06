const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rolelist', description: 'List all roles', usage: ',rolelist' },
    aliases: ['rl'],
    cooldown: 5,
    async execute(message) {
        const roles = message.guild.roles.cache.sort((a, b) => b.position - a.position);
        const list = roles.map(r => `${r} — ${r.members.size} members`).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Roles (${roles.size})`, description: list.slice(0, 2000) })] });
    }
};
