const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isAdmin, isOwner } = require('../../utils/permissions');

module.exports = {
    data: { name: 'banall', description: 'Ban all members in the server', usage: ',banall' },
    aliases: ['banhumans'],
    cooldown: 300,
    async execute(message) {
        if (!isOwner(message.member)) return message.reply({ embeds: [errorEmbed('Owner Only', 'Only the server owner can use this.')] });

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Ban All Members',
                description: `This will ban **all members** in ${message.guild.name}.\nReact with ✅ to confirm.`
            })]
        });

        await confirm.react('✅');
        const filter = (r, u) => r.emoji.name === '✅' && u.id === message.author.id;
        const collector = confirm.createReactionCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async () => {
            await confirm.edit({ embeds: [createEmbed({ color: 0xfbbf24, title: 'Banning...', description: 'Working through the member list.' })] });

            let count = 0;
            let failed = 0;
            const members = await message.guild.members.fetch();

            for (const [, member] of members) {
                if (member.user.bot) continue;
                if (member.id === message.author.id) continue;
                if (member.id === message.guild.ownerId) continue;
                if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) { failed++; continue; }

                try {
                    await member.ban({ reason: `Banned by ${message.author.tag} via banall` });
                    count++;
                } catch {
                    failed++;
                }
            }

            await confirm.edit({
                embeds: [successEmbed('Ban All Complete', `Banned **${count}** member(s).${failed ? ` Failed: **${failed}**` : ''}`)]
            });
            await confirm.reactions.removeAll().catch(() => {});
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({ embeds: [errorEmbed('Cancelled', 'Ban all cancelled.')] });
                confirm.reactions.removeAll().catch(() => {});
            }
        });
    }
};
