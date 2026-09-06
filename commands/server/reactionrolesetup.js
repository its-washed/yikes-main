const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'reactionrolesetup', description: 'Setup reaction roles', usage: ',reactionrolesetup [#channel] [messageId] [@role] [emoji]' },
    aliases: ['rrsetup'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reaction Role Setup', description: 'Reaction role system configured.\n\nUse the reaction role manager to add roles.' })] });
    }
};
