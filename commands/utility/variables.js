const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/styles');

module.exports = {
    data: { name: 'variables', description: 'View all available variables for embed messages', usage: ',variables' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('User').setStyle(ButtonStyle.Link).setURL('https://docs.evelina.bot/embeds/content-in-embeds/variables#user-related-variables'),
            new ButtonBuilder().setLabel('Guild').setStyle(ButtonStyle.Link).setURL('https://docs.evelina.bot/embeds/content-in-embeds/variables#guild-related-variables'),
            new ButtonBuilder().setLabel('Lastfm').setStyle(ButtonStyle.Link).setURL('https://docs.evelina.bot/embeds/content-in-embeds/variables#guild-related-variables-1'),
            new ButtonBuilder().setLabel('Levels').setStyle(ButtonStyle.Link).setURL('https://docs.evelina.bot/embeds/content-in-embeds/variables#levels-related-variables'),
            new ButtonBuilder().setLabel('Invoke').setStyle(ButtonStyle.Link).setURL('https://docs.evelina.bot/embeds/content-in-embeds/variables#punishments-related-variables')
        );
        return message.reply({
            embeds: [{
                color: COLORS.NEUTRAL,
                description: `${message.author}: Here are all the available variables for embed messages`
            }],
            components: [row]
        });
    }
};
