const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { parseEmbed } = require('../../utils/variables');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'vanity',
        description: 'Manage vanity roles',
        usage: ',vanity <set|role|message|channel|list> [args]'
    },
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `set`, `role`, `message`, `channel`, `list`')] });

        if (sub === 'set') return this.handleSet(message, args.slice(1), config);
        if (sub === 'role') return this.handleRole(message, args.slice(1), config);
        if (sub === 'message') return this.handleMessage(message, args.slice(1), config);
        if (sub === 'channel') return this.handleChannel(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `set`, `role`, `message`, `channel`, `list`')] });
    },

    async handleSet(message, args, config) {
        const vanity = args.join(' ');
        if (!vanity) return message.reply({ embeds: [errorEmbed('No Vanity', 'Provide the vanity to monitor. Example: `,vanity set /yikes`')] });
        updateGuildConfig(message.guild.id, { vanity: { ...config.vanity, code: vanity } });
        return message.reply({ embeds: [successEmbed('Vanity Set', `Now monitoring \`${vanity}\``)] });
    },

    async handleRole(message, args, config) {
        const action = args[0]?.toLowerCase();
        const role = message.mentions.roles.first();

        if (action === 'add') {
            if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a role to reward.')] });
            const vanity = config.vanity || {};
            if (!vanity.roles) vanity.roles = [];
            if (!vanity.roles.includes(role.id)) vanity.roles.push(role.id);
            updateGuildConfig(message.guild.id, { vanity });
            return message.reply({ embeds: [successEmbed('Role Added', `**${role.name}** will be rewarded for vanity.`)] });
        }

        if (action === 'remove') {
            if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a role to remove.')] });
            const vanity = config.vanity || {};
            vanity.roles = (vanity.roles || []).filter(r => r !== role.id);
            updateGuildConfig(message.guild.id, { vanity });
            return message.reply({ embeds: [successEmbed('Role Removed', `**${role.name}** no longer rewarded.`)] });
        }

        return message.reply({ embeds: [errorEmbed('Usage', ',vanity role <add|remove> @role')] });
    },

    async handleMessage(message, args, config) {
        const code = args.join(' ');
        if (!code) return message.reply({ embeds: [errorEmbed('No Message', 'Provide a message. Use variables like `{user.mention}`.')] });
        updateGuildConfig(message.guild.id, { vanity: { ...config.vanity, message: code } });
        return message.reply({ embeds: [successEmbed('Message Set', 'Vanity award message updated.')] });
    },

    async handleChannel(message, args, config) {
        const action = args[0]?.toLowerCase();
        if (action === 'remove') {
            updateGuildConfig(message.guild.id, { vanity: { ...config.vanity, channelId: null } });
            return message.reply({ embeds: [successEmbed('Channel Removed', 'Vanity message will no longer be sent.')] });
        }
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel or use `remove`.')] });
        updateGuildConfig(message.guild.id, { vanity: { ...config.vanity, channelId: channel.id } });
        return message.reply({ embeds: [successEmbed('Channel Set', `Vanity messages go to ${channel}`)] });
    },

    async handleList(message, config) {
        const vanity = config.vanity || {};
        const roles = (vanity.roles || []).map(id => message.guild.roles.cache.get(id)?.name || id);
        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                title: 'Vanity Configuration',
                fields: [
                    { name: 'Vanity Code', value: vanity.code || 'Not set', inline: true },
                    { name: 'Roles', value: roles.length ? roles.map(r => `\`${r}\``).join(', ') : 'None', inline: true },
                    { name: 'Channel', value: vanity.channelId ? `<#${vanity.channelId}>` : 'Not set', inline: true },
                    { name: 'Message', value: vanity.message || 'Default', inline: false }
                ]
            })]
        });
    }
};
