const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run } = require('../../utils/database');
const { Paginator } = require('../../utils/pagination');

async function fetchFreeGames() {
    try {
        const res = await fetch('https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US');
        const data = await res.json();
        const elements = (((data || {}).data || {}).Catalog || {}).searchStore || { elements: [] };
        const games = [];
        for (const game of elements.elements || []) {
            const fmtPrice = (game.price && game.price.totalPrice && game.price.totalPrice.fmtPrice) || {};
            const offer = (game.promotions && game.promotions.promotionalOffers
                && game.promotions.promotionalOffers[0]
                && game.promotions.promotionalOffers[0].promotionalOffers[0]) || null;
            const gameSlug = (game.offerMappings && game.offerMappings[0] && game.offerMappings[0].pageSlug)
                || game.productSlug || game.urlSlug || '';
            const gameImgUrl = (game.keyImages && game.keyImages[0] && game.keyImages[0].url)
                || (game.catalogNs && game.catalogNs.mappings && game.catalogNs.mappings[0] && game.catalogNs.mappings[0].pageSize)
                || (gameSlug ? `https://cdn1.epicgames.com/offer/${gameSlug}/storeOfferCardLarge.jpg` : null);
            const entry = {
                title: game.title,
                description: game.description || 'No description available.',
                originalPrice: fmtPrice.originalPrice || '$0.00',
                discountPrice: fmtPrice.discountPrice || '0',
                gameSlug,
                gameImgUrl
            };
            if (entry.discountPrice !== '0' && entry.discountPrice !== '$0.00' && !offer) continue;
            games.push(entry);
        }
        return games;
    } catch (err) {
        return [];
    }
}

module.exports = {
    data: { name: 'freegames', description: '', usage: ',freegames [add|remove|list]' },
    aliases: ['fg'],
    cooldown: 10,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',freegames add #freegames',
        remove: ',freegames remove',
        list: ',freegames list'
    },

    async execute(message) {
        const games = await fetchFreeGames();
        if (!games.length) return warn(message, 'Could not fetch any free games right now');
        const embeds = games.map((game) => ({
            color: COLORS.NEUTRAL,
            title: game.title,
            description: game.description,
            fields: [
                { name: 'Original Price', value: game.originalPrice || 'Free', inline: true },
                { name: 'Discount Price', value: '$0.00', inline: true },
                {
                    name: 'Epicgames Launcher',
                    value: game.gameSlug
                        ? `[Get Game](https://evelina.bot/epicgames/${game.gameSlug})`
                        : '[Get Game](https://store.epicgames.com/free-games)',
                    inline: true
                }
            ],
            image: game.gameImgUrl ? { url: game.gameImgUrl } : undefined
        }));
        if (embeds.length > 1) {
            const paginator = new Paginator(embeds, { userId: message.author.id });
            const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
            await paginator.start(message.channel, sent);
            return sent;
        }
        return message.reply({ embeds });
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'freegames add', description: 'Add a channel to freegames', usage: ',freegames add #freegames' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,freegames add #freegames`');
                const check = first('SELECT channel_id FROM freegames WHERE guild_id = ?', message.guild.id);
                if (check) {
                    const existing = message.guild.channels.cache.get(check.channel_id);
                    return warn(message, `Channel ${existing ? `${existing}` : check.channel_id} already exist for freegames`);
                }
                run('INSERT INTO freegames (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `Added ${channel} as freegames channel`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'freegames remove', description: 'Remove a channel from freegames', usage: ',freegames remove' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = first('SELECT channel_id FROM freegames WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, 'There are no freegames channels set');
                run('DELETE FROM freegames WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Removed freegames channel');
            }
        },
        list: {
            aliases: [],
            data: { name: 'freegames list', description: 'List all freegames channels', usage: ',freegames list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = first('SELECT channel_id FROM freegames WHERE guild_id = ?', message.guild.id);
                if (!check) return warn(message, 'There are no freegames channels set');
                const channel = message.guild.channels.cache.get(check.channel_id);
                return message.reply({ content: `Your freegames channel is ${channel ? `${channel}` : `<#${check.channel_id}>`}` });
            }
        }
    }
};
