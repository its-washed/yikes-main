const { errorEmbed } = require('../../utils/embeds');
const { sendQuoteCard } = require('../../utils/quoteCard');

module.exports = {
    data: { name: 'quote', description: "Create a quote out of a user's message", usage: ',quote [messageLink|messageId] [#channel] — or reply to the message' },
    cooldown: 3,
    async execute(message, args) {
        const channel = message.mentions.channels.first() || message.channel;
        let targetMsg = null;

        const linkMatch = args.join(' ').match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (linkMatch) {
            const [, , chId, msgId] = linkMatch;
            const ch = message.guild.channels.cache.get(chId);
            if (ch) targetMsg = await ch.messages.fetch(msgId).catch(() => null);
            if (!targetMsg) return message.reply({ embeds: [errorEmbed('Not Found', 'The referenced message was not found.')] });
        } else if (args[0]) {
            targetMsg = await channel.messages.fetch(args[0]).catch(() => null);
            if (!targetMsg) return message.reply({ embeds: [errorEmbed('Not Found', 'The referenced message was not found.')] });
        } else if (message.reference?.messageId) {
            targetMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (!targetMsg) return message.reply({ embeds: [errorEmbed('Not Found', 'The referenced message was not found.')] });
        } else {
            return message.reply({ embeds: [errorEmbed('Missing Message', 'Please provide a message or reply to a message.')] });
        }

        const embedContent = targetMsg.embeds.length ? targetMsg.embeds.map(e => e.description || '(embed)').join('\n') : '';
        const text = (targetMsg.content || embedContent || '(no content)').slice(0, 800);
        const displayName = targetMsg.member?.displayName || targetMsg.author.displayName || targetMsg.author.username;
        const username = targetMsg.author.username;
        const avatarUrl = targetMsg.author.displayAvatarURL({ size: 512 });

        return sendQuoteCard(message, { text, displayName, username, avatarUrl });
    }
};
