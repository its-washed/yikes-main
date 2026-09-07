const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { parseEmbed } = require('../../utils/variables');

module.exports = {
    data: {
        name: 'buttonmessage',
        description: 'Create button responses on messages',
        usage: ',buttonmessage <add|edit|remove|clear|list> [args]'
    },
    aliases: ['bm'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `edit`, `remove`, `clear`, `list`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'edit') return this.handleEdit(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'clear') return this.handleClear(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    },

    async handleAdd(message, args, config) {
        const msgId = args[0];
        const label = args[1];
        const emoji = args[2];
        const color = args[3];
        const embedCode = args.slice(4).join(' ');
        if (!msgId || !label) {
            return message.reply({ embeds: [errorEmbed('Usage', ',buttonmessage add <messageId> <label> [emoji] [color] [embed code]')] });
        }

        let targetMsg;
        try {
            targetMsg = await message.channel.messages.fetch(msgId);
        } catch {
            return message.reply({ embeds: [errorEmbed('Not Found', 'Could not fetch that message.')] });
        }

        const btnData = {
            id: Date.now().toString(36),
            label: label === 'none' ? null : label,
            emoji: emoji === 'none' ? null : emoji,
            color: color || 'blue',
            response: embedCode || null,
            messageId: msgId,
            createdBy: message.author.id
        };

        const bmConfig = config.buttonMessages || [];
        bmConfig.push(btnData);
        updateGuildConfig(message.guild.id, { buttonMessages: bmConfig });

        await this.rebuildButtons(message.channel, msgId, bmConfig);
        return message.reply({ embeds: [successEmbed('Button Added', `Label: **${label}** | ID: \`${btnData.id}\``)] });
    },

    async handleEdit(message, args, config) {
        const btnId = args[0];
        const embedCode = args.slice(1).join(' ');
        if (!btnId || !embedCode) {
            return message.reply({ embeds: [errorEmbed('Usage', ',buttonmessage edit <buttonId> <embed code>')] });
        }

        const bmConfig = config.buttonMessages || [];
        const btn = bmConfig.find(b => b.id === btnId);
        if (!btn) return message.reply({ embeds: [errorEmbed('Not Found', 'No button with that ID.')] });

        btn.response = embedCode;
        updateGuildConfig(message.guild.id, { buttonMessages: bmConfig });

        await this.rebuildButtons(message.channel, btn.messageId, bmConfig);
        return message.reply({ embeds: [successEmbed('Edited', 'Button response updated.')] });
    },

    async handleRemove(message, args, config) {
        const btnId = args[0];
        if (!btnId) return message.reply({ embeds: [errorEmbed('Usage', ',buttonmessage remove <buttonId>')] });

        const bmConfig = config.buttonMessages || [];
        const idx = bmConfig.findIndex(b => b.id === btnId);
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'No button with that ID.')] });

        const msgId = bmConfig[idx].messageId;
        bmConfig.splice(idx, 1);
        updateGuildConfig(message.guild.id, { buttonMessages: bmConfig });

        await this.rebuildButtons(message.channel, msgId, bmConfig);
        return message.reply({ embeds: [successEmbed('Removed', 'Button deleted.')] });
    },

    async handleClear(message, args, config) {
        const msgId = args[0];
        if (!msgId) return message.reply({ embeds: [errorEmbed('Usage', ',buttonmessage clear <messageId>')] });

        const bmConfig = (config.buttonMessages || []).filter(b => b.messageId !== msgId);
        updateGuildConfig(message.guild.id, { buttonMessages: bmConfig });

        try {
            const targetMsg = await message.channel.messages.fetch(msgId);
            await targetMsg.edit({ components: [] });
        } catch {}
        return message.reply({ embeds: [successEmbed('Cleared', 'All buttons removed from that message.')] });
    },

    async handleList(message, config) {
        const bmConfig = config.buttonMessages || [];
        if (!bmConfig.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Button Messages', description: 'No button messages configured.' })] });
        }

        const list = bmConfig.map(b => `**${b.id}** — \`${b.label}\` on \`${b.messageId}\``).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Button Messages (${bmConfig.length})`, description: list })] });
    },

    async rebuildButtons(channel, msgId, bmConfig) {
        try {
            const msg = await channel.messages.fetch(msgId);
            const btns = bmConfig.filter(b => b.messageId === msgId);
            if (!btns.length) { await msg.edit({ components: [] }); return; }

            const row = new ActionRowBuilder();
            for (const btn of btns.slice(0, 5)) {
                const style = { blue: ButtonStyle.Primary, green: ButtonStyle.Success, grey: ButtonStyle.Secondary, red: ButtonStyle.Danger }[btn.color] || ButtonStyle.Primary;
                const b = new ButtonBuilder().setCustomId(`bm_${btn.id}`).setStyle(style);
                if (btn.label) b.setLabel(btn.label);
                if (btn.emoji) b.setEmoji(btn.emoji);
                row.addComponents(b);
            }

            const existing = msg.components.length > 0 ? msg.components[0] : null;
            await msg.edit({ components: [row] });
        } catch {}
    }
};
