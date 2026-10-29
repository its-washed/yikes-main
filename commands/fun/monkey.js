const { errorEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    data: { name: 'monkey', description: 'Get a random monkey image', usage: ',monkey' },
    aliases: [],
    cooldown: 5,

    async execute(message) {
        let bytes = null;
        try {
            const res = await fetch('https://www.placemonkeys.com/500/350?random');
            if (res.ok) bytes = Buffer.from(await res.arrayBuffer());
        } catch (err) {
            bytes = null;
        }
        if (!bytes) {
            return message.reply({ embeds: [errorEmbed('Failed', 'Could not fetch a monkey image.')] });
        }
        const embed = { color: COLORS.NEUTRAL, image: { url: 'attachment://monkey.png' } };
        return message.reply({
            embeds: [embed],
            files: [new AttachmentBuilder(bytes, { name: 'monkey.png' })]
        });
    }
};
