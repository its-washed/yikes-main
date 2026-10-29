const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { Paginator } = require('../../utils/pagination');
const { needPerks } = require('../../utils/predicates');

module.exports = {
    permission: "donator",
    data: {
        name: 'reverse',
        description: "Search Google for similar images using reverse image search",
        usage: ',reverse https://evelina.bot/icon.png', params: ['url']
    },
    aliases: ["reverseimage", "reverseimg"],
    cooldown: 5,

    async execute(message, args, client) {
        if (!await needPerks(message, client)) return;

        let url = args.join(' ').trim();
        if (!url) {
            const attachment = message.attachments.first();
            if (!attachment) return warn(message, 'You must provide an image URL or attach an image\n> Usage: `,reverse https://evelina.bot/icon.png`');
            url = attachment.url;
        }

        try {
            const data = await (await fetch(
                `https://api.evelina.bot/google/reverse?image=${encodeURIComponent(url)}&key=8F6qVxN55aoODT0FRh16pydP`
            )).json().catch(() => null);

            const results = (data && data.results) || [];
            const embeds = results.map((result, index) => ({
                title: `${result.name || 'Untitled'} (${result.rank || '0'}/10 ⭐)`,
                url: result.url || '',
                color: COLORS.NEUTRAL,
                image: { url: result.image || '' },
                footer: { text: `Page: ${index + 1}/${results.length} (${results.length} entries)` }
            }));

            if (!embeds.length) return warn(message, "Couldn't find any results for the image.");

            const paginator = new Paginator(embeds, { userId: message.author.id });
            const sent = await message.reply({
                embeds: paginator.buildEmbeds(),
                components: embeds.length > 1 ? [paginator.buildRow()] : []
            });
            if (embeds.length > 1) await paginator.start(message.channel, sent);
            return sent;
        } catch (err) {
            return warn(message, 'An error occurred while performing the reverse image search');
        }
    }
};
