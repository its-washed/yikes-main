const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { ActivityType } = require('discord.js');

module.exports = {
    data: { name: 'setactivity', description: 'Set bot activity (Developer only)', usage: ',setactivity <type> <text>\nTypes: playing, watching, listening, competing, streaming' },
    aliases: ['activity'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const type = args[0]?.toLowerCase();
        const text = args.slice(1).join(' ');
        if (!type || !text) {
            return message.reply({ embeds: [errorEmbed('Usage', ',setactivity <playing|watching|listening|competing|streaming> <text>')] });
        }

        const types = {
            playing: ActivityType.Playing,
            watching: ActivityType.Watching,
            listening: ActivityType.Listening,
            competing: ActivityType.Competing,
            streaming: ActivityType.Streaming
        };

        if (!types[type]) return message.reply({ embeds: [errorEmbed('Invalid Type', 'Valid: playing, watching, listening, competing, streaming')] });

        client.user.setActivity(text, { type: types[type] });
        return message.reply({ embeds: [successEmbed('Activity', `Set activity to **${type}** ${text}`)] });
    }
};
