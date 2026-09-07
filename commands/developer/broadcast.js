const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'broadcast', description: 'Send a message to all servers (Developer only)', usage: ',broadcast [message]' },
    aliases: ['bc'],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const text = args.join(' ');
        if (!text) return message.reply({ embeds: [errorEmbed('Missing Message', 'Usage: ,broadcast <message>')] });

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Broadcast',
                description: `This will send a message to **${client.guilds.cache.size}** servers.\nReact with ✅ to confirm.`
            })]
        });

        await confirm.react('✅');
        const filter = (r, u) => r.emoji.name === '✅' && u.id === message.author.id;
        const collector = confirm.createReactionCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async () => {
            await confirm.edit({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Broadcasting...' })] });

            let sent = 0;
            let failed = 0;

            for (const [, guild] of client.guilds.cache) {
                const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
                if (!channel) { failed++; continue; }
                try {
                    await channel.send({ embeds: [{ color: 0x6c5ce7, description: text }] });
                    sent++;
                } catch {
                    failed++;
                }
            }

            await confirm.edit({
                embeds: [successEmbed('Broadcast Complete', `Sent to **${sent}** server(s).${failed ? ` Failed: **${failed}**` : ''}`)]
            });
            await confirm.reactions.removeAll().catch(() => {});
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({ embeds: [errorEmbed('Cancelled', 'Broadcast cancelled.')] });
                confirm.reactions.removeAll().catch(() => {});
            }
        });
    }
};
