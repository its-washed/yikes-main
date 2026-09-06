const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'logginghelp', description: 'Logging help', usage: ',logginghelp' },
    aliases: ['loghelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Logging Help', description: 'Configure audit logging:\n\n`,logging [#channel]`\n\nLogs: message deletes, edits, member joins/leaves, role changes, channel changes, etc.' })] });
    }
};
