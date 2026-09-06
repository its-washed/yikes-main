const { createEmbed } = require('../../utils/embeds');

const quotes = [
    "The only way to do great work is to love what you do. - Steve Jobs",
    "Innovation distinguishes between a leader and a follower. - Steve Jobs",
    "Life is what happens when you're busy making other plans. - John Lennon",
    "The future belongs to those who believe in the beauty of their dreams. - Eleanor Roosevelt",
    "It is during our darkest moments that we must focus to see the light. - Aristotle",
    "The greatest glory in living lies not in never falling, but in rising every time we fall. - Nelson Mandela",
    "The way to get started is to quit talking and begin doing. - Walt Disney",
    "If life were predictable it would cease to be life, and be without flavor. - Eleanor Roosevelt",
    "If you look at what you have in life, you'll always have more. - Oprah Winfrey",
    "If you set your goals ridiculously high and it's a failure, you will fail above everyone else's success. - James Cameron"
];

module.exports = {
    data: {
        name: 'quote',
        description: 'Quote a replied message, or get a random quote',
        usage: ',quote [text] OR reply to a message with ,quote'
    },
    aliases: ['inspire', 'motivate'],
    cooldown: 5,

    async execute(message, args) {
        const reference = message.reference;

        if (reference) {
            try {
                const referencedMessage = await message.channel.messages.fetch(reference.messageId);

                if (!referencedMessage) {
                    return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Could not find the referenced message.' })] });
                }

                const author = referencedMessage.author;
                const content = referencedMessage.content;
                const createdAt = referencedMessage.createdAt;

                if (!content && referencedMessage.attachments.size > 0) {
                    return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Cannot quote messages with only attachments.' })] });
                }

                if (!content) {
                    return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'That message has no text content.' })] });
                }

                const note = args.join(' ');
                const description = `"${content}"\n\n— ${author} • <t:${Math.floor(createdAt.getTime() / 1000)}:f>`;

                return message.reply({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: 'Quote',
                        author: { name: author.tag, iconURL: author.displayAvatarURL({ dynamic: true }) },
                        description: description + (note ? `\n\n> ${note}` : ''),
                        thumbnail: { url: author.displayAvatarURL({ dynamic: true }) }
                    })]
                });
            } catch (error) {
                return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Failed to fetch the referenced message.' })] });
            }
        }

        if (args.length > 0) {
            const text = args.join(' ');
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Quote',
                    description: `*"${text}"*\n\n— ${message.author}`
                })]
            });
        }

        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        return message.reply({
            embeds: [createEmbed({ color: 0x6c5ce7, title: 'Quote', description: `*"${quote}"*` })]
        });
    }
};
