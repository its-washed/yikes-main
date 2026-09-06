const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ticketadd', description: 'Add user to ticket', usage: ',ticketadd [@user]' },
    aliases: [],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,ticketadd [@user]')] });
        if (!message.channel.name.startsWith('ticket-')) return message.reply({ embeds: [errorEmbed('Not a Ticket', 'This is not a ticket channel.')] });
        await message.channel.permissionOverwrites.create(target, { ViewChannel: true, SendMessages: true });
        return message.reply({ embeds: [createEmbed({ color: 0x22c55e, description: `Added ${target} to this ticket.` })] });
    }
};
