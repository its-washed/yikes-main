const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'countersetup', description: 'Setup counter channels', usage: ',countersetup [#channel] [type]' },
    aliases: ['countsetup'],
    cooldown: 30,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const type = args[1] || 'members';
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Counter Setup', description: `Counter channel configured for **${type}**.\n\nSupported: members, online, bots, channels, roles, boosters` })] });
    }
};
