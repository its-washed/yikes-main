const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ship', description: 'Ship two users', usage: ',ship @user1 @user2' },
    aliases: ['love'],
    cooldown: 3,
    async execute(message, args) {
        const users = message.mentions.users;
        if (users.size < 2) return message.reply({ embeds: [errorEmbed('Usage', ',ship @user1 @user2')] });

        const [u1, u2] = users.values();
        const percent = Math.floor(Math.random() * 101);
        const heart = percent >= 75 ? '💖' : percent >= 50 ? '💕' : percent >= 25 ? '💔' : '💀';
        const bar = '❤️'.repeat(Math.round(percent / 10)) + '🤍'.repeat(10 - Math.round(percent / 10));

        return message.reply({
            embeds: [createEmbed({
                color: 0xff6b81,
                title: 'Ship',
                description: `${heart} **${u1.username}** + **${u2.username}** = **${percent}%**\n\`${bar}\``
            })]
        });
    }
};
