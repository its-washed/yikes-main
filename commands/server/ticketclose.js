const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'ticketclose', description: 'Close a ticket', usage: ',ticketclose' },
    aliases: ['closeticket'],
    cooldown: 10,
    async execute(message) {
        if (!hasPermission(message.member, 'ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        if (!message.channel.name.startsWith('ticket-')) return message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not a ticket channel.')] });
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, title: 'Closing Ticket', description: 'This ticket will be closed in 5 seconds.' })] }).then(() => {
            setTimeout(() => message.channel.delete().catch(() => {}), 5000);
        });
    }
};
