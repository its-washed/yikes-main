const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'counterhelp', description: 'Counter channels help', usage: ',counterhelp' },
    aliases: ['cchelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Counter Help', description: 'Counter channels display live stats in voice channel names.\n\nSetup:\n`,counter [#channel] [type]`\n\nTypes: members, online, bots, channels, roles, boosters' })] });
    }
};
