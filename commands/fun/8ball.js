const { createEmbed } = require('../../utils/embeds');

const responses = [
    'It is certain.', 'It is decidedly so.', 'Without a doubt.',
    'Yes - definitely.', 'You may rely on it.', 'As I see it, yes.',
    'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
    'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
    'Cannot predict now.', 'Concentrate and ask again.',
    'Don\'t count on it.', 'My reply is no.', 'My sources say no.',
    'Outlook not so good.', 'Very doubtful.'
];

module.exports = {
    data: {
        name: '8ball',
        description: 'Ask the magic 8-ball',
        usage: ',8ball [question]'
    },
    aliases: ['eightball', 'magic8ball'],
    cooldown: 5,

    async execute(message, args) {
        if (!args.length) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Ask me a question!' })] });
        }

        const question = args.join(' ');
        const response = responses[Math.floor(Math.random() * responses.length)];

        return message.reply({
            embeds: [createEmbed({
                color: 0x2f3542,
                title: '🎱 Magic 8-Ball',
                fields: [
                    { name: 'Question', value: question, inline: false },
                    { name: 'Answer', value: response, inline: false }
                ]
            })]
        });
    }
};
