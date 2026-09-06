const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'sadge', description: 'Sad moment', usage: ',sadge' },
    aliases: ['sad'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Sadge', description: '😔' })] });
    }
};
