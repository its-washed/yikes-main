const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'quote', description: 'Quote a message', usage: ',quote <messageLink|messageId> [#channel]' },
    cooldown: 3,
    async execute(message, args) {
        const channel = message.mentions.channels.first() || message.channel;
        let targetMsg;

        const linkMatch = args.join(' ').match(/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
        if (linkMatch) {
            const [, , chId, msgId] = linkMatch;
            const ch = message.guild.channels.cache.get(chId);
            if (ch) targetMsg = await ch.messages.fetch(msgId).catch(() => null);
        } else if (args[0]) {
            targetMsg = await channel.messages.fetch(args[0]).catch(() => null);
        }

        if (!targetMsg) return message.reply({ embeds: [errorEmbed('Not Found', 'Provide a message ID or link.')] });

        const attachments = targetMsg.attachments.size ? targetMsg.attachments.map(a => a.url).join('\n') : '';
        const embedContent = targetMsg.embeds.length ? targetMsg.embeds.map(e => e.description || '(embed)').join('\n') : '';

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                author: { name: targetMsg.author.tag, icon_url: targetMsg.author.displayAvatarURL() },
                description: `**${targetMsg.author.username}** said:\n${targetMsg.content || embedContent || '(no content)'}`,
                image: targetMsg.attachments.first() ? { url: targetMsg.attachments.first().url } : undefined,
                footer: { text: `#${targetMsg.channel.name}` },
                timestamp: targetMsg.createdAt.toISOString()
            })]
        });
    }
};
