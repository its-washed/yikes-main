const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'lovecalc', description: 'Calculate love compatibility', usage: ',lovecalc @user1 @user2' },
    aliases: ['lc'],
    cooldown: 5,
    async execute(message, args) {
        const users = message.mentions.users;
        if (users.size < 2) return message.reply({ embeds: [{ color: 0xff4757, description: 'Mention 2 users.' }] });

        const [u1, u2] = users.values();
        const hash = (u1.id + u2.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const percent = hash % 101;
        const bar = '❤️'.repeat(Math.round(percent / 10)) + '🖤'.repeat(10 - Math.round(percent / 10));

        let verdict;
        if (percent >= 80) verdict = 'Perfect match!';
        else if (percent >= 60) verdict = 'Great together!';
        else if (percent >= 40) verdict = 'Could work out.';
        else if (percent >= 20) verdict = 'Not the best match...';
        else verdict = 'Not meant to be.';

        return message.reply({
            embeds: [createEmbed({
                color: 0xff6b81,
                title: 'Love Calculator',
                description: `${u1.username} + ${u2.username}\n\`${bar}\`\n\n**${percent}%** — ${verdict}`
            })]
        });
    }
};
