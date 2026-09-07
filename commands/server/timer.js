const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { parseEmbed, resolve } = require('../../utils/variables');

const timers = new Map();

module.exports = {
    data: {
        name: 'timer',
        description: 'Manage auto messages on an interval',
        usage: ',timer <add|remove|test|list> [args]'
    },
    aliases: ['automessage', 'am'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `test`, `list`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'test') return this.handleTest(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `test`, `list`')] });
    },

    async handleAdd(message, args, config) {
        const channel = message.mentions.channels.first();
        const interval = args[1];
        const code = args.slice(2).join(' ').replace(/<#\d+>/g, '').trim();
        if (!channel || !interval || !code) {
            return message.reply({ embeds: [errorEmbed('Usage', ',timer add #channel <interval like 10m> <embed code>')] });
        }

        const ms = this.parseInterval(interval);
        if (!ms || ms < 300000) {
            return message.reply({ embeds: [errorEmbed('Invalid Interval', 'Minimum interval is 5 minutes (5m).')] });
        }

        const timersList = config.timers || [];
        const existing = timersList.find(t => t.channelId === channel.id);
        if (existing) {
            return message.reply({ embeds: [errorEmbed('Exists', 'This channel already has a timer. Remove it first.')] });
        }

        const timerData = {
            id: Date.now().toString(36),
            channelId: channel.id,
            interval: ms,
            code,
            createdBy: message.author.id
        };

        timersList.push(timerData);
        updateGuildConfig(message.guild.id, { timers: timersList });
        this.startTimer(message.guild, timerData);
        return message.reply({ embeds: [successEmbed('Timer Added', `Sending every **${interval}** to ${channel}`)] });
    },

    async handleRemove(message, args, config) {
        const channel = message.mentions.channels.first();
        if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel.')] });

        const key = `timer_${message.guild.id}_${channel.id}`;
        if (timers.has(key)) {
            clearInterval(timers.get(key));
            timers.delete(key);
        }

        const timersList = (config.timers || []).filter(t => t.channelId !== channel.id);
        updateGuildConfig(message.guild.id, { timers: timersList });
        return message.reply({ embeds: [successEmbed('Timer Removed', `Timer for ${channel} stopped.`)] });
    },

    async handleTest(message, args, config) {
        const channel = message.mentions.channels.first() || message.channel;
        const timer = (config.timers || []).find(t => t.channelId === channel.id);
        if (!timer) return message.reply({ embeds: [errorEmbed('Not Found', `No timer for ${channel}.`)] });

        const ctx = { member: message.member, user: message.author, guild: message.guild, message };
        const parsed = parseEmbed(timer.code, ctx);
        if (parsed) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder();
            if (parsed.color) embed.setColor(parsed.color);
            if (parsed.title) embed.setTitle(parsed.title);
            if (parsed.description) embed.setDescription(parsed.description);
            if (parsed.fields) embed.addFields(parsed.fields);
            await channel.send({ embeds: [embed] }).catch(() => {});
        } else {
            await channel.send({ content: resolve(timer.code, ctx) }).catch(() => {});
        }
        return message.reply({ embeds: [successEmbed('Test Sent', `Test message sent to ${channel}`)] });
    },

    async handleList(message, config) {
        const timersList = config.timers || [];
        if (!timersList.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Auto Messages', description: 'No timers configured.' })] });
        }
        const list = timersList.map((t, i) => `**${i + 1}.** <#${t.channelId}> — every **${this.formatInterval(t.interval)}**`).join('\n');
        return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Auto Messages (${timersList.length})`, description: list })] });
    },

    startTimer(guild, timerData) {
        const key = `timer_${guild.id}_${timerData.channelId}`;
        if (timers.has(key)) clearInterval(timers.get(key));

        const interval = setInterval(async () => {
            try {
                const channel = guild.channels.cache.get(timerData.channelId);
                if (!channel) { clearInterval(interval); timers.delete(key); return; }

                const { getGuildConfig } = require('../../utils/config');
                const config = getGuildConfig(guild.id);
                const { parseEmbed: pe, resolve: r } = require('../../utils/variables');
                const parsed = pe(timerData.code, { guild });
                if (parsed) {
                    const { EmbedBuilder } = require('discord.js');
                    const embed = new EmbedBuilder();
                    if (parsed.color) embed.setColor(parsed.color);
                    if (parsed.title) embed.setTitle(parsed.title);
                    if (parsed.description) embed.setDescription(parsed.description);
                    if (parsed.fields) embed.addFields(parsed.fields);
                    await channel.send({ embeds: [embed] }).catch(() => {});
                } else {
                    await channel.send({ content: r(timerData.code, { guild }) }).catch(() => {});
                }
            } catch {}
        }, timerData.interval);

        timers.set(key, interval);
    },

    parseInterval(str) {
        const match = str.match(/^(\d+)(m|h|d)$/);
        if (!match) return null;
        const units = { m: 60000, h: 3600000, d: 86400000 };
        return parseInt(match[1]) * units[match[2]];
    },

    formatInterval(ms) {
        if (ms >= 86400000) return `${ms / 86400000}d`;
        if (ms >= 3600000) return `${ms / 3600000}h`;
        return `${ms / 60000}m`;
    }
};

module.exports.timers = timers;
