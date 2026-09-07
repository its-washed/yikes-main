const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: { name: 'stealemote', description: 'Steal an emoji from another server', usage: ',stealemote <emoji> [name]' },
    aliases: ['steal'],
    cooldown: 5,
    async execute(message, args) {
        if (!hasPermission(message.member, PermissionFlagsBits.ManageGuild)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Server` permission.')] });
        }

        const emojiArg = args[0];
        const name = args[1];
        if (!emojiArg) return message.reply({ embeds: [errorEmbed('Missing Emoji', 'Usage: ,stealemote <emoji> [name]')] });

        const match = emojiArg.match(/<(a?):(\w+):(\d+)>/);
        if (!match) return message.reply({ embeds: [errorEmbed('Invalid Emoji', 'Provide a custom emoji.')] });

        const animated = match[1] === 'a';
        const emojiName = name || match[2];
        const emojiUrl = `https://cdn.discordapp.com/emojis/${match[3]}.${animated ? 'gif' : 'png'}`;

        try {
            const created = await message.guild.emojis.create({
                attachment: emojiUrl,
                name: emojiName,
                reason: `Stolen by ${message.author.tag}`
            });
            return message.reply({ embeds: [successEmbed('Emoji Stolen', `${created} added as **${emojiName}**.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
