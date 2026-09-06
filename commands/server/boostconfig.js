const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'boostconfig', description: 'Configure booster settings', usage: ',boostconfig [setting] [value]' },
    aliases: ['bconfig'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageGuild')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Server.')] });
        return message.reply({ embeds: [createEmbed({ color: 0xec4899, title: 'Boost Config', description: 'Settings:\n- role [@role]\n- channel [#channel]\n- log [on/off]\n- rewards [on/off]' })] });
    }
};
