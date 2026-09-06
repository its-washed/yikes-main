const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'deafen',
        description: 'Deafen a member',
        usage: ',deafen [@user]'
    },
    aliases: ['def'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'DeafenMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Deafen Members permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,deafen [@user]')] });

        if (!target.voice.channel) return message.reply({ embeds: [errorEmbed('Not in Voice', 'That user is not in a voice channel.')] });

        await target.voice.setDeaf(true);

        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Deafened', description: `Deafened **${target.user.tag}**.` })] });
    }
};
