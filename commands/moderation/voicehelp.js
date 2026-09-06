const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'voicehelp', description: 'Voice moderation help', usage: ',voicehelp' },
    aliases: ['vhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Voice Help', description: '`,deafen [@user]`\n`,undeafen [@user]`\n`,voicekick [@user]`\n`,move [@user] [#channel]`\n`,muteall`\n`,unmuteall`\n`,deafenall`\n`,undeafenall`' })] });
    }
};
