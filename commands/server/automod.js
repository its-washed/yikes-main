const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'automod',
        description: 'Configure auto-moderation',
        usage: ',automod <enable|disable|words|links|spam|config> [args]'
    },
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `enable`, `disable`, `words`, `links`, `spam`, `config`')] });

        if (sub === 'enable') {
            updateGuildConfig(message.guild.id, { automod: { ...config.automod, enabled: true } });
            return message.reply({ embeds: [successEmbed('AutoMod Enabled', 'Auto-moderation is now active.')] });
        }

        if (sub === 'disable') {
            updateGuildConfig(message.guild.id, { automod: { ...config.automod, enabled: false } });
            return message.reply({ embeds: [successEmbed('AutoMod Disabled', 'Auto-moderation turned off.')] });
        }

        if (sub === 'words') {
            const word = args[1];
            const action = args[2]?.toLowerCase();
            if (!word) return message.reply({ embeds: [errorEmbed('Usage', ',automod words <add|remove|list> [word]')] });

            if (action === 'add') {
                const w = args.slice(3).join(' ');
                if (!w) return message.reply({ embeds: [errorEmbed('No Word', 'Specify a word to block.')] });
                const words = config.automod?.words || [];
                if (!words.includes(w.toLowerCase())) words.push(w.toLowerCase());
                updateGuildConfig(message.guild.id, { automod: { ...config.automod, words } });
                return message.reply({ embeds: [successEmbed('Word Blocked', `\`${w}\` added to blocklist.`)] });
            }

            if (action === 'remove') {
                const w = args.slice(3).join(' ');
                const words = (config.automod?.words || []).filter(x => x !== w.toLowerCase());
                updateGuildConfig(message.guild.id, { automod: { ...config.automod, words } });
                return message.reply({ embeds: [successEmbed('Word Removed', `\`${w}\` removed from blocklist.`)] });
            }

            if (action === 'list') {
                const words = config.automod?.words || [];
                if (words.length === 0) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Blocked Words', description: 'No words blocked.' })] });
                const pages = [];
                for (let i = 0; i < words.length; i += 15) {
                    pages.push({
                        color: 0x6c5ce7,
                        title: `Blocked Words (${words.length})`,
                        description: words.slice(i, i + 15).map(w => `\`${w}\``).join(', ')
                    });
                }
                return new Paginator(pages, { userId: message.author.id }).start(message.channel);
            }
        }

        if (sub === 'links') {
            const enabled = args[1]?.toLowerCase() !== 'disable';
            updateGuildConfig(message.guild.id, { automod: { ...config.automod, links: enabled } });
            return message.reply({ embeds: [successEmbed('Links', `Link blocking ${enabled ? 'enabled' : 'disabled'}.`)] });
        }

        if (sub === 'spam') {
            const threshold = parseInt(args[1]) || 5;
            const interval = parseInt(args[2]) || 10;
            updateGuildConfig(message.guild.id, { automod: { ...config.automod, spam: { threshold, interval } } });
            return message.reply({ embeds: [successEmbed('Spam Config', `Threshold: ${threshold} messages in ${interval}s.`)] });
        }

        if (sub === 'config') {
            const am = config.automod || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'AutoMod Configuration',
                    fields: [
                        { name: 'Enabled', value: am.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Links', value: am.links ? 'Blocked' : 'Allowed', inline: true },
                        { name: 'Spam', value: am.spam ? `${am.spam.threshold} msgs / ${am.spam.interval}s` : 'Disabled', inline: true },
                        { name: 'Blocked Words', value: `${(am.words || []).length} word(s)`, inline: true }
                    ]
                })]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    }
};
