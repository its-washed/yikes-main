const { createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'shutdown',
        description: 'Shut down the bot (owner only)',
        usage: ',shutdown'
    },
    aliases: ['die', 'restart'],
    cooldown: 0,

    async execute(message, args, client) {
        const ownerIds = process.env.OWNER_IDS?.split(',') || [];
        if (!ownerIds.includes(message.author.id) && message.author.id !== message.guild.ownerId) {
            return message.reply({ embeds: [createEmbed({ color: 0xff4757, description: 'Only the bot owner can use this.' })] });
        }

        const confirmMsg = await message.reply({
            embeds: [createEmbed({ color: 0xff4757, title: 'Shutdown', description: 'Are you sure?\nReact with ⏻ to confirm.' })]
        });

        await confirmMsg.react('⏻');
        const filter = (reaction, user) => reaction.emoji.name === '⏻' && user.id === message.author.id;
        const collector = confirmMsg.createReactionCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async () => {
            await confirmMsg.edit({ embeds: [createEmbed({ color: 0xff4757, description: 'Shutting down... Goodbye! 👋' })] });
            setTimeout(() => client.destroy(), 1000);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) confirmMsg.edit({ embeds: [createEmbed({ color: 0x74b9ff, description: 'Shutdown cancelled.' })] });
        });
    }
};
