const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'autoreact',
        description: 'Manage automatic reactions on messages',
        usage: ',autoreact <add|remove|list|channel|reset> [args]'
    },
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`, `channel`, `reset`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);
        if (sub === 'channel') return this.handleChannel(message, args.slice(1), config);
        if (sub === 'reset') return this.handleReset(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`, `channel`, `reset`')] });
    },

    async handleAdd(message, args, config) {
        const parts = args.join(' ').split(',').map(s => s.trim());
        if (parts.length < 2) {
            return message.reply({ embeds: [errorEmbed('Usage', ',autoreact add <trigger>, <emoji1> [emoji2] ...')] });
        }

        const trigger = parts[0];
        const emojis = parts.slice(1).filter(e => e);

        if (!trigger || !emojis.length) {
            return message.reply({ embeds: [errorEmbed('Usage', ',autoreact add <trigger>, <emoji1> [emoji2] ...')] });
        }

        const triggers = config.autoReactTriggers || [];
        const existing = triggers.find(t => t.trigger.toLowerCase() === trigger.toLowerCase());
        if (existing) {
            return message.reply({ embeds: [errorEmbed('Exists', `Trigger \`${trigger}\` already exists. Remove it first.`)] });
        }

        triggers.push({ trigger, emojis, createdBy: message.author.id });
        updateGuildConfig(message.guild.id, { autoReactTriggers: triggers });
        return message.reply({ embeds: [successEmbed('Trigger Added', `When someone says **${trigger}**, bot reacts with ${emojis.join(' ')}`)] });
    },

    async handleRemove(message, args, config) {
        const trigger = args.join(' ');
        if (!trigger) return message.reply({ embeds: [errorEmbed('Usage', ',autoreact remove <trigger>')] });

        const triggers = config.autoReactTriggers || [];
        const idx = triggers.findIndex(t => t.trigger.toLowerCase() === trigger.toLowerCase());
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'No trigger with that text.')] });

        triggers.splice(idx, 1);
        updateGuildConfig(message.guild.id, { autoReactTriggers: triggers });
        return message.reply({ embeds: [successEmbed('Removed', `Trigger \`${trigger}\` deleted.`)] });
    },

    async handleList(message, config) {
        const triggers = config.autoReactTriggers || [];
        if (!triggers.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Reaction Triggers', description: 'No triggers configured.\nUse `,autoreact add <trigger>, <emoji>` to create one.' })] });
        }

        const pages = [];
        for (let i = 0; i < triggers.length; i += 8) {
            const chunk = triggers.slice(i, i + 8);
            pages.push({
                color: 0x6c5ce7,
                title: `Reaction Triggers (${triggers.length})`,
                description: chunk.map((t, j) => `**${i + j + 1}.** \`${t.trigger}\` → ${t.emojis.join(' ')}`).join('\n')
            });
        }

        return new Paginator(pages, { userId: message.author.id }).start(message.channel);
    },

    async handleChannel(message, args, config) {
        const action = args[0]?.toLowerCase();
        const channel = message.mentions.channels.first();

        if (action === 'add') {
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel.')] });
            const emojis = args.slice(1).filter(e => e && e !== channel.toString());
            if (!emojis.length) return message.reply({ embeds: [errorEmbed('No Emojis', 'Provide emojis to react with.')] });

            const channelReacts = config.autoReactChannels || {};
            channelReacts[channel.id] = emojis;
            updateGuildConfig(message.guild.id, { autoReactChannels: channelReacts });
            return message.reply({ embeds: [successEmbed('Channel Added', `${channel} will get reactions: ${emojis.join(' ')}`)] });
        }

        if (action === 'remove') {
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel.')] });
            const channelReacts = config.autoReactChannels || {};
            delete channelReacts[channel.id];
            updateGuildConfig(message.guild.id, { autoReactChannels: channelReacts });
            return message.reply({ embeds: [successEmbed('Channel Removed', `${channel} no longer gets auto reactions.`)] });
        }

        if (action === 'list') {
            const channelReacts = config.autoReactChannels || {};
            const entries = Object.entries(channelReacts);
            if (!entries.length) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Channel Reactions', description: 'No channels configured.' })] });
            }
            const list = entries.map(([id, emojis]) => `<#${id}> → ${emojis.join(' ')}`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Channel Reactions', description: list })] });
        }

        return message.reply({ embeds: [errorEmbed('Usage', ',autoreact channel <add|remove|list> #channel [emojis]')] });
    },

    async handleReset(message, config) {
        updateGuildConfig(message.guild.id, { autoReactTriggers: [], autoReactChannels: {} });
        return message.reply({ embeds: [successEmbed('Reset', 'All reaction triggers cleared.')] });
    }
};
