const { Events } = require('discord.js');

module.exports = [
    {
        name: Events.MessageCreate,
        once: false,
        async execute(message) {
            if (message.author.bot || !message.guild || !message.content) return;

            try {
                const blacktea = require('../commands/fun/blacktea');
                blacktea.handleGuess(message);
            } catch (err) {}

            try {
                const gtn = require('../commands/fun/guessthenumber');
                if (await gtn.handleGuess(message)) return;
            } catch (err) {}

            try {
                const counting = require('../commands/fun/counting');
                await counting.handleCount(message);
            } catch (err) {}
        }
    },
    {
        name: Events.MessageDelete,
        once: false,
        async execute(message) {
            if (!message.guild || !message.author || message.author.bot) return;
            try {
                const counting = require('../commands/fun/counting');
                await counting.handleDelete(message);
            } catch (err) {}
        }
    }
];
