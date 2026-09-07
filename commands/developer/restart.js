const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'restart', description: 'Restart the bot process (Developer only)', usage: ',restart' },
    aliases: ['reboot'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Restart Bot',
                description: 'React with ✅ to confirm restart.'
            })]
        });

        await confirm.react('✅');
        const filter = (r, u) => r.emoji.name === '✅' && u.id === message.author.id;
        const collector = confirm.createReactionCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async () => {
            await confirm.edit({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Restarting...' })] });
            process.exit(0);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({ embeds: [errorEmbed('Cancelled', 'Restart cancelled.')] });
                confirm.reactions.removeAll().catch(() => {});
            }
        });
    }
};
