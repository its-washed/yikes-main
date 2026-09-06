const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'afkhelp', description: 'AFK help', usage: ',afkhelp' },
    aliases: [],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0xfbbf24, title: 'AFK Help', description: 'Set AFK:\n`,setafk [reason]`\n\nRemove AFK:\n`,removeafk`\n\nView AFK users:\n`,afklist`' })] });
    }
};
