const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'urban',
        description: 'Urban Dictionary lookup',
        usage: ',urban [term]'
    },
    aliases: ['ud', 'urbandict'],
    cooldown: 5,

    async execute(message, args) {
        const term = args.join(' ');
        if (!term) return message.reply({ embeds: [errorEmbed('Missing Term', 'Usage: ,urban [term]')] });

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: `Urban Dictionary — ${term}`,
                description: `[Look up "${term}"](https://www.urbandictionary.com/define.php?term=${encodeURIComponent(term)})\n\n*API not connected.*`
            })]
        });
    }
};
