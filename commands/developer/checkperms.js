const { PermissionFlagsBits } = require('discord.js');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    permission: "bot developer",
    data: { name: 'checkperms', description: '', usage: ',checkperms' },
    cooldown: 0,

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        let adminCount = 0;
        let nonAdminCount = 0;
        for (const guild of client.guilds.cache.values()) {
            const botMember = guild.members.me;
            if (botMember && botMember.permissions.has(PermissionFlagsBits.Administrator)) adminCount++;
            else nonAdminCount++;
        }
        return message.reply(`**Admin:** \`${adminCount}\` - **Non-Admin:** \`${nonAdminCount}\``);
    }
};
