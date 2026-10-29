const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { resolveMember, getMarriage, insertMarriage } = require('../../utils/roleplay');
const { createEmbed, COLORS } = require('../../utils/embeds');
const { warn } = require('../../utils/context');

const MARRY_COLOR = 0xFF819F;

module.exports = {
    data: { name: 'marry', description: 'Marry a member', usage: ',marry <member>' },
    aliases: [],
    cooldown: 10,

    async execute(message, args, client) {
        const target = await resolveMember(message, args[0]);
        if (!target) {
            return warn(message, `Member **${args[0] || ''}** couldn't be found`);
        }
        if (target.id === message.author.id) {
            return warn(message, "You can't marry yourself");
        }
        if (target.user.bot) {
            return warn(message, "You can't marry a bot");
        }
        if (getMarriage(target.id)) {
            return warn(message, `**${target}** is already married`);
        }
        if (getMarriage(message.author.id)) {
            return warn(message, 'You are already **married**. Are you trying to cheat?? 🤨');
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('marry_yes').setLabel('Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('marry_no').setLabel('Decline').setStyle(ButtonStyle.Danger)
        );

        const sent = await message.reply({
            content: `${target}`,
            embeds: [createEmbed({
                color: MARRY_COLOR,
                timestamp: false,
                description: `💞 ${message.author} wants to marry you. Do you accept?`
            })],
            components: [row]
        });

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === target.id || i.user.id === message.author.id,
            time: 60000
        });

        collector.on('collect', async i => {
            if (i.customId === 'marry_no') {
                collector.stop();
                return i.update({
                    content: null,
                    embeds: [createEmbed({
                        color: COLORS.error,
                        timestamp: false,
                        description: `💔 ${target} declined the proposal.`
                    })],
                    components: []
                });
            }
            if (i.user.id !== target.id) {
                return i.reply({ content: 'Only the mentioned member can accept this proposal.', ephemeral: true });
            }
            collector.stop();
            insertMarriage(message.author.id, target.id);
            return i.update({
                content: null,
                embeds: [createEmbed({
                    color: MARRY_COLOR,
                    timestamp: false,
                    description: `💞 **${message.author.username}** & **${target.user.username}** are now married!`
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
