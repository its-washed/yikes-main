const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'announce',
        description: 'Create an announcement embed',
        usage: ',announce [#channel] title | description'
    },
    aliases: ['ann'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        let channel = message.channel;
        let content = args.join(' ');

        if (message.mentions.channels.first()) {
            channel = message.mentions.channels.first();
            content = args.slice(1).join(' ');
        }

        const parts = content.split('|').map(p => p.trim());
        const title = parts[0];
        const description = parts.slice(1).join('\n') || '';

        if (!title) {
            return message.reply({ embeds: [errorEmbed('Missing Content', 'Usage: ,announce [#channel] Title | Description')] });
        }

        const embed = new EmbedBuilder()
            .setColor(0x6c5ce7)
            .setTitle(title)
            .setDescription(description)
            .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
            .setFooter({ text: `Announced by ${message.author.tag}` })
            .setTimestamp();

        try {
            await channel.send({ embeds: [embed] });
            await message.delete().catch(() => {});
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
