const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'wholesome', description: 'Wholesome moment', usage: ',wholesome' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        const msgs = [
            'You are valid and appreciated.',
            'Someone out there loves you.',
            'You are doing great!',
            'Keep going, you got this!',
            'The world is better with you in it.'
        ];
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Wholesome', description: msgs[Math.floor(Math.random() * msgs.length)] })] });
    }
};
