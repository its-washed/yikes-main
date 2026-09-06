const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'idiot', description: 'Call someone an idiot', usage: ',idiot [@user]' },
    aliases: ['loser'],
    cooldown: 5,
    async execute(message) {
        const target = message.mentions.users.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,idiot [@user]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Idiot!', description: `${message.author} thinks ${target} is an idiot.` })] });
    }
};
