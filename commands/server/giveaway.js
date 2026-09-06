const { PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

const giveaways = new Map();

module.exports = {
    data: {
        name: 'giveaway',
        description: 'Start a giveaway',
        usage: ',giveaway [duration] [prize] [--channel #channel]'
    },
    aliases: ['gw', 'gstart'],
    cooldown: 30,

    async execute(message, args, client) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Messages` permission.')] });
        }

        if (!args[0]) {
            return message.reply({ embeds: [errorEmbed('Missing Arguments', 'Usage: ,giveaway [duration] [prize]\nExample: ,giveaway 1h Nitro Classic')] });
        }

        const durationMatch = args[0].match(/^(\d+)(s|m|h|d)$/);
        if (!durationMatch) {
            return message.reply({ embeds: [errorEmbed('Invalid Duration', 'Use formats like: 30m, 2h, 1d')] });
        }

        const amount = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        const ms = amount * units[unit];
        const prize = args.slice(1).join(' ') || 'No prize specified';

        const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('🎉 Giveaway')
            .setDescription(`**${prize}**\n\nReact with 🎉 to enter!\nEnds: <t:${Math.floor((Date.now() + ms) / 1000)}:R>`)
            .setFooter({ text: `Hosted by ${message.author.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_enter')
                .setLabel('Enter Giveaway')
                .setEmoji('🎉')
                .setStyle(ButtonStyle.Success)
        );

        const msg = await message.channel.send({ embeds: [embed], components: [row] });
        await msg.react('🎉');

        giveaways.set(msg.id, {
            prize,
            host: message.author.id,
            channelId: message.channel.id,
            guildId: message.guild.id,
            endTime: Date.now() + ms,
            entries: new Set(),
            messageId: msg.id
        });

        await message.delete().catch(() => {});

        const collector = msg.createMessageComponentCollector({
            filter: (i) => i.customId === 'giveaway_enter',
            time: ms
        });

        collector.on('collect', async (interaction) => {
            const gw = giveaways.get(msg.id);
            if (!gw) return interaction.reply({ content: 'Giveaway ended.', ephemeral: true });

            if (gw.entries.has(interaction.user.id)) {
                gw.entries.delete(interaction.user.id);
                return interaction.reply({ content: 'You left the giveaway!', ephemeral: true });
            } else {
                gw.entries.add(interaction.user.id);
                return interaction.reply({ content: 'You entered the giveaway! 🎉', ephemeral: true });
            }
        });

        collector.on('end', async () => {
            const gw = giveaways.get(msg.id);
            giveaways.delete(msg.id);

            if (!gw || gw.entries.size === 0) {
                const endedEmbed = new EmbedBuilder()
                    .setColor(0xff4757)
                    .setTitle('🎉 Giveaway Ended')
                    .setDescription(`**${prize}**\n\nNo valid entries.`)
                    .setTimestamp();
                await msg.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});
                return;
            }

            const entries = Array.from(gw.entries);
            const winnerId = entries[Math.floor(Math.random() * entries.length)];

            const endedEmbed = new EmbedBuilder()
                .setColor(0x00d26a)
                .setTitle('🎉 Giveaway Ended')
                .setDescription(`**${prize}**\n\nWinner: <@${winnerId}>`)
                .setTimestamp();

            await msg.edit({ embeds: [endedEmbed], components: [] }).catch(() => {});
            await msg.reply({ content: `Congratulations <@${winnerId}>! You won **${prize}**! 🎉` }).catch(() => {});
        });
    }
};
