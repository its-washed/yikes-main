const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'remindhelp', description: 'Reminder help', usage: ',remindhelp' },
    aliases: ['rmhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reminder Help', description: 'Set a reminder:\n`,remindme [time] [text]`\n\nTime formats: `10m`, `2h`, `1d`, `1w`\n\nExample:\n`,remindme 2h Check the oven`' })] });
    }
};
