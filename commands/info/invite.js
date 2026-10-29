const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embeds');

function inviteUrl(clientId) {
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
}

module.exports = {
    data: { name: 'invite', description: 'Send an invite link of the bot', usage: ',invite' },
    aliases: ['link'],
    cooldown: 5,

    async execute(message, args, client) {
        const url = inviteUrl(client.user.id);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Invite ${client.user.username}`)
                .setStyle(ButtonStyle.Link)
                .setURL(url)
        );

        return message.reply({
            embeds: [createEmbed({ color: COLORS.primary, description: `[Click here to invite me](${url})` })],
            components: [row]
        });
    }
};
