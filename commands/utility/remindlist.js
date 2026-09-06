const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'remindlist', description: 'View active reminders', usage: ',remindlist' },
    aliases: ['myreminders'],
    cooldown: 5,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reminders', description: '*Reminders are not persisted yet.*\n\nUse `,remindme` to set a reminder.' })] });
    }
};
