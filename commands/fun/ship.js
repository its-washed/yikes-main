const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'ship',
        description: 'Check compatibility between two users',
        usage: ',ship @user1 @user2'
    },
    aliases: ['love'],
    cooldown: 5,

    async execute(message, args) {
        const user1 = message.mentions.users.first();
        const user2 = message.mentions.users.second() || message.author;

        if (!user1) {
            return message.reply({ embeds: [errorEmbed('Missing Users', 'Please mention two users to ship.')] });
        }

        const shipId = (BigInt(user1.id) + BigInt(user2.id)).toString();
        const percentage = parseInt(shipId.slice(-3)) % 101;

        let heartEmoji;
        if (percentage >= 80) heartEmoji = '💖';
        else if (percentage >= 60) heartEmoji = '💕';
        else if (percentage >= 40) heartEmoji = '💗';
        else if (percentage >= 20) heartEmoji = '💔';
        else heartEmoji = '💀';

        const barLength = 20;
        const filled = Math.round((percentage / 100) * barLength);
        const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

        return message.reply({
            embeds: [createEmbed({
                color: percentage >= 50 ? 0xff6b81 : 0x747d8c,
                title: 'Ship Calculator',
                description: `${heartEmoji} **${user1.tag}** x **${user2.tag}** ${heartEmoji}\n\n\`${bar}\` **${percentage}%**`,
                footer: { text: getShipMessage(percentage) }
            })]
        });
    }
};

function getShipMessage(percentage) {
    if (percentage >= 90) return 'Perfect match! Get married already!';
    if (percentage >= 70) return 'Great chemistry between these two!';
    if (percentage >= 50) return 'There\'s something special here...';
    if (percentage >= 30) return 'Just friends... for now.';
    if (percentage >= 10) return 'Not the best match, but hey.';
    return 'Better off apart.';
}
