const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { parseEmbed } = require('../../utils/variables');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'systemmessage',
        description: 'Manage system messages (welcome, goodbye, boost, joindm)',
        usage: ',systemmessage <welcome|goodbye|boost|joindm> <add|remove|list|test> [args]'
    },
    aliases: ['sm', 'sysmsg'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const type = args[0]?.toLowerCase();
        if (!type || !['welcome', 'goodbye', 'boost', 'joindm'].includes(type)) {
            return message.reply({ embeds: [errorEmbed('Types', 'Valid: `welcome`, `goodbye`, `boost`, `joindm`')] });
        }

        const sub = args[1]?.toLowerCase();
        if (!sub || !['add', 'remove', 'list', 'test'].includes(sub)) {
            return message.reply({ embeds: [errorEmbed('Actions', 'Valid: `add`, `remove`, `list`, `test`')] });
        }

        if (sub === 'add') {
            const channel = message.mentions.channels.first();
            const code = args.slice(2).join(' ').replace(/<#\d+>/g, '').trim();
            if (!channel || !code) {
                return message.reply({ embeds: [errorEmbed('Usage', `,systemmessage ${type} add #channel <embed code or text>`)] });
            }

            const msgs = config[`${type}Messages`] || [];
            msgs.push({ channelId: channel.id, code, createdBy: message.author.id, createdAt: Date.now() });
            updateGuildConfig(message.guild.id, { [`${type}Messages`]: msgs });
            return message.reply({ embeds: [successEmbed(`${type} Added`, `Set ${type} message for ${channel}`)] });
        }

        if (sub === 'remove') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel to remove.')] });

            const key = `${type}Messages`;
            const msgs = (config[key] || []).filter(m => m.channelId !== channel.id);
            updateGuildConfig(message.guild.id, { [key]: msgs });
            return message.reply({ embeds: [successEmbed(`${type} Removed`, `Removed ${type} message for ${channel}`)] });
        }

        if (sub === 'list') {
            const msgs = config[`${type}Messages`] || [];
            if (!msgs.length) {
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${type} Messages`, description: `No ${type} messages configured.` })] });
            }
            const list = msgs.map((m, i) => `**${i + 1}.** <#${m.channelId}>`).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `${type} Messages (${msgs.length})`, description: list })] });
        }

        if (sub === 'test') {
            const channel = message.mentions.channels.first() || message.channel;
            const msgs = config[`${type}Messages`] || [];
            const msg = msgs.find(m => m.channelId === channel.id);
            if (!msg) return message.reply({ embeds: [errorEmbed('Not Found', `No ${type} message for ${channel}.`)] });

            const ctx = { member: message.member, user: message.author, guild: message.guild, message };
            const parsed = parseEmbed(msg.code, ctx);
            if (parsed) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder();
                if (parsed.color) embed.setColor(parsed.color);
                if (parsed.title) embed.setTitle(parsed.title);
                if (parsed.description) embed.setDescription(parsed.description);
                if (parsed.fields) embed.addFields(parsed.fields);
                if (parsed.thumbnail) embed.setThumbnail(parsed.thumbnail.url);
                if (parsed.image) embed.setImage(parsed.image.url);
                await channel.send({ embeds: [embed] }).catch(() => {});
            } else {
                const { resolve } = require('../../utils/variables');
                await channel.send({ content: resolve(msg.code, ctx) }).catch(() => {});
            }
            return message.reply({ embeds: [successEmbed('Test Sent', `Test message sent to ${channel}`)] });
        }
    }
};
