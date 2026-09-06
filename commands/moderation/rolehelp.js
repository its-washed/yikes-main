const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'rolehelp', description: 'Role management help', usage: ',rolehelp' },
    aliases: ['rhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Role Help', description: '`,role [@user] [@role]`\n`,roleall [@role]`\n`,massrole [@role] [@user1] [@user2]`\n`,createrole [name]`\n`,deleterole [@role]`\n`,rolecolor [@role] [hex]`\n`,rolehoist [@role] [on/off]`\n`,rolementionable [@role] [on/off]`\n`,roleinfo [@role]`\n`,rolemembers [@role]`' })] });
    }
};
