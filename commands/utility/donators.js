const { paginate } = require('../../utils/context');
const { query } = require('../../utils/database');

module.exports = {
    data: { name: 'donators', description: 'Returns a list of all donators', usage: ',donators' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        const results = query('SELECT * FROM donor').sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
        const entries = results.map((result) =>
            `<@!${result.user_id}> - <t:${Math.floor(result.timestamp)}:R> ${result.status === 'boosted' ? '👑' : '💜'}`);
        return paginate(message, entries, 'Evelina donators');
    }
};
