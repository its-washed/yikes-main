const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'fakepermshelp', description: 'Fake permissions help', usage: ',fakepermshelp' },
    aliases: ['fphelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Fake Permissions Help', description: 'Strip dangerous permissions from roles.\n\nUsage:\n`,fakeperms [@role] [permission]`\n\nExample:\n`,fakeperms @Members Administrator`\n\nThis removes the permission via API while keeping the role visible.' })] });
    }
};
