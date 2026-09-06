const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'choose',
        description: 'Choose between options',
        usage: ',choose option1 | option2 | option3'
    },
    aliases: ['pick'],
    cooldown: 3,

    async execute(message, args) {
        const content = args.join(' ');
        if (!content || !content.includes('|')) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Separate options with |\nExample: ,choose pizza | pasta | tacos' })] });
        }

        const options = content.split('|').map(o => o.trim()).filter(o => o.length > 0);
        const chosen = options[Math.floor(Math.random() * options.length)];

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Decision Maker',
                description: `I choose: **${chosen}**`
            })]
        });
    }
};
