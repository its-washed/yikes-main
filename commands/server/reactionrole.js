const { PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'reactionrole',
        description: 'Create a reaction role message',
        usage: ',reactionrole [setup|add|remove|list]'
    },
    aliases: ['rr'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'list') {
            const rrs = config.reactionRoles || [];
            if (rrs.length === 0) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reaction Roles', description: 'No reaction roles configured.\nUse `,reactionrole setup` to create one.' })] });
            }

            const list = rrs.map((rr, i) => {
                const channel = message.guild.channels.cache.get(rr.channelId);
                return `**${i + 1}.** ${channel || 'Deleted channel'} — ${rr.roles.length} role(s)`;
            }).join('\n');

            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Reaction Roles (${rrs.length})`, description: list })] });
        }

        if (action === 'setup') {
            const channel = message.mentions.channels.first() || message.channel;
            const title = args.slice(2).join(' ') || 'Select your roles';

            const selectMenu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('rr_select')
                    .setPlaceholder('Select roles to add')
                    .setMinValues(1)
                    .setMaxValues(10)
            );

            const allRoles = message.guild.roles.cache
                .filter(r => r.position !== 0 && r.position < message.guild.members.me.roles.highest.position && !r.managed)
                .sort((a, b) => b.position - a.position)
                .first(25);

            if (allRoles.length === 0) {
                return message.reply({ embeds: [errorEmbed('No Roles', 'No assignable roles found.')] });
            }

            selectMenu.components[0].addOptions(
                allRoles.map(r => ({
                    label: r.name,
                    value: r.id,
                    emoji: '🎭'
                }))
            );

            const embed = createEmbed({
                color: 0x6c5ce7,
                title: title,
                description: 'Select the roles you want in the reaction role message.\nChoose roles from the menu below.'
            });

            const reply = await message.reply({ embeds: [embed], components: [selectMenu] });

            const collector = reply.createMessageComponentCollector({
                filter: (i) => i.user.id === message.author.id,
                time: 60000,
                max: 1
            });

            collector.on('collect', async (interaction) => {
                const selectedRoles = interaction.values;
                const roleList = selectedRoles.map(id => {
                    const role = message.guild.roles.cache.get(id);
                    return role ? `${role}` : id;
                });

                const rrEmbed = createEmbed({
                    color: 0x6c5ce7,
                    title: title,
                    description: `React with the emoji to get the role.\n\n${roleList.join('\n')}`
                });

                const rrMsg = await channel.send({ embeds: [rrEmbed] });

                const emojis = ['🔴', '🔵', '🟢', '🟡', '🟣', '⚫', '⚪', '🟠', '🩷', '💙'];
                const roleMap = {};

                for (let i = 0; i < selectedRoles.length; i++) {
                    await rrMsg.react(emojis[i]);
                    roleMap[emojis[i]] = selectedRoles[i];
                }

                const rrs = config.reactionRoles || [];
                rrs.push({
                    messageId: rrMsg.id,
                    channelId: channel.id,
                    roles: selectedRoles,
                    roleMap
                });
                updateGuildConfig(message.guild.id, { reactionRoles: rrs });

                await interaction.reply({ content: 'Reaction role created!', ephemeral: true });
                await reply.delete().catch(() => {});
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    reply.edit({ embeds: [errorEmbed('Timed Out', 'Setup cancelled.')] });
                }
            });
            return;
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `setup`, `list`')] });
    }
};
