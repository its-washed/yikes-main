const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'mathhelp', description: 'Math command help', usage: ',mathhelp' },
    aliases: ['mthelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Math Help', description: '`,calc [expression]`\n`,factorial [number]`\n`,fibonacci [count]`\n`,percentage [value] [total]`\n`,hex [number]`\n`,decimal [hex]`\n`,binary [encode/decode] [text]`\n`,base64 [encode/decode] [text]`\n`,hash [md5/sha1/sha256] [text]`' })] });
    }
};
