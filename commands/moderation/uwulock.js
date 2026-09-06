const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'uwulock', description: 'Lock user to uwu messages', usage: ',uwulock [@user] [on/off]' },
    aliases: ['ulock'],
    cooldown: 5,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageMessages')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Messages.')] });
        const target = message.mentions.members.first();
        if (!target) return message.reply({ embeds: [errorEmbed('Missing User', 'Usage: ,uwulock [@user] [on/off]')] });
        const state = (args[1] || 'on').toLowerCase();
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'UwULock', description: `${target.user.tag} is now ${state === 'off' ? 'un' : ''}locked to uwu messages.` })] });
    }
};
