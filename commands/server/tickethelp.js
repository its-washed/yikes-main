const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'tickethelp', description: 'Ticket system help', usage: ',tickethelp' },
    aliases: ['thelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Ticket Help', description: 'Setup: `,ticketsetup [#channel]`\nAdd user: `,ticketadd [@user]`\nRemove user: `,ticketremove [@user]`\nClose: `,ticketclose`' })] });
    }
};
