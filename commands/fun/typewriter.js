const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'typewriter',
        description: 'Simulate typing effect',
        usage: ',typewriter [text]'
    },
    aliases: ['tw'],
    cooldown: 5,

    async execute(message, args) {
        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Text', 'Usage: ,typewriter [text]')] });

        const msg = await message.channel.send('_ _');
        let current = '';

        for (let i = 0; i < text.length; i++) {
            current += text[i];
            await msg.edit(current + '▌');
            await new Promise(r => setTimeout(r, 50 + Math.random() * 100));
        }

        await msg.edit(text);
    }
};
