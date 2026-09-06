const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
    data: { name: 'starboardhelp', description: 'Starboard help', usage: ',starboardhelp' },
    aliases: ['sbhelp'],
    cooldown: 3,
    async execute(message) {
        return message.reply({ embeds: [createEmbed({ color: 0xffd700, title: 'Starboard Help', description: 'React with ⭐ to star messages.\n\nSetup: `,starboard [#channel] [threshold]`\n\nDefault threshold: 5 stars' })] });
    }
};
