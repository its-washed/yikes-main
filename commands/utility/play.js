const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');

const queue = new Map();

module.exports = {
    data: {
        name: 'play',
        description: 'Add a song to the queue (uses song name/URL)',
        usage: ',play [song name or URL]'
    },
    aliases: ['p'],
    cooldown: 5,

    async execute(message, args, client) {
        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Song', 'Provide a song name or URL.')] });
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [errorEmbed('Not in Voice', 'Join a voice channel first.')] });
        }

        const permissions = voiceChannel.permissionsFor(message.guild.members.me);
        if (!permissions?.has('Connect') || !permissions?.has('Speak')) {
            return message.reply({ embeds: [errorEmbed('Permissions', 'I need `Connect` and `Speak` in your voice channel.')] });
        }

        const query = args.join(' ');
        const guildId = message.guild.id;

        if (!queue.has(guildId)) {
            queue.set(guildId, {
                songs: [],
                playing: false,
                voiceChannel: voiceChannel.id,
                textChannel: message.channel.id,
                connection: null
            });
        }

        const serverQueue = queue.get(guildId);
        serverQueue.songs.push({
            title: query,
            url: query.startsWith('http') ? query : null,
            requestedBy: message.author.tag,
            duration: '??:??'
        });

        const position = serverQueue.songs.length;

        if (!serverQueue.playing) {
            serverQueue.playing = true;

            return message.reply({
                embeds: [createEmbed({
                    color: 0x00d26a,
                    title: 'Now Playing',
                    description: `**${query}**`,
                    fields: [
                        { name: 'Channel', value: `${voiceChannel}`, inline: true },
                        { name: 'Queue Position', value: `${position}`, inline: true }
                    ]
                })]
            });
        }

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Added to Queue',
                description: `**${query}**`,
                fields: [
                    { name: 'Position', value: `#${position}`, inline: true },
                    { name: 'Queue Size', value: `${serverQueue.songs.length}`, inline: true }
                ]
            })]
        });
    }
};
