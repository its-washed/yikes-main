const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'spoiler', description: 'Spoiler tag text', usage: ',spoiler <text>' },
    aliases: ['spoil'],
    cooldown: 2,
    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Usage', ',spoiler <text>')] });
        return message.reply({ content: `||${text}||` });
    }
};
