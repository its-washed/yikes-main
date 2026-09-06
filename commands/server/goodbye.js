const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'goodbye',
        description: 'Configure goodbye messages',
        usage: ',goodbye [#channel] [message]'
    },
    aliases: ['leave'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const channel = message.mentions.channels.first();
        const msg = args.slice(channel ? 1 : 0).join(' ');

        if (!channel && !msg) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,goodbye [#channel] [message]\n\nVariables: {user}, {server}, {memberCount}')] });
        }

        const updates = {};
        if (channel) updates.goodbyeChannel = channel.id;
        if (msg) updates.goodbyeMessage = msg;

        updateGuildConfig(message.guild.id, updates);

        const response = [];
        if (channel) response.push(`Channel set to ${channel}`);
        if (msg) response.push(`Message set to: "${msg}"`);

        return message.reply({
            embeds: [successEmbed('Goodbye Configured', response.join('\n'))]
        });
    }
};
