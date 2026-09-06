const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'undeafen',
        description: 'Undeafen a member',
        usage: ',undeafen @user'
    },
    aliases: ['undeaf'],
    cooldown: 5,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Deafen Members` permission.')] });
        }

        const target = parseMember(message, args[0]);
        if (!target) return message.reply({ embeds: [errorEmbed('User Not Found', 'Could not find that user.')] });

        try {
            await target.voice.setDeaf(false, `Undeafened by ${message.author.tag}`);
            return message.reply({ embeds: [successEmbed('Member Undeafened', `**${target.user.tag}** has been undeafened.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
