const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { warn } = require('../../utils/context');
const { Paginator } = require('../../utils/pagination');
const { sendCard } = require('../../utils/helpCard');
const { run, first, query } = require('../../utils/database');
const { confirm, needPerm } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

const CASH_PRICES = {
    standard: { 1: 350000, 2: 750000, 3: 1250000, 4: 3500000, 5: 50000000 },
    blackice: { 1: 1750000, 2: 3750000, 3: 6250000, 4: 17500000, 5: 250000000 }
};

function uniqueCardId() {
    let id;
    do {
        id = 100000 + Math.floor(Math.random() * 900000);
    } while (first('SELECT 1 AS ok FROM economy_cards_user WHERE card_id = ?', id));
    return id;
}

function starsLabel(stars) {
    return '\u2b50'.repeat(stars);
}

function openCaseLogic(userId, caseType, cardType) {
    let stars;
    let storage;
    let multiplier;
    if (caseType === 'standard') {
        const roll = Math.random() * 100;
        if (roll <= 0.25) stars = 5;
        else if (roll <= 1.00) stars = 4;
        else if (roll <= 5.25) stars = 3;
        else if (roll <= 20.25) stars = 2;
        else stars = 1;
    } else {
        const roll = Math.random() * 100;
        if (roll <= 1.00) stars = 5;
        else if (roll <= 3.00) stars = 4;
        else if (roll <= 10.00) stars = 3;
        else if (roll <= 100.00) stars = 2;
        else stars = 1;
    }

    const ranges = {
        5: { security: [85, 90], standard: [24, 27], blackice: [48, 54], mult: [2.5, 3.0] },
        4: { security: [75, 84], standard: [18, 22], blackice: [36, 44], mult: [2.0, 2.4] },
        3: { security: [65, 74], standard: [12, 16], blackice: [24, 32], mult: [1.6, 1.9] },
        2: { security: [55, 64], standard: [9, 11], blackice: [18, 22], mult: [1.3, 1.5] },
        1: { security: [50, 54], standard: [6, 8], blackice: [12, 16], mult: [1.1, 1.2] }
    };
    const range = ranges[stars];
    if (cardType === 'security') {
        storage = range.security[0] + Math.floor(Math.random() * (range.security[1] - range.security[0] + 1));
    } else {
        const use = caseType === 'blackice' ? range.blackice : range.standard;
        storage = use[0] + Math.floor(Math.random() * (use[1] - use[0] + 1));
    }
    multiplier = Math.round((range.mult[0] + Math.random() * (range.mult[1] - range.mult[0])) * 10) / 10;

    const business = cardType === 'manager' ? 'business' : cardType === 'scientist' ? 'lab' : 'personal';
    const itemData = first('SELECT * FROM economy_cards WHERE stars = ? AND business = ? ORDER BY RANDOM() LIMIT 1', stars, business);
    if (!itemData) {
        return { error: true, message: `Failed to find a ${business} card with ${stars} stars.` };
    }

    const cardId = uniqueCardId();
    const storageFormatted = cardType === 'security' ? `${storage}%` : `${storage}h`;
    run('INSERT INTO economy_cards_user (id, user_id, card_id, business, storage, multiplier, image, background, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
        itemData.id, userId, cardId, business, storage, multiplier, itemData.image, caseType);

    const embed = createEmbed({
        color: COLORS.NEUTRAL,
        title: `${itemData.name} | ${starsLabel(stars)}`,
        image: itemData.image || undefined,
        fields: [
            { name: 'Card ID', value: String(cardId), inline: true },
            { name: 'Storage', value: storageFormatted, inline: true },
            { name: 'Multiplier', value: `${multiplier}x`, inline: true }
        ]
    });
    return { error: false, embed, stars, cardId, business };
}

async function sendPages(message, pages, title) {
    if (!pages.length) return warn(message, 'No entries found.');
    const paginator = new Paginator(pages.map(page => page[PRESERVE_KEY] ? page : ({ ...page })), { userId: message.author.id });
    return paginator.start(message.channel);
}

const PRESERVE_KEY = require('../../utils/embeds').PRESERVE;

module.exports = {
    data: { name: 'card', description: 'View your economy cards', usage: ',card <subcommand>' },
    aliases: ['cards'],
    cooldown: 5,
    subcommands: ['sell', 'trade', 'upgrade', 'shred', 'use', 'unuse', 'used', 'list', 'case', 'generate'],
    subUsages: {
        sell: ',card sell <card id> <user> <amount>',
        trade: ',card trade <card id> <target card id> <user>',
        upgrade: ',card upgrade <stars> <manager|scientist|security>',
        shred: ',card shred <stars|id> <id> <amount>',
        use: ',card use <card id>',
        unuse: ',card unuse <card id>',
        used: ',card used [user]',
        list: ',card list [user]',
        case: ',card case <buy|open>',
        generate: ',card generate <user> <card id> <type>'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        sell: {
            data: { name: 'card sell', description: "Sell a card from your account", usage: ',card sell <card id> <user> <amount>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const cardId = parseInt(args[0], 10);
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                const amount = parseInt(String(args[2] || '').replace(/,/g, ''), 10);
                if (!Number.isFinite(cardId) || !member || !Number.isFinite(amount) || amount <= 0) {
                    return warn(message, 'Invalid arguments.\n> **Usage:** `,card sell <card id> <user> <amount>`');
                }
                const cardData = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ? AND active = 1', userId, cardId);
                if (!cardData) return warn(message, "You don't have this card.");
                const cardInfo = first('SELECT * FROM economy_cards WHERE id = ?', cardData.id);
                if (!cardInfo) return warn(message, 'This card does not exist.');
                const limits = { 1: 5000000, 2: 10000000, 3: 25000000, 4: 50000000, 5: 100000000 };
                const limit = limits[cardInfo.stars] || 5000000;
                if (amount > limit) return warn(message, `You can't sell this card for more than **${E.humanize(limit)}** \ud83d\udcb5.`);
                const memberData = E.econRow(member.id);
                if (!memberData || memberData.cash < amount) return warn(message, `${member} does not have enough money to buy this card.`);
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to sell this card to ${member} for **${E.humanize(amount)}** \ud83d\udcb5?`,
                    async (i) => {
                        const sellerCard = first('SELECT 1 AS ok FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, cardId);
                        if (!sellerCard) {
                            return i.update({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: You don't have this card.` }], components: [] });
                        }
                        const buyer = E.econRow(member.id);
                        if (!buyer || buyer.cash < amount) {
                            return i.update({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${member}: They don't have enough money.` }], components: [] });
                        }
                        run('UPDATE economy_cards_user SET user_id = ? WHERE user_id = ? AND card_id = ?', member.id, userId, cardId);
                        run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', amount * 0.75, userId);
                        run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', amount, member.id);
                        E.logging(userId, amount * 0.75, 'sell', 'cards');
                        E.logging(member.id, amount, 'buy', 'cards');
                        await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Successfully sold the card to ${member} for **${E.humanize(amount)}** \ud83d\udcb5 (\`${E.humanize(amount * 0.75)}\`).` }], components: [] });
                    },
                    async (i) => {
                        await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Sale got canceled` }], components: [] });
                    });
            }
        },
        trade: {
            data: { name: 'card trade', description: 'Trade a card with another user', usage: ',card trade <card id> <target card id> <user>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const cardId = parseInt(args[0], 10);
                const targetCardId = parseInt(args[1], 10);
                const member = message.mentions && message.mentions.members ? message.mentions.members.first() : null;
                if (!Number.isFinite(cardId) || !Number.isFinite(targetCardId) || !member) {
                    return warn(message, 'Invalid arguments.\n> **Usage:** `,card trade <card id> <target card id> <user>`');
                }
                const cardData = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ? AND active = 1', userId, cardId);
                if (!cardData) return warn(message, "You don't have this card.");
                const targetCardData = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ? AND active = 1', member.id, targetCardId);
                if (!targetCardData) return warn(message, `${member} doesn't have this card.`);
                const cardInfo = first('SELECT * FROM economy_cards WHERE id = ?', cardData.id);
                const targetCardInfo = first('SELECT * FROM economy_cards WHERE id = ?', targetCardData.id);
                if (!cardInfo || !targetCardInfo) return warn(message, 'This card does not exist.');

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('trade_yes').setLabel('Approve').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('trade_no').setLabel('Deny').setStyle(ButtonStyle.Danger)
                );
                const sent = await message.reply({
                    embeds: [createEmbed({
                        color: COLORS.NEUTRAL,
                        description: `${EMOJIS.QUESTION} ${member}: Are you sure you want to trade these cards with ${message.author}?\n> ${message.author}: ${cardInfo.name} (\`${cardInfo.stars}\`)\n> ${member}: ${targetCardInfo.name} (\`${targetCardInfo.stars}\`)`
                    })],
                    components: [row]
                });
                const collector = sent.createMessageComponentCollector({ filter: i => i.user.id === member.id, time: 60000 });
                collector.on('collect', async i => {
                    collector.stop();
                    if (i.customId === 'trade_no') {
                        return i.update({ embeds: [createEmbed({ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Trade got canceled` })], components: [] });
                    }
                    const mine = first('SELECT 1 AS ok FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, cardId);
                    const theirs = first('SELECT 1 AS ok FROM economy_cards_user WHERE user_id = ? AND card_id = ?', member.id, targetCardId);
                    if (!mine || !theirs) {
                        return i.update({ embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} One of the cards is no longer available.` })], components: [] });
                    }
                    run('UPDATE economy_cards_user SET user_id = ? WHERE card_id = ?', member.id, cardId);
                    run('UPDATE economy_cards_user SET user_id = ? WHERE card_id = ?', userId, targetCardId);
                    return i.update({ embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Successfully traded the card with ${message.author}` })], components: [] });
                });
                collector.on('end', () => sent.edit({ components: [] }).catch(() => {}));
            }
        },
        upgrade: {
            data: { name: 'card upgrade', description: 'Upgrade your cards', usage: ',card upgrade <stars> <manager|scientist|security>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const stars = parseInt(args[0], 10);
                const type = String(args[1] || '').toLowerCase();
                if (![2, 3, 4].includes(stars)) return warn(message, 'Invalid stars, please choose between `2`, `3` & `4`.');
                if (!['manager', 'scientist', 'security'].includes(type)) return warn(message, 'Invalid type, please choose between `manager`, `scientist` & `security`.');

                const presets = {
                    2: { storage: [9, 11], multiplier: [1.3, 1.5], protection: [55, 64] },
                    3: { storage: [12, 16], multiplier: [1.6, 1.9], protection: [65, 74] },
                    4: { storage: [18, 22], multiplier: [2.0, 2.4], protection: [75, 84] }
                };
                const preset = presets[stars];
                const userId = message.author.id;
                const business = type === 'manager' ? 'business' : type === 'scientist' ? 'lab' : 'personal';

                const cards = query('SELECT * FROM economy_cards_user WHERE user_id = ? AND active = 1 AND business = ? AND background = ?', userId, business, 'standard');
                if (!cards.length) return warn(message, "You don't have any cards.");

                const toUpgrade = cards.filter(card => {
                    const info = first('SELECT * FROM economy_cards WHERE id = ? AND business = ?', card.id, business);
                    return info && info.stars === stars - 1;
                });
                if (toUpgrade.length < 10) return warn(message, `You don't have enough cards to upgrade to ${starsLabel(stars)}.`);

                for (const card of toUpgrade.slice(0, 10)) {
                    run('UPDATE economy_cards_user SET active = 0 WHERE card_id = ?', card.card_id);
                }
                const cardInfo = first('SELECT * FROM economy_cards WHERE stars = ? AND business = ? ORDER BY RANDOM() LIMIT 1', stars, business);
                if (!cardInfo) return warn(message, `No cards found for ${starsLabel(stars)} star level.`);

                const cardId = uniqueCardId();
                const storage = preset.storage[0] + Math.floor(Math.random() * (preset.storage[1] - preset.storage[0] + 1));
                const multiplier = Math.round((preset.multiplier[0] + Math.random() * (preset.multiplier[1] - preset.multiplier[0])) * 10) / 10;
                const protection = preset.protection[0] + Math.floor(Math.random() * (preset.protection[1] - preset.protection[0] + 1));

                run('INSERT INTO economy_cards_user (id, user_id, card_id, business, storage, multiplier, image, background, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
                    cardInfo.id, userId, cardId, business, storage, multiplier, cardInfo.image, 'standard');

                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.NEUTRAL,
                        title: `${cardInfo.name} | ${starsLabel(stars)}`,
                        author: { name: message.author.username },
                        image: cardInfo.image || undefined,
                        fields: business === 'personal'
                            ? [
                                { name: 'Card ID', value: String(cardId), inline: true },
                                { name: 'Protection', value: `${protection}%`, inline: true }
                            ]
                            : [
                                { name: 'Card ID', value: String(cardId), inline: true },
                                { name: 'Storage', value: `${storage}h`, inline: true },
                                { name: 'Multiplier', value: `${multiplier}x`, inline: true }
                            ]
                    })]
                });
            }
        },
        shred: {
            data: { name: 'card shred', description: "Shred cards to gain money, type is either `stars` or `id`", usage: ',card shred <stars|id> <id> <amount>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const mode = String(args[0] || '').toLowerCase();
                const id = parseInt(args[1], 10);
                const amount = parseInt(args[2], 10);
                if (!['stars', 'id'].includes(mode)) return warn(message, 'Invalid type, please choose between `stars` & `id`.');
                if (!Number.isFinite(amount) || amount < 1) return warn(message, 'You need to shred at least 1 card.');

                if (mode === 'stars') {
                    if (![1, 2, 3, 4, 5].includes(id)) return warn(message, 'Invalid stars, please choose between `1`, `2`, `3`, `4` & `5`.');
                    const userCards = query('SELECT * FROM economy_cards_user WHERE user_id = ? AND active = 1', userId);
                    if (!userCards.length) return warn(message, "You don't have any cards.");
                    const defs = query('SELECT id FROM economy_cards WHERE stars = ?', id);
                    const validIds = new Set(defs.map(c => c.id));
                    const matching = userCards.filter(card => validIds.has(card.id));
                    if (matching.length < amount) return warn(message, `You don't have enough cards with **${id}** stars.`);
                    let earnings = 0;
                    const toDelete = [];
                    for (const card of matching.slice(0, amount)) {
                        earnings += (CASH_PRICES[card.background] || CASH_PRICES.standard)[id] || 0;
                        toDelete.push(card.card_id);
                    }
                    for (const cardId of toDelete) {
                        run('DELETE FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, cardId);
                    }
                    run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', earnings, userId);
                    E.logging(userId, earnings, 'shred', 'cards');
                    return message.reply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Successfully shredded **${amount}** cards with **${id}** stars for **${E.humanize(earnings)}** \ud83d\udcb5.` }] });
                }

                if (!Number.isFinite(id)) return warn(message, 'You need to provide a card ID.');
                const entries = query('SELECT * FROM economy_cards_user WHERE user_id = ? AND active = 1 AND card_id = ?', userId, id);
                if (!entries.length || entries.length < amount) return warn(message, `You don't have enough cards with ID **${id}**.`);
                const info = first('SELECT stars FROM economy_cards WHERE id = ?', entries[0].id);
                if (!info) return warn(message, 'This card does not exist.');
                const background = entries[0].background || 'standard';
                const earnings = (CASH_PRICES[background] || CASH_PRICES.standard)[info.stars] * amount;
                for (const entry of entries.slice(0, amount)) {
                    run('DELETE FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, entry.card_id);
                }
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', earnings, userId);
                E.logging(userId, earnings, 'shred', 'cards');
                return message.reply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Successfully shredded **${amount}** cards with **ID ${id}** for **${E.humanize(earnings)}** \ud83d\udcb5.` }] });
            }
        },
        use: {
            data: { name: 'card use', description: 'Use a card from your account', usage: ',card use <card id>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const cardId = parseInt(args[0], 10);
                if (!Number.isFinite(cardId)) return warn(message, 'You need to provide a card ID.');
                const cardData = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, cardId);
                if (!cardData) return warn(message, "You don't have this card.");
                const cardInfo = first('SELECT * FROM economy_cards WHERE id = ?', cardData.id);
                if (!cardInfo) return warn(message, 'This card does not exist.');
                const kind = cardInfo.business;
                if (!['business', 'lab', 'personal'].includes(kind)) return warn(message, "This card can't be used on anything.");
                if (kind === 'business' && !E.getUserBusiness(userId)) return warn(message, "You don't have a business.");
                if (kind === 'lab' && !first('SELECT 1 AS ok FROM economy_lab WHERE user_id = ?', userId)) return warn(message, "You don't have a lab.");
                const already = first('SELECT 1 AS ok FROM economy_cards_used WHERE user_id = ? AND card_id = ?', userId, cardId);
                if (already) return warn(message, 'You already used this card.');
                const usedKind = first('SELECT business FROM economy_cards_used WHERE user_id = ? AND business = ?', userId, kind);
                if (usedKind) return warn(message, `You already used a ${kind} card.`);
                run('UPDATE economy_cards_user SET active = 0 WHERE user_id = ? AND card_id = ?', userId, cardId);
                run('INSERT INTO economy_cards_used (user_id, card_id, business) VALUES (?, ?, ?)', userId, cardId, kind);
                return message.reply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Successfully used the **${cardInfo.name}** card on your ${kind === 'business' ? 'business' : kind}.` }] });
            }
        },
        unuse: {
            data: { name: 'card unuse', description: 'Unuse a card from your account', usage: ',card unuse <card id>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const cardId = parseInt(args[0], 10);
                if (!Number.isFinite(cardId)) return warn(message, 'You need to provide a card ID.');
                const cardData = first('SELECT * FROM economy_cards_user WHERE user_id = ? AND card_id = ?', userId, cardId);
                if (!cardData) return warn(message, "You don't have this card.");
                const cardInfo = first('SELECT * FROM economy_cards WHERE id = ?', cardData.id);
                if (!cardInfo) return warn(message, 'This card does not exist.');
                const kind = cardInfo.business;
                const used = first('SELECT business FROM economy_cards_used WHERE user_id = ? AND card_id = ?', userId, cardId);
                if (!used) return warn(message, "You didn't use this card.");
                if (used.business !== kind) return warn(message, `You didn't use this card on your ${kind}.`);
                run('UPDATE economy_cards_user SET active = 1 WHERE user_id = ? AND card_id = ?', userId, cardId);
                run('DELETE FROM economy_cards_used WHERE user_id = ? AND card_id = ?', userId, cardId);
                return message.reply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Successfully unused the **${cardInfo.name}** card from your ${kind === 'business' ? 'business' : kind}.` }] });
            }
        },
        used: {
            data: { name: 'card used', description: 'View all your used cards', usage: ',card used [user]' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const target = (message.mentions && message.mentions.users && message.mentions.users.first()) || message.author;
                const usedCards = query('SELECT * FROM economy_cards_used WHERE user_id = ?', target.id);
                if (!usedCards.length) return warn(message, "You don't have any used cards.");
                const pages = [];
                for (const used of usedCards) {
                    const cardUser = first('SELECT * FROM economy_cards_user WHERE card_id = ?', used.card_id);
                    if (!cardUser) continue;
                    const info = first('SELECT * FROM economy_cards WHERE id = ?', cardUser.id);
                    if (!info) continue;
                    pages.push({
                        [PRESERVE_KEY]: true,
                        color: COLORS.NEUTRAL,
                        title: `${info.name} | ${starsLabel(info.stars)}`,
                        author: { name: target.username },
                        image: cardUser.image || undefined,
                        footer: { text: `Page: ${pages.length + 1}/${usedCards.length} (${usedCards.length} entries)` }
                    });
                }
                if (!pages.length) return warn(message, "You don't have any used cards.");
                return sendPages(message, pages);
            }
        },
        list: {
            data: { name: 'card list', description: "View all your active cards with filters and pagination", usage: ',card list [user]', },
            aliases: ['view'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const target = (message.mentions && message.mentions.users && message.mentions.users.first()) || message.author;
                const cards = query('SELECT * FROM economy_cards_user WHERE user_id = ? AND active = 1', target.id);
                if (!cards.length) return warn(message, `${target} has no active cards.`);
                const pages = [];
                for (let i = 0; i < cards.length; i += 6) {
                    const chunk = cards.slice(i, i + 6);
                    const fields = chunk.map(card => {
                        const info = first('SELECT * FROM economy_cards WHERE id = ?', card.id);
                        return {
                            name: `${info ? info.name : 'Unknown'} | ${starsLabel(info ? info.stars : 1)}`,
                            value: `**Card ID:** \`${card.card_id}\`\n**Storage:** ${card.storage}${card.business === 'personal' ? '%' : 'h'}\n**Multiplier:** ${card.multiplier}x\n**Business:** ${card.business}`,
                            inline: true
                        };
                    });
                    pages.push({
                        [PRESERVE_KEY]: true,
                        color: COLORS.NEUTRAL,
                        title: 'Active Cards',
                        author: { name: target.username },
                        fields,
                        footer: { text: `Page: ${pages.length + 1}/${Math.ceil(cards.length / 6)} (${cards.length} entries)` }
                    });
                }
                return sendPages(message, pages);
            }
        },
        case: {
            data: { name: 'card case', description: 'View your economy cases', usage: ',card case <buy|open>' },
            execute: async (message) => {
                return warn(message, 'Use `,card case buy <standard|blackice> <amount>` or `,card case open <case> <type> <amount>`.');
            },
            subs: {
                buy: {
                    data: { name: 'card case buy', description: "Buy a case to get a random item", usage: ',card case buy <standard|blackice> <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const type = String(args[0] || '').toLowerCase();
                        const amount = parseInt(String(args[1] || '').replace(/,/g, ''), 10);
                        if (!['standard', 'blackice'].includes(type)) {
                            return warn(message, 'Invalid type. Please choose between `standard` & `blackice`.');
                        }
                        if (!Number.isFinite(amount) || amount <= 0) {
                            return warn(message, 'You need to provide an amount of cases to buy.\n> **Usage:** `,card case buy <type> <amount>`');
                        }
                        const costPerCase = type === 'standard' ? 1000000 : 5000000;
                        const cost = amount * costPerCase;
                        const row = E.ensureAccount(message.author.id);
                        if (row.cash < cost) {
                            return warn(message, `You don't have enough money to buy **${E.cleanHumanize(amount)}** ${type} cases.\n> You need **${E.humanize(cost)}** \ud83d\udcb5.`);
                        }
                        return confirm(message,
                            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to purchase **${E.cleanHumanize(amount)}** ${type} cases for **${E.humanize(cost)}** \ud83d\udcb5?`,
                            async (i) => {
                                const fresh = E.ensureAccount(i.user.id);
                                if (fresh.cash < cost) {
                                    return i.update({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: You don't have enough money to buy **${E.cleanHumanize(amount)}** ${type} cases.` }], components: [] });
                                }
                                const column = type === 'standard' ? 'item_case' : 'item_case_blackice';
                                run(`UPDATE economy SET cash = ?, ${column} = ${column} + ? WHERE user_id = ?`, fresh.cash - cost, amount, i.user.id);
                                E.logging(i.user.id, cost, 'buy', `${type} cases`);
                                await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: Successfully bought **${E.cleanHumanize(amount)}** ${type} cases for **${E.humanize(cost)}** \ud83d\udcb5` }], components: [] });
                            },
                            async (i) => {
                                await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Purchase got canceled` }], components: [] });
                            });
                    }
                },
                open: {
                    data: { name: 'card case open', description: "Open cases to get random items", usage: ',card case open <case> <type> <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const userId = message.author.id;
                        const caseType = String(args[0] || '').toLowerCase();
                        const cardType = String(args[1] || '').toLowerCase();
                        const amount = parseInt(args[2], 10);
                        if (!['standard', 'blackice'].includes(caseType)) {
                            return warn(message, 'Invalid case type, please choose between `standard` & `blackice`.');
                        }
                        if (!['manager', 'scientist', 'security'].includes(cardType)) {
                            return warn(message, 'Invalid type, please choose between `manager`, `scientist` & `security`.');
                        }
                        if (!Number.isFinite(amount) || amount < 1 || amount > 10) {
                            return warn(message, 'You can only open between 1 and 10 cases at a time.');
                        }
                        const column = caseType === 'standard' ? 'item_case' : 'item_case_blackice';
                        const row = E.ensureAccount(userId);
                        if ((row[column] || 0) < amount) return warn(message, `You don't have enough ${caseType} cases to use`);

                        const results = [];
                        for (let i = 0; i < amount; i++) {
                            const result = openCaseLogic(userId, caseType, cardType);
                            if (result.error) return warn(message, result.message);
                            results.push(result);
                        }
                        run(`UPDATE economy SET ${column} = ${column} - ? WHERE user_id = ?`, amount, userId);

                        const summary = createEmbed({
                            color: COLORS.NEUTRAL,
                            title: 'Summary',
                            author: { name: message.author.username },
                            fields: results.map(result => {
                                const cardUser = first('SELECT * FROM economy_cards_user WHERE card_id = ?', result.cardId);
                                const info = first('SELECT * FROM economy_cards WHERE id = ?', cardUser ? cardUser.id : 0);
                                return {
                                    name: `${info ? info.name : 'Unknown'} | ${starsLabel(result.stars)}`,
                                    value: `Storage: ${cardUser ? cardUser.storage : '-'}${cardType === 'security' ? '%' : 'h'}\nMultiplier: ${cardUser ? cardUser.multiplier : '-'}x`,
                                    inline: true
                                };
                            })
                        });
                        const pages = [{ [PRESERVE_KEY]: true, ...summary.toJSON() }, ...results.map(r => ({ [PRESERVE_KEY]: true, ...r.embed.toJSON() }))];
                        return sendPages(message, pages);
                    }
                }
            }
        },
        generate: {
            data: { name: 'card generate', description: 'Generate a card', usage: ',card generate <user> <card id> <type>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = message.mentions && message.mentions.users ? message.mentions.users.first() : null;
                const cardId = parseInt(args[1], 10);
                const type = String(args[2] || '').toLowerCase();
                if (!target || !Number.isFinite(cardId)) {
                    return warn(message, 'Invalid arguments.\n> **Usage:** `,card generate <user> <card id> <type>`');
                }
                if (!['pink', 'standard', 'blackice', 'gold'].includes(type)) {
                    return warn(message, 'Invalid type, please choose between `gold`, `pink`, `blackice` & `standard`.');
                }
                const itemData = first('SELECT * FROM economy_cards WHERE id = ?', cardId);
                if (!itemData) return warn(message, 'This card does not exist.');
                const itemStorage = itemData.business === 'personal' ? 100 : 30;
                const itemMultiplier = 3.5;
                const newCardId = uniqueCardId();
                run('INSERT INTO economy_cards_user (id, user_id, card_id, business, storage, multiplier, image, background, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
                    itemData.id, target.id, newCardId, itemData.business, itemStorage, itemMultiplier, itemData.image, type);
                return message.reply({
                    embeds: [createEmbed({
                        color: COLORS.NEUTRAL,
                        title: `${itemData.name} | ${starsLabel(itemData.stars)}`,
                        author: { name: target.username },
                        image: itemData.image || undefined,
                        fields: [
                            { name: 'Card ID', value: String(newCardId), inline: true },
                            { name: 'Storage', value: itemData.business === 'personal' ? `${itemStorage}%` : `${itemStorage}h`, inline: true },
                            { name: 'Multiplier', value: `${itemMultiplier}x`, inline: true }
                        ]
                    })]
                });
            }
        }
    }
};
