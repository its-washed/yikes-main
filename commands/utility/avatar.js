const { AttachmentBuilder } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'avatar',
        description: 'Get a user\'s avatar',
        usage: ',avatar [@user]'
    },
    aliases: ['av', 'pfp'],
    cooldown: 5,

    async execute(message, args, client) {
        const target = parseMember(message, args[0]) || message.member;

        const embed = createEmbed({
            color: 0x6c5ce7,
            title: `${target.user.tag}'s Avatar`,
            image: { url: target.user.displayAvatarURL({ size: 1024, dynamic: true }) },
            fields: [
                { name: 'Format', value: `[PNG](${target.user.displayAvatarURL({ size: 1024, format: 'png' })}) | [JPG](${target.user.displayAvatarURL({ size: 1024, format: 'jpg' })}) | [WebP](${target.user.displayAvatarURL({ size: 1024, format: 'webp' })})`, inline: false }
            ]
        });

        return message.reply({ embeds: [embed] });
    }
};
