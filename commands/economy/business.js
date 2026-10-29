const { PermissionFlagsBits } = require('discord.js');
const { sendCard } = require('../../utils/helpCard');
const { warn, approve } = require('../../utils/context');
const { run, first, query } = require('../../utils/database');
const { confirm, needPerm } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const { EMOJIS, COLORS } = require('../../utils/styles');
const { createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'business', description: 'Manage your business', usage: ',business <subcommand>' },
    aliases: ["b"],
    cooldown: 5,
    subcommands: ['buy', 'sell', 'info', 'collect', 'list', 'add', 'remove'],
    subUsages: {
        buy: ',business buy <name>',
        sell: ',business sell',
        info: ',business info [user]',
        collect: ',business collect',
        list: ',business list',
        add: ',business add <user> <business id>',
        remove: ',business remove <user>'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        buy: {
            data: { name: 'business buy', description: 'Buy a business', usage: ',business buy <name>' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You need to provide a business name.\n> **Usage:** `,business buy <name>`');
                if (E.getUserBusiness(userId)) return warn(message, 'You already own a business.');
                const systemBusiness = E.getSystemBusiness(name);
                if (!systemBusiness) return warn(message, "This business doesn't exist.");
                const row = E.ensureAccount(userId);
                if (row.cash < systemBusiness.cost) {
                    return warn(message, `You don't have enough money to buy this business.\n> You need **${E.cleanHumanize(systemBusiness.cost)}** \ud83d\udcb5`);
                }
                run('INSERT INTO economy_business (user_id, last_collected, business_id) VALUES (?, ?, ?)', userId, Date.now() / 1000, systemBusiness.business_id);
                run('UPDATE economy SET cash = cash - ? WHERE user_id = ?', systemBusiness.cost, userId);
                E.logging(userId, systemBusiness.cost, 'buy', 'business');
                E.loggingBusiness(userId, client.user ? client.user.id : userId, systemBusiness.cost, 'buy', systemBusiness.business_id);
                return approve(message, `You have successfully bought the business **${systemBusiness.name}** for **${E.humanize(systemBusiness.cost)}** \ud83d\udcb5`);
            }
        },
        sell: {
            data: { name: 'business sell', description: 'Sell your business', usage: ',business sell' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const userBusiness = E.getUserBusiness(userId);
                if (!userBusiness) return warn(message, "You don't own any business.");
                const systemBusiness = E.getSystemBusinessById(userBusiness.business_id);
                if (!systemBusiness) return warn(message, "This business doesn't exist.");
                const salePrice = Math.floor(systemBusiness.cost / 2);
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to sell **${systemBusiness.name}** for **${E.humanize(salePrice)}** \ud83d\udcb5?`,
                    async (i) => {
                        const stillOwned = E.getUserBusiness(userId);
                        if (!stillOwned) {
                            return i.update({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${i.user}: You don't own any business.` }], components: [] });
                        }
                        run('DELETE FROM economy_business WHERE user_id = ?', userId);
                        run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', salePrice, userId);
                        E.logging(userId, salePrice, 'sell', 'business');
                        E.loggingBusiness(userId, userId, salePrice, 'sell', systemBusiness.business_id);
                        const usedCard = first('SELECT card_id FROM economy_cards_used WHERE user_id = ? AND business = ?', userId, 'business');
                        if (usedCard) {
                            run('UPDATE economy_cards_user SET active = 1 WHERE user_id = ? AND card_id = ?', userId, usedCard.card_id);
                            run('DELETE FROM economy_cards_used WHERE user_id = ? AND card_id = ?', userId, usedCard.card_id);
                        }
                        await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user}: You have successfully sold the business **${systemBusiness.name}** for **${E.humanize(salePrice)}** \ud83d\udcb5` }], components: [] });
                    },
                    async (i) => {
                        await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user}: Sale got canceled` }], components: [] });
                    });
            }
        },
        info: {
            data: { name: 'business info', description: 'Get information about your business', usage: ',business info [user]' },
            aliases: ['status'],
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const target = (message.mentions && message.mentions.users && message.mentions.users.first()) || message.author;
                const userBusiness = E.getUserBusiness(target.id);
                if (!userBusiness) {
                    const does = target.id === message.author.id ? "don't" : "doesn't";
                    return warn(message, `${target.id === message.author.id ? 'You' : `${target}`} ${does} own any business.`);
                }
                const systemBusiness = E.getSystemBusinessById(userBusiness.business_id);
                if (!systemBusiness) return warn(message, "This business doesn't exist.");

                const embed = createEmbed({
                    color: COLORS.NEUTRAL,
                    title: `${systemBusiness.name} ${systemBusiness.emoji || ''}`,
                    author: { name: target.username }
                });
                if (systemBusiness.description) embed.setDescription(systemBusiness.description);

                const pending = E.businessEarning(target.id, userBusiness.last_collected, systemBusiness.earnings);
                if (pending <= 0) {
                    embed.addFields({ name: 'Next collection time', value: `<t:${Math.floor(userBusiness.last_collected + 3600)}:R>`, inline: false });
                }

                const used = E.getUsedCard(target.id, 'business');
                if (used) {
                    embed.addFields(
                        { name: 'Manager', value: `\`\`\`${used.name} | ${'\u2b50'.repeat(used.stars)}\`\`\``, inline: true },
                        { name: 'Storage', value: `\`\`\`${used.storage}h\`\`\``, inline: true },
                        { name: 'Multiplier', value: `\`\`\`${used.multiplier}x\`\`\``, inline: true }
                    );
                }
                embed.addFields({ name: 'State Value', value: `\`\`\`${E.cleanHumanize(systemBusiness.cost)} \ud83d\udcb5\`\`\`` });
                embed.addFields({
                    name: 'Hour Revenue',
                    value: `\`\`\`${E.cleanHumanize(used ? systemBusiness.earnings * used.multiplier : systemBusiness.earnings)} \ud83d\udcb5\`\`\``,
                    inline: true
                });
                embed.addFields({ name: 'Balance', value: `\`\`\`${E.cleanHumanize(pending)} \ud83d\udcb5\`\`\``, inline: true });
                return message.reply({ embeds: [embed] });
            }
        },
        collect: {
            data: { name: 'business collect', description: 'Collect the balance from your business', usage: ',business collect' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const userId = message.author.id;
                const userBusiness = E.getUserBusiness(userId);
                if (!userBusiness) return warn(message, "You don't own any business.");
                const systemBusiness = E.getSystemBusinessById(userBusiness.business_id);
                if (!systemBusiness) return warn(message, "This business doesn't exist.");
                const pending = E.businessEarning(userId, userBusiness.last_collected, systemBusiness.earnings);
                if (pending <= 0) {
                    return warn(message, `You can **only** collect your business earnings **once** every hour\n> Next collection time: <t:${Math.floor(userBusiness.last_collected + 3600)}:R>`);
                }
                run('UPDATE economy SET cash = cash + ? WHERE user_id = ?', pending, userId);
                run('UPDATE economy_business SET last_collected = ? WHERE user_id = ?', Date.now() / 1000, userId);
                E.addCollectMoney(userId, 'business', pending);
                E.logging(userId, pending, 'collect', 'business');
                E.loggingBusiness(userId, client.user ? client.user.id : userId, pending, 'collect', systemBusiness.business_id);
                return approve(message, `You have successfully collected **${E.humanizeClean(pending)}** \ud83d\udcb5 from your business **${systemBusiness.name}**.`);
            }
        },
        list: {
            data: { name: 'business list', description: 'List all businesses', usage: ',business list' },
            execute: async (message, args, client) => {
                if (!await ensureEconomy(message, client)) return;
                const businesses = E.getAllBusinesses();
                if (!businesses.length) return warn(message, 'No businesses found.');
                const pages = businesses.map((business, index) => ({
                    color: COLORS.NEUTRAL,
                    title: `${business.name} ${business.emoji || ''}`,
                    description: business.description || '',
                    fields: [
                        { name: 'Cost', value: `${E.humanizeClean(business.cost)} \ud83d\udcb5`, inline: true },
                        { name: 'Earnings per Hour', value: `${E.humanizeClean(business.earnings)} \ud83d\udcb5`, inline: true }
                    ],
                    image: business.image || undefined,
                    footer: { text: `Page: ${index + 1}/${businesses.length} (${businesses.length} entries)` }
                }));
                const paginator = new Paginator(pages, { userId: message.author.id });
                const components = pages.length > 1 ? [paginator.buildRow()] : [];
                const sent = await message.reply({ embeds: paginator.buildEmbeds(), components });
                if (pages.length > 1) await paginator.start(message.channel, sent);
                return sent;
            }
        },
        add: {
            data: { name: 'business add', description: 'Add a business to a user', usage: ',business add <user> <business id>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = message.mentions && message.mentions.users ? message.mentions.users.first() : null;
                const businessId = parseInt(args[1], 10);
                if (!target || !Number.isFinite(businessId)) {
                    return warn(message, 'Invalid arguments.\n> **Usage:** `,business add <user> <business id>`');
                }
                const business = E.getSystemBusinessById(businessId);
                if (!business) return warn(message, "This business doesn't exist.");
                if (E.getUserBusiness(target.id)) return warn(message, `${target} already owns a business.`);
                run('INSERT INTO economy_business (user_id, last_collected, business_id) VALUES (?, ?, ?)', target.id, Date.now() / 1000, businessId);
                E.loggingBusiness(target.id, message.author.id, 0, 'add', businessId);
                return approve(message, `Successfully added the business **${business.name}** to ${target}.`);
            }
        },
        remove: {
            data: { name: 'business remove', description: 'Remove a business from a user', usage: ',business remove <user>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const target = message.mentions && message.mentions.users ? message.mentions.users.first() : null;
                if (!target) return warn(message, 'You need to mention a user.\n> **Usage:** `,business remove <user>`');
                const userBusiness = E.getUserBusiness(target.id);
                if (!userBusiness) return warn(message, `${target} doesn't own any business.`);
                const business = E.getSystemBusinessById(userBusiness.business_id);
                run('DELETE FROM economy_business WHERE user_id = ?', target.id);
                E.loggingBusiness(target.id, message.author.id, 0, 'remove', userBusiness.business_id);
                return approve(message, `Successfully removed the business from ${target}${business ? ` (**${business.name}**)` : ''}.`);
            }
        }
    }
};
