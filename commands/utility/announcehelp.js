const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'announcehelp', description: 'Announcement help', usage: ',announcehelp' },
    aliases: ['ahelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Announcement Help', description: '`,announce [#channel] [title] | [description]`\n\nExample:\n`,announce #general Important Update | We have added new features!`' })] });
    }
};
