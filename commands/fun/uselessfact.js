const { warn } = require('../../utils/context');

module.exports = {
    data: { name: 'uselessfact', description: 'Get a random useless fact', usage: ',uselessfact' },
    aliases: ['fact', 'uf'],
    cooldown: 5,

    async execute(message) {
        try {
            const res = await fetch('https://api.evelina.bot/fun/uselessfact?key=X3pZmLq82VnHYTd6Cr9eAw');
            if (!res.ok) throw new Error(`status ${res.status}`);
            let data = await res.json();
            if (Array.isArray(data)) data = data[0];
            const text = data && data.text;
            if (!text) throw new Error('empty response');
            return message.reply({ content: text });
        } catch (err) {
            return warn(message, `Couldn't fetch a fact right now (${err.message})`);
        }
    }
};
