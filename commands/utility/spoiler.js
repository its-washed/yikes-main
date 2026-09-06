const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'spoiler',
        description: 'Send a spoiler text',
        usage: ',spoiler [text]'
    },
    aliases: ['sp'],
    cooldown: 3,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,spoiler [text]')] });

        await message.delete().catch(() => {});
        return message.channel.send({ content: `||${text}||` });
    }
};
