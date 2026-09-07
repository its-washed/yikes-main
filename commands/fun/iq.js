const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'iq', description: 'Check your IQ', usage: ',iq [@user]' },
    cooldown: 3,
    async execute(message) {
        const target = message.mentions.users.first() || message.author;
        const iq = Math.floor(Math.random() * 201);
        let rank;
        if (iq >= 180) rank = 'Genius';
        else if (iq >= 140) rank = 'Gifted';
        else if (iq >= 120) rank = 'Above Average';
        else if (iq >= 100) rank = 'Average';
        else if (iq >= 80) rank = 'Below Average';
        else rank = 'Room Temperature IQ';

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'IQ Test', description: `**${target.username}**: **${iq}** — ${rank}` })] });
    }
};
