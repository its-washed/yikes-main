const { approve, warn } = require('../../utils/context');

module.exports = {
    data: { name: 'roll', description: 'Get a random number between the given range', usage: ',roll <min> <max>' },
    aliases: [],
    cooldown: 3,

    async execute(message, args) {
        const min = parseInt(args[0], 10);
        const max = parseInt(args[1], 10);
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return warn(message, 'You must provide a valid range\n> Usage: `roll <min> <max>`');
        }
        if (min > max) return warn(message, 'The minimum number cannot be higher than the maximum number');
        const result = Math.floor(Math.random() * (max - min + 1)) + min;
        return approve(message, `🎲 You rolled **${result}**`);
    }
};
