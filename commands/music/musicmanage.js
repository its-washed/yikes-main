const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'musicmanage', description: 'Music management help', usage: ',musicmanage' },
    aliases: ['mmhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Music Help', description: '`,play [song]`\n`,queue`\n`,skip`\n`,stop`\n`,nowplaying`\n`,shuffle`\n`,volume [1-100]`\n`,loop`\n`,remove [position]`\n`,bass`' })] });
    }
};
