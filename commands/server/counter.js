const { ChannelType } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

const COUNTER_TYPES = {
    members: { label: 'Members', fn: (guild) => guild.memberCount },
    humans: { label: 'Humans', fn: (guild) => guild.members.cache.filter(m => !m.user.bot).size },
    bots: { label: 'Bots', fn: (guild) => guild.members.cache.filter(m => m.user.bot).size },
    boosters: { label: 'Boosters', fn: (guild) => guild.members.cache.filter(m => m.premiumSince).size },
    boosts: { label: 'Boosts', fn: (guild) => guild.premiumSubscriptionCount || 0 },
    voice: { label: 'Voice', fn: (guild) => guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).reduce((acc, ch) => acc + ch.members.size, 0) },
    roles: { label: 'Roles', fn: (guild) => guild.roles.cache.size },
    channels: { label: 'Channels', fn: (guild) => guild.channels.cache.size }
};

const CHANNEL_TYPES = {
    voice: ChannelType.GuildVoice,
    text: ChannelType.GuildText,
    category: ChannelType.GuildCategory
};

module.exports = {
    data: {
        name: 'counter',
        description: 'Manage stat counters',
        usage: ',counter <add|remove|list> [args]'
    },
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`, `types`')] });

        if (sub === 'types') {
            const list = Object.entries(COUNTER_TYPES).map(([k, v]) => `\`${k}\` — ${v.label}`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Counter Types', description: list })] });
        }

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`, `types`')] });
    },

    async handleAdd(message, args, config) {
        const type = args[0]?.toLowerCase();
        const channelType = args[1]?.toLowerCase();
        const name = args.slice(2).join(' ');

        if (!type || !channelType || !name) {
            return message.reply({ embeds: [errorEmbed('Usage', ',counter add <type> <channeltype> <name>\nExample: ,counter add humans category {target} humans')] });
        }

        if (!COUNTER_TYPES[type]) return message.reply({ embeds: [errorInvalid('Invalid Type', 'Use `,counter types` to see options.')] });
        if (!CHANNEL_TYPES[channelType]) return message.reply({ embeds: [errorEmbed('Invalid Channel Type', 'Valid: `voice`, `text`, `category`')] });

        try {
            const channel = await message.guild.channels.create({
                name: name.replace('{target}', '0'),
                type: CHANNEL_TYPES[channelType],
                parent: channelType === 'category' ? null : undefined,
                topic: channelType === 'text' ? `Counter: ${type}` : undefined,
                bitrate: channelType === 'voice' ? 64000 : undefined,
                permissionOverwrites: channelType !== 'category' ? [
                    { id: message.guild.id, deny: ['SendMessages', 'Connect'] }
                ] : undefined
            });

            const counters = config.counters || [];
            counters.push({
                type,
                channelId: channel.id,
                channelType,
                name,
                createdBy: message.author.id
            });

            updateGuildConfig(message.guild.id, { counters });
            this.updateCounter(message.guild, counters.find(c => c.channelId === channel.id));
            return message.reply({ embeds: [successEmbed('Counter Created', `**${COUNTER_TYPES[type].label}** counter created in ${channel}`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    },

    async handleRemove(message, args, config) {
        const type = args[0]?.toLowerCase();
        if (!type) return message.reply({ embeds: [errorEmbed('Usage', ',counter remove <type>')] });

        const counters = config.counters || [];
        const idx = counters.findIndex(c => c.type === type);
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', `No counter of type \`${type}\`.`)] });

        const counter = counters[idx];
        try {
            const ch = message.guild.channels.cache.get(counter.channelId);
            if (ch) await ch.delete();
        } catch {}

        counters.splice(idx, 1);
        updateGuildConfig(message.guild.id, { counters });
        return message.reply({ embeds: [successEmbed('Removed', `Counter \`${type}\` deleted.`)] });
    },

    async handleList(message, config) {
        const counters = config.counters || [];
        if (!counters.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Counters', description: 'No counters configured.\nUse `,counter add <type> <channeltype> <name>` to create one.' })] });
        }

        const list = counters.map(c => {
            const info = COUNTER_TYPES[c.type];
            return `**${info?.label || c.type}** → <#${c.channelId}> (${c.channelType})`;
        }).join('\n');

        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Counters (${counters.length})`, description: list })] });
    },

    async updateCounter(guild, counter) {
        if (!counter) return;
        const info = COUNTER_TYPES[counter.type];
        if (!info) return;
        const count = info.fn(guild);
        const channel = guild.channels.cache.get(counter.channelId);
        if (!channel) return;

        const newName = counter.name.replace('{target}', count.toString());
        if (channel.name !== newName) {
            channel.setName(newName).catch(() => {});
        }
    }
};

module.exports.COUNTER_TYPES = COUNTER_TYPES;
