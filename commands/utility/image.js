const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { first } = require('../../utils/database');
const { rapidKey } = require('../../utils/social');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: { name: 'image', description: 'Search for an image on Google', usage: ',image BMW M4', params: ['query'] },
    aliases: ['img'],
    cooldown: 5,

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) return warn(message, 'You must provide a search query\n> Usage: `,image BMW M4`');
        const row = first('SELECT safemode FROM safemode WHERE guild_id = ?', message.guild.id);
        const safemode = row && row.safemode === false ? 'off' : 'on';

        const payload = {
            text: query,
            safesearch: safemode,
            region: 'en-en',
            color: '',
            size: '',
            type_image: '',
            layout: '',
            max_results: 100
        };

        let data = null;
        try {
            const res = await fetch('https://google-api31.p.rapidapi.com/imagesearch', {
                method: 'POST',
                headers: {
                    'X-RapidAPI-Key': rapidKey(),
                    'X-RapidAPI-Host': 'google-api31.p.rapidapi.com',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) data = await res.json();
        } catch (err) {
            if (err && (err.name === 'TimeoutError' || err.name === 'AbortError' || err.name === 'TypeError')) {
                return warn(message, 'The request timed out. Please try again later.');
            }
            return warn(message, `An error occurred while searching for **${query}**`);
        }
        if (!data) return warn(message, `An error occurred while searching for **${query}**`);

        const results = Array.isArray(data.result) ? data.result : [];
        const embeds = results.map((result, index) => ({
            color: COLORS.NEUTRAL,
            title: result.title || query,
            url: result.url || undefined,
            image: { url: result.image },
            author: { name: message.author.username, icon_url: message.author.avatarURL() || undefined },
            footer: {
                text: `Page: ${index + 1}/${results.length} (${results.length} entries) - Safe Mode: ${safemode.charAt(0).toUpperCase() + safemode.slice(1)}`
            }
        }));
        if (!embeds.length) return warn(message, `No results found for **${query}**`);

        const paginator = new Paginator(embeds, { userId: message.author.id });
        const sent = await message.reply({
            embeds: paginator.buildEmbeds(),
            components: embeds.length > 1 ? [paginator.buildRow()] : []
        });
        if (embeds.length > 1) await paginator.start(message.channel, sent);
        return sent;
    }
};
