const { createEmbed, COLORS } = require('../../utils/embeds');

const ANSWERS = ['yes', 'no', 'never', 'most likely', 'absolutely', 'absolutely not', 'of course not'];

module.exports = {
    data: { name: 'eightball', description: 'Ask the 8ball a question', usage: ',eightball Are you gay?', params: ['question'] },
    aliases: ['8ball'],
    cooldown: 3,
    async execute(message, args) {
        const question = args.join(' ').trim();
        if (!question) return message.reply({ embeds: [require('../../utils/embeds').warningEmbed(null, `${message.author}: Give me a **question** to answer`)] });
        const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            description: `**Question:** ${question}${question.endsWith('?') ? '' : '?'}\n**Answer:** ${answer}`,
            author: {
                name: message.author.tag,
                icon_url: message.author.avatar ? message.author.avatarURL({ size: 256 }) : undefined
            }
        });
        return message.reply({ embeds: [embed] });
    }
};
