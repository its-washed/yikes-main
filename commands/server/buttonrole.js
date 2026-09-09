const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');

const STYLE_MAP = {
    blue: ButtonStyle.Primary,
    blurple: ButtonStyle.Primary,
    green: ButtonStyle.Success,
    grey: ButtonStyle.Secondary,
    gray: ButtonStyle.Secondary,
    red: ButtonStyle.Danger
};

module.exports = {
    data: {
        name: 'buttonrole',
        description: 'Add role buttons to bot messages',
        usage: ',buttonrole <add|remove|list> [args]'
    },
    aliases: ['br'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands: `add`, `remove`, `list`')] });
    },

    async handleAdd(message, args, config) {
        const msgId = args[0];
        const roleId = args[1];
        const label = args.slice(2, -1).join(' ') || args[2];
        const styleArg = args[args.length - 1];

        if (!msgId || !roleId || !label) {
            return message.reply({ embeds: [errorEmbed('Usage', ',buttonrole add <messageId> <roleId> <label> [style]')] });
        }

        let targetMsg;
        try {
            targetMsg = await message.channel.messages.fetch(msgId);
        } catch {
            return message.reply({ embeds: [errorEmbed('Not Found', 'Could not fetch that message from this channel.')] });
        }

        if (!targetMsg.author.bot) {
            return message.reply({ embeds: [errorEmbed('Bot Only', 'Button roles can only be added to messages sent by the bot.')] });
        }

        const role = message.guild.roles.cache.get(roleId);
        if (!role) {
            return message.reply({ embeds: [errorEmbed('Invalid Role', 'Role not found.')] });
        }

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', 'I can\'t assign a role equal to or higher than my highest role.')] });
        }

        if (role.managed) {
            return message.reply({ embeds: [errorEmbed('Managed Role', 'I can\'t assign managed roles (created by integrations).')] });
        }

        const brConfig = config.buttonRoles || [];
        const existing = brConfig.find(b => b.messageId === msgId);

        if (existing) {
            if (existing.buttons.find(b => b.roleId === roleId)) {
                return message.reply({ embeds: [errorEmbed('Duplicate', 'A button for that role already exists on this message.')] });
            }
            if (existing.buttons.length >= 5) {
                return message.reply({ embeds: [errorEmbed('Limit Reached', 'A message can have at most 5 buttons (Discord limit).')] });
            }
            existing.buttons.push({ roleId, label, style: styleArg || 'blue' });
        } else {
            brConfig.push({
                messageId: msgId,
                channelId: message.channel.id,
                buttons: [{ roleId, label, style: styleArg || 'blue' }]
            });
        }

        updateGuildConfig(message.guild.id, { buttonRoles: brConfig });

        await this.rebuildButtons(message.channel, msgId, brConfig);
        return message.reply({ embeds: [successEmbed('Button Added', `Added **${label}** → ${role} on message \`${msgId}\``)] });
    },

    async handleRemove(message, args, config) {
        const msgId = args[0];
        const roleId = args[1];

        if (!msgId || !roleId) {
            return message.reply({ embeds: [errorEmbed('Usage', ',buttonrole remove <messageId> <roleId>')] });
        }

        const brConfig = config.buttonRoles || [];
        const entry = brConfig.find(b => b.messageId === msgId);
        if (!entry) {
            return message.reply({ embeds: [errorEmbed('Not Found', 'No button roles configured for that message.')] });
        }

        const idx = entry.buttons.findIndex(b => b.roleId === roleId);
        if (idx === -1) {
            return message.reply({ embeds: [errorEmbed('Not Found', 'No button for that role on this message.')] });
        }

        entry.buttons.splice(idx, 1);
        if (entry.buttons.length === 0) {
            const i = brConfig.indexOf(entry);
            brConfig.splice(i, 1);
        }

        updateGuildConfig(message.guild.id, { buttonRoles: brConfig });

        try {
            const channel = message.guild.channels.cache.get(entry.channelId) || message.channel;
            await this.rebuildButtons(channel, msgId, brConfig);
        } catch {}

        return message.reply({ embeds: [successEmbed('Removed', `Button for role \`${roleId}\` removed from message \`${msgId}\`.")] });
    },

    async handleList(message, config) {
        const brConfig = config.buttonRoles || [];
        if (!brConfig.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Button Roles', description: 'No button roles configured.\nUse `,buttonrole add` to create one.' })] });
        }

        const lines = brConfig.map((entry, i) => {
            const btns = entry.buttons.map(b => {
                const role = message.guild.roles.cache.get(b.roleId);
                return role ? `${role}` : `\`${b.roleId}\``;
            }).join(', ');
            return `**${i + 1}.** Message \`${entry.messageId}\` — ${btns}`;
        });

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Button Roles (${brConfig.length} messages)`, description: lines.join('\n') })] });
    },

    async rebuildButtons(channel, msgId, brConfig) {
        try {
            const msg = await channel.messages.fetch(msgId);
            const entry = brConfig.find(b => b.messageId === msgId);

            if (!entry || !entry.buttons.length) {
                await msg.edit({ components: [] });
                return;
            }

            const row = new ActionRowBuilder();
            for (const btn of entry.buttons.slice(0, 5)) {
                const style = STYLE_MAP[btn.style] || ButtonStyle.Primary;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`br_${btn.roleId}`)
                        .setLabel(btn.label)
                        .setStyle(style)
                );
            }

            await msg.edit({ components: [row] });
        } catch {}
    }
};
