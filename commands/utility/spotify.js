const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'spotify', description: 'Show Spotify presence', usage: ',spotify [@user]' },
    aliases: ['sp', 'musicpresence'],
    cooldown: 5,
    async execute(message) {
        const user = message.mentions.users.first() || message.author;
        const member = message.guild.members.cache.get(user.id);
        const activity = member?.presence?.activities?.find(a => a.name === 'Spotify');
        if (!activity) return message.reply({ embeds: [errorEmbed('Not Found', `${user.tag} is not listening to Spotify.`)] });
        return message.reply({
            embeds: [createEmbed({
                color: 0x1db954, title: `${user.tag} is listening to...`,
                fields: [
                    { name: 'Song', value: activity.details || 'Unknown', inline: true },
                    { name: 'Artist', value: activity.state || 'Unknown', inline: true },
                    { name: 'Album', value: activity.assets?.largeText || 'Unknown', inline: true }
                ],
                thumbnail: activity.assets?.largeImage ? { url: `https://i.scdn.co/image/${activity.assets.largeImage.replace('spotify:', '')}` } : undefined
            })]
        });
    }
};
