const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'levelshelp', description: 'Leveling system help', usage: ',levelshelp' },
    aliases: ['lhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Levels Help', description: 'Earn XP by chatting!\n\nCommands:\n`,rank` — Check your rank\n`,leaderboard` — View top users\n`,levels [on/off]` — Toggle leveling\n\nXP is earned per message with a cooldown.' })] });
    }
};
