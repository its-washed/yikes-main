const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'poll', description: 'Quick yes/no poll', usage: ',poll [question]' },
    aliases: ['yesno'],
    cooldown: 30,
    async execute(message, args) {
        const question = args.join(' ');
        if (!question) return message.reply({ embeds: [errorEmbed('Missing Question', 'Usage: ,poll [question]')] });
        const msg = await message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Poll', description: `**${question}**`, footer: { text: `By ${message.author.tag}` } })] });
        await msg.react('👍');
        await msg.react('👎');
    }
};
