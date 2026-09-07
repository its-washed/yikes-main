const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: { name: 'instagram', description: 'Track Instagram notifications', usage: ',instagram <add|remove|list> [args]' },
    cooldown: 5,
    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`')] });

        if (sub === 'add') {
            const user = args[1]; const ch = message.mentions.channels.first();
            if (!user || !ch) return message.reply({ embeds: [errorEmbed('Usage', ',instagram add <username> #channel')] });
            const feeds = config.instagramFeeds || [];
            if (feeds.find(f => f.username.toLowerCase() === user.toLowerCase())) return message.reply({ embeds: [errorEmbed('Exists', 'Already tracking that user.')] });
            feeds.push({ username: user, channelId: ch.id, createdBy: message.author.id });
            updateGuildConfig(message.guild.id, { instagramFeeds: feeds });
            return message.reply({ embeds: [successEmbed('Added', `Tracking **${user}** → ${ch}`)] });
        }
        if (sub === 'remove') {
            const user = args[1]; if (!user) return message.reply({ embeds: [errorEmbed('Usage', ',instagram remove <username>')] });
            const feeds = config.instagramFeeds || []; const idx = feeds.findIndex(f => f.username.toLowerCase() === user.toLowerCase());
            if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'Not tracking that user.')] });
            feeds.splice(idx, 1); updateGuildConfig(message.guild.id, { instagramFeeds: feeds });
            return message.reply({ embeds: [successEmbed('Removed', `Stopped tracking **${user}**.`)] });
        }
        if (sub === 'list') {
            const feeds = config.instagramFeeds || [];
            if (!feeds.length) return message.reply({ embeds: [createEmbed({ color: 0xe1306c, title: 'Instagram Feeds', description: 'None configured.\nUse `,instagram add <username> #channel`.' })] });
            const pages = []; for (let i = 0; i < feeds.length; i += 8) { pages.push({ color: 0xe1306c, title: `Instagram Feeds (${feeds.length})`, description: feeds.slice(i, i + 8).map((f, j) => `**${i + j + 1}.** \`${f.username}\` → <#${f.channelId}>`).join('\n') }); }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }
        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`')] });
    }
};
