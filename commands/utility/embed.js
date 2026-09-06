const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'embed',
        description: 'Create a custom embed',
        usage: ',embed [title] | [description]'
    },
    aliases: ['makeembed'],
    cooldown: 10,

    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageMessages')) {
            return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages permission.')] });
        }

        const content = args.join(' ');
        if (!content) return message.reply({ embeds: [errorEmbed('Missing Content', 'Usage: ,embed [title] | [description]')] });

        const parts = content.split('|').map(p => p.trim());
        const title = parts[0];
        const description = parts.slice(1).join(' | ');

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: title,
                description: description || undefined
            })]
        });
    }
};
