const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'category',
        description: 'Create a category',
        usage: ',category [name]'
    },
    aliases: ['createcategory'],
    cooldown: 10,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Channels` permission.')] });
        }

        const name = args.join(' ');
        if (!name) {
            return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,category [name]')] });
        }

        try {
            const category = await message.guild.channels.create({
                name: name,
                type: ChannelType.GuildCategory
            });

            return message.reply({ embeds: [successEmbed('Category Created', `Created category **${category.name}**.`)] });
        } catch (error) {
            return message.reply({ embeds: [errorEmbed('Error', `Failed: ${error.message}`)] });
        }
    }
};
