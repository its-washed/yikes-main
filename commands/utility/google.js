const { warn } = require('../../utils/context');
const { first } = require('../../utils/database');
const { COLORS, ICONS } = require('../../utils/styles');
const { rapidKey } = require('../../utils/social');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'google',
        description: "Search Google for a query",
        usage: ',google Evelina Bot', params: ['query']
    },
    aliases: ["search"],
    cooldown: 5,

    async execute(message, args) {
        const query = args.join(' ').trim();
        if (!query) return warn(message, 'You must provide a search query\n> Usage: `,google Evelina Bot`');

        const row = first('SELECT safemode FROM safemode WHERE guild_id = ?', message.guild.id);
        const safemode = row && row.safemode === false ? 'off' : 'on';

        const payload = {
            text: query,
            safesearch: safemode,
            timelimit: '',
            region: 'en-en',
            max_results: 20
        };

        let data = null;
        try {
            const res = await fetch('https://google-api31.p.rapidapi.com/websearch', {
                method: 'POST',
                headers: {
                    'x-rapidapi-key': rapidKey(),
                    'x-rapidapi-host': 'google-api31.p.rapidapi.com',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) return warn(message, `An error occurred while searching for **${query}**`);
            data = await res.json();
        } catch (err) {
            if (err && err.name === 'AbortError') return warn(message, 'The request timed out. Please try again later.');
            return warn(message, `An error occurred: ${err && err.message ? err.message : err}`);
        }
        if (!data) return warn(message, `An error occurred while searching for **${query}**`);

        const results = Array.isArray(data.result) ? data.result : [];
        const embeds = [];
        for (let i = 0; i < results.length; i += 3) {
            const chunk = results.slice(i, i + 3);
            embeds.push({
                color: COLORS.NEUTRAL,
                title: `Search Results - \`${query}\``,
                description: chunk.map(result => `**[${result.title}](${result.href})**\n${result.body}\n`).join('\n'),
                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                footer: {
                    text: `Page: ${Math.floor(i / 3) + 1}/${Math.floor(results.length / 3) + 1} (${results.length} entries) - Safe Mode: ${safemode.charAt(0).toUpperCase() + safemode.slice(1)}`,
                    icon_url: ICONS.GOOGLE
                }
            });
        }
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
