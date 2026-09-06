const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'channelhelp', description: 'Channel management help', usage: ',channelhelp' },
    aliases: ['chelp2'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Channel Help', description: '`,creatchannel [name]`\n`,deletechannel [#channel]`\n`,renamechannel [#channel] [name]`\n`,clone [#channel]`\n`,category [name]`\n`,hide [#channel]`\n`,unhide [#channel]`\n`,slowmode [#channel] [seconds]`\n`,slowmodeall [seconds]`\n`,archivechannel [#channel]`' })] });
    }
};
