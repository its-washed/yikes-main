const { EmbedBuilder } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'embed',
        description: 'Create a custom embed',
        usage: ',embed [title] | [description] | [color] | [footer]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        const content = args.join(' ');
        if (!content) {
            return message.reply({
                embeds: [errorEmbed('Missing Content', 'Usage: ,embed [title] | [description] | [color] | [footer]\nSeparate fields with |')]
            });
        }

        const parts = content.split('|').map(p => p.trim());
        const title = parts[0] || 'Untitled';
        const description = parts[1] || '';
        const colorHex = parts[2] || '#6c5ce7';
        const footer = parts[3] || '';

        let color;
        try {
            color = parseInt(colorHex.replace('#', ''), 16);
            if (isNaN(color)) color = 0x6c5ce7;
        } catch {
            color = 0x6c5ce7;
        }

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();

        if (footer) embed.setFooter({ text: footer });

        try {
            await message.channel.send({ embeds: [embed] });
            await message.delete().catch(() => {});
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to send embed: ${error.message}`)] });
        }
    }
};
