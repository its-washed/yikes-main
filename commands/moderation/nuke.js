const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createEmbed, errorEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission } = require('../../utils/permissions');

module.exports = {
    data: { name: 'nuke', description: 'Clone and recreate channel', usage: ',nuke' },
    aliases: [],
    cooldown: 30,

    async execute(message) {
        if (!hasPermission(message.member, 'ManageGuild')) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        }

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xff4757,
                title: 'Nuke Channel',
                description: `${message.author} : Are you sure you want to nuke this channel?\nThis will delete the current channel and create a new one with the same name & permissions.\nThis action cannot be undone, and WILL NOT reconfigure anything you've set with this bot`
            })],
            components: [
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('nuke_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('nuke_no').setLabel('No').setStyle(ButtonStyle.Danger)
                )
            ]
        });

        const collector = confirm.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 30000,
            max: 1
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'nuke_no') {
                return i.update({ embeds: [errorEmbed('Cancelled', 'Nuke cancelled.')], components: [] });
            }

            await i.deferUpdate();

            try {
                const channel = message.channel;
                const newChannel = await channel.clone();
                await channel.delete();
                await newChannel.send({
                    embeds: [createEmbed({
                        color: 0xff4757,
                        title: 'Channel Nuked',
                        description: `Nuked by ${message.author.tag}`
                    })]
                });
            } catch (err) {
                await message.reply({
                    embeds: [errorEmbed('Nuke Failed', 'Could not nuke this channel. Make sure I have **Manage Channels** permissions.')]
                }).catch(() => {});
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({
                    embeds: [errorEmbed('Expired', 'Nuke confirmation expired. Run `,nuke` again.')],
                    components: []
                }).catch(() => {});
            }
        });
    }
};
