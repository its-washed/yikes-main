const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'ticketmanagement', description: 'Ticket management help', usage: ',ticketmanagement' },
    aliases: ['tmhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Ticket Management', description: '`,ticketsetup [#channel]`\n`,ticketadd [@user]`\n`,ticketremove [@user]`\n`,ticketclose`' })] });
    }
};
