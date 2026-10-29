const { warn, say } = require('../../utils/context');

module.exports = {
    data: { name: 'choose', description: 'Choose between options', usage: ',choose Austria, Vienna, Italy', params: ['options'] },
    aliases: [],
    cooldown: 3,
    async execute(message, args) {
        const choices = args.join(' ').split(', ');
        if (choices.length === 1) {
            return warn(message, 'Not enough **choices** seperate your choices with a `,`');
        }
        const final = choices[Math.floor(Math.random() * choices.length)].trim();
        return say(message, `Choosed **${final}**`);
    }
};
