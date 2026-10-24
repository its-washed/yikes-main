const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'welcome',
        description: 'Configure welcome messages',
        usage: ',welcome [#channel] [message]'
    },
    aliases: ['setwelcome'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [permissionDenied(message, 'administrator')] });
        }

        const channel = message.mentions.channels.first();
        const msg = args.slice(channel ? 1 : 0).join(' ');

        if (!channel && !msg) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,welcome [#channel] [message]\n\nVariables: {user}, {server}, {memberCount}')] });
        }

        const updates = {};
        if (channel) updates.welcomeChannel = channel.id;
        if (msg) updates.welcomeMessage = msg;

        updateGuildConfig(message.guild.id, updates);

        const response = [];
        if (channel) response.push(`Channel set to ${channel}`);
        if (msg) response.push(`Message set to: "${msg}"`);

        return message.reply({
            embeds: [successEmbed('Welcome Configured', response.join('\n'))]
        });
    }
};
