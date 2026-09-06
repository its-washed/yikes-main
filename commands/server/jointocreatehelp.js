const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'jointocreatehelp', description: 'Join to create help', usage: ',jointocreatehelp' },
    aliases: ['jtc', 'jtchelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Join to Create Help', description: 'Temp voice channels created when users join.\n\nSetup:\n`,jointocreate [#channel]`\n\nWhen a user joins, a new voice channel is created for them.' })] });
    }
};
