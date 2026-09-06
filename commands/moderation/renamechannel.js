const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'renamechannel', description: 'Rename a channel', usage: ',renamechannel [#channel] [name]' },
    aliases: ['rch'],
    cooldown: 10,
    async execute(message, args) {
        if (!hasPermission(message.member, 'ManageChannels')) return message.reply({ embeds: [errorEmbed('No Permission', 'You need Manage Channels.')] });
        const channel = message.mentions.channels.first() || message.channel;
        const name = args.filter(a => !a.startsWith('<#')).join('-').toLowerCase().replace(/\s+/g, '-');
        if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,renamechannel [#channel] [name]')] });
        const oldName = channel.name;
        await channel.setName(name);
        return message.reply({ embeds: [successEmbed('Renamed', `Renamed **#${oldName}** to **#${name}**.`)] });
    }
};
