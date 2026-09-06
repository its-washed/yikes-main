const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'suggestionhelp', description: 'Suggestion system help', usage: ',suggestionhelp' },
    aliases: ['sughelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Suggestion Help', description: 'Configure suggestions:\n\n`,suggestion [#channel]`\n\nUsers can submit suggestions with buttons.\nMods can approve/deny with reasons.' })] });
    }
};
