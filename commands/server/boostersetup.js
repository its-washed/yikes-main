const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'boostersetup', description: 'Setup booster roles', usage: ',boostersetup [@role]' },
    aliases: ['bssetup'],
    cooldown: 30,
    async execute(message, args) {
        if (!message.member.permissions.has('ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Usage: ,boostersetup [@role]')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Booster Setup', description: `Booster role set to ${role}.\n\nBoosters will receive this role on boost.` })] });
    }
};
