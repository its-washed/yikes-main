const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'leaveguild', description: 'Force leave a server (Developer only)', usage: ',leaveguild [guildId]' },
    aliases: ['lg'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const guildId = args[0];
        if (!guildId) return message.reply({ embeds: [errorEmbed('Missing ID', 'Usage: ,leaveguild <guildId>')] });

        const guild = client.guilds.cache.get(guildId);
        if (!guild) return message.reply({ embeds: [errorEmbed('Not Found', 'Bot is not in that server.')] });

        if (guild.id === message.guild.id) {
            return message.reply({ embeds: [errorEmbed('Cannot Leave', 'Use this command from a different server.')] });
        }

        const name = guild.name;
        const memberCount = guild.memberCount;
        await guild.leave();
        return message.reply({ embeds: [successEmbed('Left', `Left **${name}** (${memberCount} members).`)] });
    }
};
