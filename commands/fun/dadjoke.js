const { say, warn } = require('../../utils/context');

module.exports = {
    data: { name: 'dadjoke', description: 'Get a random dad joke', usage: ',dadjoke' },
    aliases: ['cringejoke'],
    cooldown: 3,
    async execute(message) {
        const result = await fetch('https://api.evelina.bot/fun/dadjoke?key=X3pZmLq82VnHYTd6Cr9eAw')
            .then(res => res.json())
            .catch(() => null);
        const text = result && result.attachments && result.attachments[0] ? result.attachments[0].text : null;
        if (!text) return warn(message, 'Could not fetch a joke right now, please try again later');
        return say(message, text);
    }
};
