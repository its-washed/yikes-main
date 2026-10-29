const { approve, warn } = require('../../utils/context');

module.exports = {
    data: { name: 'rizz', description: 'Get a random rizz', usage: ',rizz' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let result = null;
        try {
            const res = await fetch('https://api.evelina.bot/fun/rizz?key=X3pZmLq82VnHYTd6Cr9eAw');
            if (res.ok) result = await res.json();
        } catch (err) {
            result = null;
        }
        if (Array.isArray(result)) result = result[0];
        if (!result || !result.text) {
            return warn(message, 'Could not fetch a rizz.');
        }
        return approve(message, `${result.text}`);
    }
};
