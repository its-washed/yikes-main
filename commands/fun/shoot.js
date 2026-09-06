const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'shoot', description: 'Shoot someone', usage: ',shoot [@user]' },
    aliases: ['bang'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,shoot [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Shoot!', description: `${message.author} shoots ${target}! 🔫` })] });
    }
};
