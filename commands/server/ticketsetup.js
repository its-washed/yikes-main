const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'ticketsetup', description: 'Setup ticket system', usage: ',ticketsetup [#channel]' },
    aliases: ['tickets'],
    cooldown: 30,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('Missing Channel', 'Usage: ,ticketsetup [#channel]')] });
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Ticket Setup', description: `Ticket system setup in ${channel}.\n\nReact with 🎫 to create a ticket.` })] });
    }
};
