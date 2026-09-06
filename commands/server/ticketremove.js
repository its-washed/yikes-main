const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ticketremove', description: 'Remove user from ticket', usage: ',ticketremove [@user]' },
    aliases: ['ticketkick'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,ticketremove [@user]')] });
        if (!message.channel.name.startsWith('ticket-')) return message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not a ticket channel.')] });
        await message.channel.permissionOverwrites.delete(target);
        return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: `Removed ${target} from this ticket.` })] });
    }
};
