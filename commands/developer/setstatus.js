const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { ActivityType } = require('discord.js');

module.exports = {
    data: { name: 'setstatus', description: 'Set bot status (Developer only)', usage: ',setstatus <online|idle|dnd|invisible>' },
    aliases: ['status'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const status = args[0]?.toLowerCase();
        if (!status || !['online', 'idle', 'dnd', 'invisible'].includes(status)) {
            return message.reply({ embeds: [errorEmbed('Usage', ',setstatus <online|idle|dnd|invisible>')] });
        }

        client.user.setPresence({ status });
        return message.reply({ embeds: [successEmbed('Status', `Set status to **${status}**.`)] });
    }
};
