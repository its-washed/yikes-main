const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'snipe',
        description: 'View last deleted or edited message',
        usage: ',snipe [--edited]'
    },
    aliases: ['s'],
    cooldown: 5,

    async execute(message, args, client) {
        const isEdited = args.includes('--edited');
        const snipes = isEdited ? client.editSnipes : client.snipes;
        const snipe = snipes.get(message.channel.id);

        if (!snipe) {
            return message.reply({
                embeds: [errorEmbed('Nothing to Snipe', `No ${isEdited ? 'edited' : 'deleted'} messages found in this channel.`)]
            });
        }

        if (isEdited) {
            const embed = createEmbed({
                color: 0x74b9ff,
                title: 'Edited Message',
                fields: [
                    { name: 'Author', value: `${snipe.author.tag}`, inline: true },
                    { name: 'Before', value: snipe.oldContent || '*No content*', inline: false },
                    { name: 'After', value: snipe.newContent || '*No content*', inline: false }
                ]
            });
            return message.reply({ embeds: [embed] });
        }

        const embed = createEmbed({
            color: 0xff6b6b,
            title: 'Deleted Message',
            fields: [
                { name: 'Author', value: `${snipe.author.tag}`, inline: true },
                { name: 'Content', value: snipe.content || '*No text content*', inline: false }
            ]
        });

        if (snipe.image) {
            embed.setImage({ url: snipe.image });
        }

        return message.reply({ embeds: [embed] });
    }
};
