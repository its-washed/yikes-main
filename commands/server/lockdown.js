const { PermissionFlagsBits } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'lockdown',
        description: 'Lock all channels at once',
        usage: ',lockdown [reason]'
    },
    aliases: ['lockall'],
    cooldown: 60,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const reason = args.join(' ') || `Lockdown by ${message.author.tag}`;

        const confirmMsg = await message.reply({
            embeds: [{
                color: 0xff4757,
                title: 'Lockdown Confirmation',
                description: `This will lock **all text channels** in the server.\n\nReact with 🔒 to confirm.`
            }]
        });

        await confirmMsg.react('🔒');
        const filter = (reaction, user) => reaction.emoji.name === '🔒' && user.id === message.author.id;
        const collector = confirmMsg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async () => {
            const channels = message.guild.channels.cache.filter(c => c.type === 0 && c.manageable);
            let count = 0;

            for (const [, channel] of channels) {
                try {
                    await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                        SendMessages: false
                    }, { reason });
                    count++;
                } catch {}
            }

            await confirmMsg.edit({ embeds: [successEmbed('Lockdown Complete', `Locked **${count}** text channel(s).`)] });
            await confirmMsg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirmMsg.edit({ embeds: [errorEmbed('Timed Out', 'Lockdown cancelled.')] });
                confirmMsg.reactions.removeAll();
            }
        });
    }
};
