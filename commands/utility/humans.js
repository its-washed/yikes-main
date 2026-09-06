const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'humans', description: 'Show all humans in the server', usage: ',humans' },
    aliases: ['humanlist'],
    cooldown: 10,
    async execute(message) {
        const humans = message.guild.members.cache.filter(m => !m.user.bot);
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Humans (${humans.size})`, description: humans.map(m => m.user.tag).join('\n').slice(0, 2000) || 'None' })] });
    }
};
