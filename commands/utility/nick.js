const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'nick',
        description: 'Change a member\'s nickname',
        usage: ',nick [@user] [nickname]'
    },
    aliases: ['nickname'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Nicknames` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Manage Nicknames` permission.')] });
        }

        const member = parseMember(message, args[0]) || message.member;
        const nickname = args.slice(message.mentions.members.first() ? 1 : 0).join(' ');

        if (!nickname) {
            try {
                await member.setNickname(null, `Nickname reset by ${message.author.tag}`);
                return message.reply({ embeds: [successEmbed('Nickname Reset', `Reset ${member}'s nickname.`)] });
            } catch (error) {
                return message.reply({ embeds: [errorEmbed('Error', `Failed to reset nickname: ${error.message}`)] });
            }
        }

        if (nickname.length > 32) {
            return message.reply({ embeds: [errorEmbed('Too Long', 'Nickname must be 32 characters or less.')] });
        }

        try {
            await member.setNickname(nickname, `Nickname set by ${message.author.tag}`);
            return message.reply({ embeds: [successEmbed('Nickname Changed', `Changed ${member}'s nickname to **${nickname}**.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed to change nickname: ${error.message}`)] });
        }
    }
};
