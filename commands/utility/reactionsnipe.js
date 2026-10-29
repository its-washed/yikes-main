const { COLORS } = require('../../utils/styles');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: { name: 'reactionsnipe', description: 'Snipe the latest reaction that was removed', usage: ',reactionsnipe' },
    aliases: ['rs'],
    cooldown: 5,

    async execute(message) {
        const store = message.client.reactionSnipes;
        const snipes = (store && store.get(message.channel.id)) || [];
        if (!snipes.length) {
            return message.reply({ embeds: [{ color: COLORS.ERROR, description: `${message.author}: No reaction snipes found in this channel` }] });
        }
        const embeds = snipes.map((result, index) => ({
            color: COLORS.NEUTRAL,
            timestamp: new Date(result.timestamp).toISOString(),
            description: `${result.user ? `<@${result.user}>` : result.user} reacted with ${result.reaction} <t:${Math.floor(result.timestamp / 1000)}:R> [**here**](https://discord.com/channels/${message.guild.id}/${message.channel.id}/${result.messageId})`,
            footer: { text: `Page: ${index + 1}/${snipes.length} (${snipes.length} entries)` }
        }));
        if (embeds.length > 1) {
            const paginator = new Paginator(embeds, { userId: message.author.id });
            const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
            await paginator.start(message.channel, sent);
            return sent;
        }
        return message.reply({ embeds });
    }
};
