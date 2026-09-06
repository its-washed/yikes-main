const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'shorten',
        description: 'Shorten a URL',
        usage: ',shorten [url]'
    },
    aliases: ['shorturl', 'tinyurl'],
    cooldown: 5,

    async execute(message, args) {
        const url = args[0];
        if (!url) return message.reply({ embeds: [errorEmbed('Missing URL', 'Usage: ,shorten [url]')] });

        if (!url.startsWith('http')) return message.reply({ embeds: [errorEmbed('Invalid URL', 'URL must start with http:// or https://')] });

        const shortUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'URL Shortened',
                fields: [
                    { name: 'Original', value: url.length > 100 ? url.slice(0, 100) + '...' : url, inline: false },
                    { name: 'Shortened', value: `[\`Click here\`](${shortUrl})`, inline: false }
                ]
            })]
        });
    }
};
