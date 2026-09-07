const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'clap', description: 'CLAP YOUR MESSAGE', usage: ',clap <text>' },
    cooldown: 2,
    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [{ color: 0xff4757, description: 'Usage: ,clap <text>' }] });
        const clapped = text.split(' ').join(' 👏 ');
        return message.reply({ content: `👏 ${clapped} 👏` });
    }
};
