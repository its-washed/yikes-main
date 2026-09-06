const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'widget', description: 'Toggle server widget', usage: ',widget [on/off]' },
    aliases: ['togglewidget'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        const state = (args[0] || 'on').toLowerCase();
        try {
            await message.guild.setWidgetEnabled(state === 'on');
            return message.reply({ embeds: [successEmbed('Widget', `Server widget **${state === 'on' ? 'enabled' : 'disabled'}**.`)] });
        } catch { return message.reply({ embeds: [errorEmbed('Error', 'Could not toggle widget.')] }); }
    }
};
