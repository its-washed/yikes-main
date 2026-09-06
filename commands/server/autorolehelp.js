const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'autorolehelp', description: 'Auto role help', usage: ',autorolehelp' },
    aliases: ['arhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Auto Role Help', description: 'Auto-assign roles to new members.\n\nSetup:\n`,autorole [@role]`\n\nRemove:\n`,autorole off`' })] });
    }
};
