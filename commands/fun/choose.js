const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'choose', description: 'Choose between options', usage: ',choose <option1 | option2 | ...>' },
    cooldown: 2,
    async execute(message, args) {
        const options = args.join(' ').split('|').map(s => s.trim()).filter(Boolean);
        if (options.length < 2) return message.reply({ embeds: [errorEmbed('Usage', ',choose option1 | option2 | option3')] });

        const chosen = options[Math.floor(Math.random() * options.length)];
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Choice', description: `I choose: **${chosen}**` })] });
    }
};
