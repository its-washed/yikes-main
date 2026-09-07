const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'say', description: 'Repeat your message', usage: ',say <text>' },
    aliases: ['repeat'],
    cooldown: 2,
    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Usage', ',say <text>')] });
        return message.reply({ content: text });
    }
};
