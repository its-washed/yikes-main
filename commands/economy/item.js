const { sendCard } = require('../../utils/helpCard');
const { warn } = require('../../utils/context');
const { EMOJIS } = require('../../utils/styles');
const { run } = require('../../utils/database');
const { confirm } = require('../../utils/moderation');
const { ensureEconomy } = require('../../utils/predicates');
const E = require('../../utils/econ');

module.exports = {
    data: { name: 'item', description: "View your economy profile", usage: ',item <buy|sell>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['buy', 'sell'],
    subUsages: {
        buy: ',item buy bank <amount>',
        sell: ',item sell bank <amount>'
    },
    execute: async (message) => {
        return sendCard(message, module.exports);
    },
    subs: {
        buy: {
            data: { name: 'item buy', description: 'Buy items for your account', usage: ',item buy <bank>' },
            execute: async (message) => {
                return warn(message, 'Use `,item buy bank <amount>` to buy additional bank space.');
            },
            subs: {
                bank: {
                    data: { name: 'item buy bank', description: 'Buy additional bank space', usage: ',item buy bank <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const amount = parseInt(String(args[0] || '').replace(/,/g, ''), 10);
                        if (!Number.isFinite(amount) || amount <= 0) {
                            return warn(message, 'You need to provide an amount of bank space to buy.\n> **Usage:** `,item buy bank <amount>`');
                        }
                        const row = E.ensureAccount(message.author.id);
                        const cost = amount * 1;
                        if (row.cash < cost) {
                            return warn(message, `You don't have enough money to buy **${E.cleanHumanize(amount)}** bank space.`);
                        }
                        return confirm(message,
                            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to purchase **${amount.toLocaleString('en-US')}** bank space for **${E.humanize(cost)}** \ud83d\udcb5?`,
                            async (i) => {
                                const fresh = E.ensureAccount(i.user.id);
                                if (fresh.cash < cost) {
                                    return i.update({
                                        embeds: [{ color: 0xffd600, description: `${EMOJIS.WARNING} ${i.user}: You don't have enough money to buy **${E.cleanHumanize(amount)}** bank space.` }],
                                        components: []
                                    });
                                }
                                E.addDepositMoney(i.user.id, 'bank', amount);
                                run('UPDATE economy SET cash = ?, item_bank = item_bank + ? WHERE user_id = ?', fresh.cash - cost, amount, i.user.id);
                                E.logging(i.user.id, cost, 'buy', 'bank');
                                await i.update({
                                    embeds: [{ color: 0x39ffb8, description: `${EMOJIS.APPROVE} ${i.user}: Successfully bought **${E.cleanHumanize(amount)}** bank space for **${E.humanize(cost)}** \ud83d\udcb5` }],
                                    components: []
                                });
                            },
                            async (i) => {
                                await i.update({
                                    embeds: [{ color: 0xff3939, description: `${EMOJIS.DENY} ${i.user}: Purchase got canceled` }],
                                    components: []
                                });
                            });
                    }
                }
            }
        },
        sell: {
            data: { name: 'item sell', description: 'Sell items from your account', usage: ',item sell <bank>' },
            execute: async (message) => {
                return warn(message, 'Use `,item sell bank <amount>` to sell bank space.');
            },
            subs: {
                bank: {
                    data: { name: 'item sell bank', description: 'Sell bank space', usage: ',item sell bank <amount>' },
                    execute: async (message, args, client) => {
                        if (!await ensureEconomy(message, client)) return;
                        const amount = parseInt(String(args[0] || '').replace(/,/g, ''), 10);
                        if (!Number.isFinite(amount) || amount <= 0) {
                            return warn(message, 'You need to provide an amount of bank space to sell.\n> **Usage:** `,item sell bank <amount>`');
                        }
                        const row = E.ensureAccount(message.author.id);
                        if (row.item_bank < amount) {
                            return warn(message, `You don't have **${E.humanize(amount)}** bank space to sell.`);
                        }
                        if (row.item_bank - amount < row.card) {
                            return warn(message, "You can't sell this much bank space.");
                        }
                        const sellPrice = amount * 0.1;
                        return confirm(message,
                            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to sell **${amount.toLocaleString('en-US')}** bank space for **${E.humanize(sellPrice)}** \ud83d\udcb5?`,
                            async (i) => {
                                const fresh = E.ensureAccount(i.user.id);
                                if (fresh.item_bank < amount) {
                                    return i.update({
                                        embeds: [{ color: 0xffd600, description: `${EMOJIS.WARNING} ${i.user}: You don't have **${E.humanize(amount)}** bank space to sell.` }],
                                        components: []
                                    });
                                }
                                if (fresh.item_bank - amount < fresh.card) {
                                    return i.update({
                                        embeds: [{ color: 0xffd600, description: `${EMOJIS.WARNING} ${i.user}: You can't sell this much bank space.` }],
                                        components: []
                                    });
                                }
                                run('UPDATE economy SET cash = cash + ?, item_bank = item_bank - ? WHERE user_id = ?', sellPrice, amount, i.user.id);
                                E.logging(i.user.id, sellPrice, 'sell', 'bank');
                                await i.update({
                                    embeds: [{ color: 0x39ffb8, description: `${EMOJIS.APPROVE} ${i.user}: Successfully sold **${E.humanize(amount)}** bank space for **${E.humanize(sellPrice)}** \ud83d\udcb5` }],
                                    components: []
                                });
                            },
                            async (i) => {
                                await i.update({
                                    embeds: [{ color: 0xff3939, description: `${EMOJIS.DENY} ${i.user}: Sale got canceled` }],
                                    components: []
                                });
                            });
                    }
                }
            }
        }
    }
};
