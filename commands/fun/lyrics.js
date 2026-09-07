const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'lyrics', description: 'Search for song lyrics', usage: ',lyrics <song name>' },
    cooldown: 5,
    async execute(message, args) {
        const query = args.join(' ');
        if (!query) return message.reply({ embeds: [errorEmbed('Usage', ',lyrics <song name>')] });

        try {
            const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(query.split(' - ')[0] || query)}/${encodeURIComponent(query.split(' - ')[1] || query)}`);
            if (!res.ok) {
                const fallback = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`);
                const data = await fallback.json();
                if (data.lyrics) {
                    return message.reply({
                        embeds: [createEmbed({
                            color: 0x6c5ce7,
                            title: data.title || query,
                            description: data.lyrics.slice(0, 4000)
                        })]
                    });
                }
                return message.reply({ embeds: [errorEmbed('Not Found', 'No lyrics found.')] });
            }
            const data = await res.json();
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: query,
                    description: data.lyrics?.slice(0, 4000) || 'No lyrics found.'
                })]
            });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch lyrics.')] });
        }
    }
};
