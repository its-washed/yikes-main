const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'commandcount', description: 'Count total commands', usage: ',commandcount' },
    aliases: ['cmds', 'totalcmds'],
    cooldown: 5,
    async execute(message, client) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Command Count', description: `**${client.commands.size}** commands loaded.` })] });
    }
};
