const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');
const { parseEmbed } = require('../../utils/variables');

module.exports = {
    data: {
        name: 'ticket',
        description: 'Manage the ticket system',
        usage: ',ticket <setup|send|topics|settings|close|add|remove> [args]'
    },
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `setup`, `send`, `topics`, `settings`,close`, `add`, `remove`')] });

        if (sub === 'setup') return this.handleSetup(message, args.slice(1), config);
        if (sub === 'send') return this.handleSend(message, args.slice(1), config);
        if (sub === 'topics') return this.handleTopics(message, args.slice(1), config);
        if (sub === 'settings') return this.handleSettings(message, args.slice(1), config);
        if (sub === 'add') return this.handleAddMember(message, args.slice(1));
        if (sub === 'remove') return this.handleRemoveMember(message, args.slice(1));

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    },

    async handleSetup(message, args, config) {
        const supportRole = message.mentions.roles.first();
        const category = message.mentions.channels.first();
        if (!supportRole) return message.reply({ embeds: [errorEmbed('Usage', ',ticket setup @support-role [#category]')] });

        updateGuildConfig(message.guild.id, {
            tickets: {
                enabled: true,
                supportRole: supportRole.id,
                categoryId: category?.id || null,
                topics: config.tickets?.topics || [{ name: 'Support', emoji: '🎫' }],
                logsChannel: config.tickets?.logsChannel || null,
                openEmbed: config.tickets?.openEmbed || '{user.mention} has opened a ticket.\n**Topic:** {topic}'
            }
        });

        return message.reply({ embeds: [successEmbed('Tickets Setup', `Support role: ${supportRole}\nCategory: ${category || 'Default'}`)] });
    },

    async handleSend(message, args, config) {
        const channel = message.mentions.channels.first() || message.channel;
        const topics = config.tickets?.topics || [];

        const embed = {
            color: 0x6c5ce7,
            title: 'Support Tickets',
            description: 'Click the button below to create a support ticket.'
        };

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_create').setLabel('Create Ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });
        return message.reply({ embeds: [successEmbed('Sent', `Ticket panel sent to ${channel}`)] });
    },

    async handleTopics(message, args, config) {
        const action = args[0]?.toLowerCase();
        const tickets = config.tickets || {};
        const topics = tickets.topics || [];

        if (action === 'add') {
            const name = args[1];
            const emoji = args[2] || '🎫';
            if (!name) return message.reply({ embeds: [errorEmbed('Usage', ',ticket topics add <name> [emoji]')] });
            topics.push({ name, emoji });
            updateGuildConfig(message.guild.id, { tickets: { ...tickets, topics } });
            return message.reply({ embeds: [successEmbed('Topic Added', `Topic: ${emoji} **${name}**`)] });
        }

        if (action === 'remove') {
            const name = args[1];
            if (!name) return message.reply({ embeds: [errorEmbed('Usage', ',ticket topics remove <name>')] });
            const idx = topics.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
            if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'No topic with that name.')] });
            topics.splice(idx, 1);
            updateGuildConfig(message.guild.id, { tickets: { ...tickets, topics } });
            return message.reply({ embeds: [successEmbed('Removed', `Topic \`${name}\` deleted.`)] });
        }

        if (!topics.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Ticket Topics', description: 'No topics configured.\nUse `,ticket topics add <name>` to create one.' })] });
        }

        const list = topics.map((t, i) => `**${i + 1}.** ${t.emoji} ${t.name}`).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Ticket Topics (${topics.length})`, description: list })] });
    },

    async handleSettings(message, args, config) {
        const action = args[0]?.toLowerCase();
        const tickets = config.tickets || {};

        if (action === 'category') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a category.')] });
            updateGuildConfig(message.guild.id, { tickets: { ...tickets, categoryId: channel.id } });
            return message.reply({ embeds: [successEmbed('Category Set', `Tickets go to ${channel}`)] });
        }

        if (action === 'logs') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel for transcripts.')] });
            updateGuildConfig(message.guild.id, { tickets: { ...tickets, logsChannel: channel.id } });
            return message.reply({ embeds: [successEmbed('Logs Set', `Transcripts go to ${channel}`)] });
        }

        if (action === 'embed') {
            const code = args.slice(1).join(' ');
            if (!code) return message.reply({ embeds: [errorEmbed('Usage', ',ticket settings embed <embed code>')] });
            updateGuildConfig(message.guild.id, { tickets: { ...tickets, openEmbed: code } });
            return message.reply({ embeds: [successEmbed('Embed Set', 'Ticket open message updated.')] });
        }

        if (action === 'role') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a support role.')] });
            updateGuildConfig(message.guild.id, { tickets: { ...tickets, supportRole: role.id } });
            return message.reply({ embeds: [successEmbed('Role Set', `Support role: ${role}`)] });
        }

        return message.reply({ embeds: [errorEmbed('Usage', ',ticket settings <category|logs|embed|role> [args]')] });
    },

    async handleAddMember(message, args) {
        if (!message.channel.name?.startsWith('ticket-')) {
            return message.reply({ embeds: [errorEmbed('Not a Ticket', 'This command can only be used in ticket channels.')] });
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply({ embeds: [errorEmbed('No Member', 'Mention a member to add.')] });
        await message.channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
        return message.reply({ embeds: [successEmbed('Added', `${member} can now see this ticket.`)] });
    },

    async handleRemoveMember(message, args) {
        if (!message.channel.name?.startsWith('ticket-')) {
            return message.reply({ embeds: [errorEmbed('Not a Ticket', 'This command can only be used in ticket channels.')] });
        }
        const member = message.mentions.members.first();
        if (!member) return message.reply({ embeds: [errorEmbed('No Member', 'Mention a member to remove.')] });
        await message.channel.permissionOverwrites.delete(member.id);
        return message.reply({ embeds: [successEmbed('Removed', `${member} can no longer see this ticket.`)] });
    }
};
