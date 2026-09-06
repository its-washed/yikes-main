const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'firstmessage', description: 'Get first message in channel', usage: ',firstmessage' },
    aliases: ['fm', 'firstmsg'],
    cooldown: 5,
    async execute(message) {
        const messages = await message.channel.messages.fetch({ limit: 1, after: '0' });
        const first = messages.first();
        if (!first) return message.reply({ embeds: [errorEmbed('Not Found', 'Could not find the first message.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'First Message', fields: [{ name: 'Author', value: first.author.tag, inline: true }, { name: 'Content', value: first.content || '*No content*', inline: false }, { name: 'Link', value: `[Click](${first.url})`, inline: true }, { name: 'Date', value: `<t:${Math.floor(first.createdTimestamp / 1000)}:R>`, inline: true }] })] });
    }
};
