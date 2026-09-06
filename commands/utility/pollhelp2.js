const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'pollhelp', description: 'Poll help', usage: ',pollhelp' },
    aliases: ['polhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Poll Help', description: 'Yes/No poll:\n`,poll Do you like pizza?`\n\nMultiple choice:\n`,poll Best language? | JavaScript | Python | Rust | Go`\n\nTimed poll:\n`,poll2 10m Question? | Yes | No`' })] });
    }
};
