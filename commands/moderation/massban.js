const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'massban',
        description: 'Ban multiple users at once',
        usage: ',massban <id1> <id2> ... [reason]'
    },
    aliases: ['multiban'],
    cooldown: 30,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Ban Members` permission.')] });
        }

        if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
            return message.reply({ embeds: [errorEmbed('Bot Permission', 'I need `Ban Members` permission.')] });
        }

        if (args.length < 1) {
            return message.reply({ embeds: [errorEmbed('Missing IDs', 'Usage: ,massban <id1> <id2> ... [reason]')] });
        }

        const ids = args.filter(a => /^\d{17,20}$/.test(a));
        if (ids.length === 0) {
            return message.reply({ embeds: [errorEmbed('Invalid IDs', 'Provide valid user IDs (numbers only).')] });
        }

        const reason = args.filter(a => !/^\d{17,20}$/.test(a)).join(' ') || 'Mass ban';

        const confirmMsg = await message.reply({
            embeds: [{
                color: 0xff4757,
                title: 'Mass Ban Confirmation',
                description: `About to ban **${ids.length}** user(s).\n\nIDs:\n${ids.map(id => `\`${id}\``).join('\n')}\n\nReact with ✅ to confirm.`
            }]
        });

        await confirmMsg.react('✅');
        await confirmMsg.react('❌');

        const filter = (reaction, user) => ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;
        const collector = confirmMsg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async (reaction) => {
            if (reaction.emoji.name === '✅') {
                let banned = 0;
                let failed = 0;
                for (const id of ids) {
                    try {
                        await message.guild.members.ban(id, { reason: `${reason} | Mass ban by ${message.author.tag}` });
                        banned++;
                    } catch {
                        failed++;
                    }
                }
                await confirmMsg.edit({ embeds: [successEmbed('Mass Ban Complete', `Banned **${banned}** user(s).${failed > 0 ? ` Failed: ${failed}` : ''}`)] });
            } else {
                await confirmMsg.edit({ embeds: [successEmbed('Cancelled', 'Mass ban cancelled.')] });
            }
            await confirmMsg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirmMsg.edit({ embeds: [errorEmbed('Timed Out', 'Mass ban cancelled.')] });
                confirmMsg.reactions.removeAll();
            }
        });
    }
};
