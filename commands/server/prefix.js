const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig, getGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: {
        name: 'prefix',
        description: 'Change the bot command prefix',
        usage: ',prefix [newPrefix]'
    },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        if (!args[0]) {
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Current Prefix',
                    description: `The current prefix is: \`${config.prefix}\``
                })]
            });
        }

        const newPrefix = args[0];
        if (newPrefix.length > 5) {
            return message.reply({ embeds: [errorEmbed('Invalid Prefix', 'Prefix cannot be longer than 5 characters.')] });
        }

        updateGuildConfig(message.guild.id, { prefix: newPrefix });

        return message.reply({
            embeds: [successEmbed('Prefix Changed', `Command prefix changed to \`${newPrefix}\``)]
        });
    }
};
