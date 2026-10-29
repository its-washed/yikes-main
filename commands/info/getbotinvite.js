const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, COLORS } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'getbotinvite', description: "Get the bot invite based on it's id", usage: ',getbotinvite <bot>' },
    aliases: ['gbi'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            return warn(message, 'Usage: `getbotinvite <bot>`');
        }

        let user = message.mentions.users.first();
        if (!user) {
            const rawId = args[0].replace(/[<@!>]/g, '');
            if (!/^\d{17,20}$/.test(rawId)) {
                return warn(message, `No user called **${args[0]}** found`);
            }
            try {
                user = await client.users.fetch(rawId);
            } catch {
                return warn(message, `No user called **${args[0]}** found`);
            }
        }

        if (!user.bot) {
            return warn(message, 'This is **not** a bot');
        }

        const url = `https://discord.com/oauth2/authorize?client_id=${user.id}&permissions=8&scope=bot%20applications.commands`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel(`Invite ${user.username}`)
                .setStyle(ButtonStyle.Link)
                .setURL(url)
        );

        return message.reply({
            embeds: [createEmbed({ color: COLORS.primary, description: `[Click here to invite **${user.username}**](${url})` })],
            components: [row]
        });
    }
};
