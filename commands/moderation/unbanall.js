const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'unbanall', description: 'Unban all banned members in the server', usage: ',unbanall' },
    cooldown: 300,
    async execute(message) {
        if (!isOwner(message.member)) return message.reply({ embeds: [errorEmbed('Owner Only', 'Only the server owner can use this.')] });

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xfbbf24,
                title: 'Unban All Members',
                description: `This will unban **everyone** banned in ${message.guild.name}.\nReact with ✅ to confirm.`
            })]
        });

        await confirm.react('✅');
        const filter = (r, u) => r.emoji.name === '✅' && u.id === message.author.id;
        const collector = confirm.createReactionCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async () => {
            await confirm.edit({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Unbanning...', description: 'Fetching banned users.' })] });

            let count = 0;
            let failed = 0;
            const bans = await message.guild.bans.fetch();

            for (const [, ban] of bans) {
                try {
                    await message.guild.members.unban(ban.user.id, `Unbanned by ${message.author.tag} via unbanall`);
                    count++;
                } catch {
                    failed++;
                }
            }

            await confirm.edit({
                embeds: [successEmbed('Unban All Complete', `Unbanned **${count}** member(s).${failed ? ` Failed: **${failed}**` : ''}`)]
            });
            await confirm.reactions.removeAll().catch(() => {});
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({ embeds: [errorEmbed('Cancelled', 'Unban all cancelled.')] });
                confirm.reactions.removeAll().catch(() => {});
            }
        });
    }
};
