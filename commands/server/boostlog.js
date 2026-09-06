const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'boostlog', description: 'Configure boost log channel', usage: ',boostlog [#channel]' },
    aliases: ['blog'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,boostlog [#channel]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Boost Log', description: `Boost log channel set to ${channel}.` })] });
    }
};
