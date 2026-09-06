const { PermissionFlagsBits } = require('discord.js');
const { parseMember, checkHierarchy } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'masskick',
        description: 'Kick multiple users at once',
        usage: ',masskick @user1 @user2 ...'
    },
    aliases: ['mkick'],
    cooldown: 30,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Kick Members` permission.')] });
        }

        const members = message.mentions.members;
        if (members.size === 0) {
            return message.reply({ embeds: [errorEmbed('Missing Users', 'Mention users to kick.')] });
        }

        let kicked = 0;
        let failed = 0;

        for (const [, member] of members) {
            if (!checkHierarchy(message.member, member, message.guild)) { failed++; continue; }
            try {
                await member.kick(`Mass kick by ${message.author.tag}`);
                kicked++;
            } catch { failed++; }
        }

        return message.reply({ embeds: [successEmbed('Mass Kick', `Kicked **${kicked}** member(s).${failed > 0 ? ` Failed: ${failed}` : ''}`)] });
    }
};
