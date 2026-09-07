const { createEmbed, errorEmbed } = require('../../utils/embeds');

const responses = [
    'It is certain.', 'It is decidedly so.', 'Without a doubt.',
    'Yes definitely.', 'You may rely on it.', 'As I see it, yes.',
    'Most likely.', 'Outlook good.', 'Yes.',
    'Signs point to yes.', 'Reply hazy, try again.',
    'Ask again later.', 'Better not tell you now.',
    'Cannot predict now.', 'Concentrate and ask again.',
    'Don\'t count on it.', 'My reply is no.',
    'My sources say no.', 'Outlook not so good.',
    'Very doubtful.'
];

module.exports = {
    data: { name: '8ball', description: 'Ask the magic 8ball', usage: ',8ball <question>' },
    aliases: ['eightball'],
    cooldown: 3,
    async execute(message, args) {
        const question = args.join(' ');
        if (!question) return message.reply({ embeds: [errorEmbed('Usage', ',8ball <question>')] });

        const answer = responses[Math.floor(Math.random() * responses.length)];
        return message.reply({
            embeds: [createEmbed({
                color: 0x2f3542,
                title: 'Magic 8ball',
                fields: [
                    { name: 'Question', value: question.slice(0, 1000) },
                    { name: 'Answer', value: answer }
                ]
            })]
        });
    }
};
