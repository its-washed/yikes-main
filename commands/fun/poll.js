const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'poll', description: 'Create a quick poll', usage: ',poll <question>' },
    cooldown: 10,
    async execute(message, args) {
        const question = args.join(' ');
        if (!question) return message.reply({ embeds: [errorEmbed('Usage', ',poll <question>')] });

        const msg = await message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Poll',
                description: question,
                footer: { text: 'React to vote!' }
            })]
        });
        await msg.react('✅');
        await msg.react('❌');
    }
};
