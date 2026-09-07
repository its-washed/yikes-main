const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: { name: 'twitter', description: 'Track Twitter notifications', usage: ',twitter <add|remove|list> [args]' },
    cooldown: 5,
    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`')] });

        if (sub === 'add') {
            const user = args[1]; const ch = message.mentions.channels.first();
            if (!user || !ch) return message.reply({ embeds: [errorEmbed('Usage', ',twitter add <username> #channel')] });
            const feeds = config.twitterFeeds || [];
            if (feeds.find(f => f.username.toLowerCase() === user.toLowerCase())) return message.reply({ embeds: [errorEmbed('Exists', 'Already tracking that user.')] });
            feeds.push({ username: user, channelId: ch.id, createdBy: message.author.id });
            updateGuildConfig(message.guild.id, { twitterFeeds: feeds });
            return message.reply({ embeds: [successEmbed('Added', `Tracking **${user}** → ${ch}`)] });
        }
        if (sub === 'remove') {
            const user = args[1]; if (!user) return message.reply({ embeds: [errorEmbed('Usage', ',twitter remove <username>')] });
            const feeds = config.twitterFeeds || []; const idx = feeds.findIndex(f => f.username.toLowerCase() === user.toLowerCase());
            if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'Not tracking that user.')] });
            feeds.splice(idx, 1); updateGuildConfig(message.guild.id, { twitterFeeds: feeds });
            return message.reply({ embeds: [successEmbed('Removed', `Stopped tracking **${user}**.`)] });
        }
        if (sub === 'list') {
            const feeds = config.twitterFeeds || [];
            if (!feeds.length) return message.reply({ embeds: [createEmbed({ color: 0x000000, title: 'Twitter Feeds', description: 'None configured.\nUse `,twitter add <username> #channel`.' })] });
            const pages = []; for (let i = 0; i < feeds.length; i += 8) { pages.push({ color: 0x000000, title: `Twitter Feeds (${feeds.length})`, description: feeds.slice(i, i + 8).map((f, j) => `**${i + j + 1}.** \`${f.username}\` → <#${f.channelId}>`).join('\n') }); }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }
        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`')] });
    }
};
