const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getMarriage, marriagePartner, deleteMarriage } = require('../../utils/roleplay');
const { createEmbed, COLORS } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

function duration(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (days) return `${days} day${days === 1 ? '' : 's'}`;
    if (hours) return `${hours} hour${hours === 1 ? '' : 's'}`;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

module.exports = {
    data: { name: 'divorce', description: 'Divorce from your partner', usage: ',divorce' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        const row = getMarriage(message.author.id);
        if (!row) {
            return warn(message, 'You are not **married**');
        }

        const partnerId = marriagePartner(row, message.author.id);

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('divorce_yes').setLabel('Divorce').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('divorce_no').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
        );

        const sent = await message.reply({
            embeds: [createEmbed({
                color: COLORS.warning,
                timestamp: false,
                description: `❓ ${message.author} are you sure you want to divorce?`
            })],
            components: [buttons]
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'divorce_no') {
                collector.stop();
                return i.update({
                    embeds: [createEmbed({
                        color: COLORS.error,
                        timestamp: false,
                        description: `❌ ${i.user}: Divorce got canceled`
                    })],
                    components: []
                });
            }

            collector.stop();
            deleteMarriage(message.author.id);

            const partner = client.users.cache.get(partnerId) || await client.users.fetch(partnerId).catch(() => null);
            if (partner) {
                const lasted = duration(Date.now() / 1000 - Number(row.timestamp));
                partner.send({
                    embeds: [createEmbed({
                        color: 0xFF819F,
                        timestamp: false,
                        description: `💔 It seems like your partner **${i.user}** decided to divorce :(\n> Your relationship with them lasted **${lasted}**`
                    })]
                }).catch(() => {});
            }

            return i.update({
                embeds: [createEmbed({
                    color: COLORS.success,
                    timestamp: false,
                    description: `✅ ${i.user}: Divorced with partner`
                })],
                components: []
            });
        });

        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });

        return sent;
    }
};
