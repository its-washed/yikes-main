const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'serverhelp', description: 'Server management help', usage: ',serverhelp' },
    aliases: ['svhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Server Help', description: '`,setname [name]`\n`,seticon [url]`\n`,setbanner [url]`\n`,setsplash [url]`\n`,setdescription [text]`\n`,vanity [code]`\n`,widget [on/off]`\n`,setboostmsg [#channel]`\n`,setruleschannel [#channel]`\n`,setupdateschannel [#channel]`' })] });
    }
};
