const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper, loadDevData, saveDevData } = require('../../utils/developer');

module.exports = {
    data: { name: 'serverblacklist', description: 'Blacklist the bot from a server (forces leave)', usage: ',serverblacklist [add/remove] [guild ID]' },
    aliases: ['sbl'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const action = args[0];
        const guildId = args[1];

        if (!action || !guildId) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,serverblacklist [add/remove] [guild ID]')] });

        const data = loadDevData();

        if (action === 'add') {
            if (data.blacklistedServers.includes(guildId)) return message.reply({ embeds: [errorEmbed('Already Blacklisted', 'That server is already blacklisted.')] });

            data.blacklistedServers.push(guildId);
            saveDevData(data);

            const guild = client.guilds.cache.get(guildId);
            if (guild) {
                await guild.leave();
                return message.reply({ embeds: [successEmbed(`Blacklisted and left **${guild.name}**.`)] });
            } else {
                return message.reply({ embeds: [successEmbed(`Server \`${guildId}\` blacklisted. Bot was not in that server.`)] });
            }
        } else if (action === 'remove') {
            if (!data.blacklistedServers.includes(guildId)) return message.reply({ embeds: [errorEmbed('Not Blacklisted', 'That server is not blacklisted.')] });
            data.blacklistedServers = data.blacklistedServers.filter(id => id !== guildId);
            saveDevData(data);
            return message.reply({ embeds: [successEmbed(`Unblacklisted server \`${guildId}\`.`)] });
        } else {
            return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `add` or `remove`.')] });
        }
    }
};
