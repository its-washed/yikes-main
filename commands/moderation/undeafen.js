const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'undeafen',
        description: 'Undeafen a member',
        usage: ',undeafen [@user]'
    },
    aliases: ['undef'],
    cooldown: 5,

    async execute(message, args) {
        if (!hasPermission(message.member, 'DeafenMembers')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Deafen Members permission.')] });
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,undeafen [@user]')] });

        await target.voice.setDeaf(false);

        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, title: 'Undeafened', description: `Undeafened **${target.user.tag}**.` })] });
    }
};
