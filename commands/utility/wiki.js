const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'wiki', description: 'Search Wikipedia', usage: ',wiki <query>' },
    aliases: ['wikipedia'],
    cooldown: 5,
    async execute(message, args) {
        const q = args.join(' ');
        if (!q) return message.reply({ embeds: [errorEmbed('Usage', ',wiki <query>')] });

        try {
            const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
            const data = await res.json();
            if (data.type === 'standard') {
                return message.reply({
                    embeds: [createEmbed({
                        color: 0x6c5ce7,
                        title: data.title,
                        url: data.content_urls?.desktop?.page,
                        description: data.extract?.slice(0, 2000) || 'No summary.',
                        thumbnail: data.thumbnail ? { url: data.thumbnail.source } : undefined
                    })]
                });
            }
            return message.reply({ embeds: [errorEmbed('Not Found', 'No Wikipedia article found.')] });
        } catch {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not search Wikipedia.')] });
        }
    }
};
