const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'ship',
        description: 'Ship two users',
        usage: ',ship [@user1] [@user2]'
    },
    aliases: ['love'],
    cooldown: 5,

    async execute(message) {
        const user1 = message.author;
        const user2 = message.mentions.users.first() || message.author;

        const love = Math.floor(Math.random() * 101);
        let emoji = '💔';
        if (love > 75) emoji = '❤️';
        else if (love > 50) emoji = '💖';
        else if (love > 25) emoji = '💕';

        const bar = '█'.repeat(Math.floor(love / 5)) + '░'.repeat(20 - Math.floor(love / 5));

        return message.reply({
            embeds: [createEmbed({
                color: 0xec4899,
                title: 'Love Calculator',
                description: `${user1.tag} 💕 ${user2.tag}\n\n**${love}%** ${emoji}\n\`${bar}\``
            })]
        });
    }
};
