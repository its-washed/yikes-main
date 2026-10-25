const { createEmbed } = require('../../utils/embeds');

const DIV = '─'.repeat(46);
const VERIFICATION = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Highest' };
const EXPLICIT = { 0: 'Disabled', 1: 'Members Without Roles', 2: 'All Members' };
const EMOJI_CAPS = [50, 100, 150, 250];
const STICKER_CAPS = [5, 10, 15, 30];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

module.exports = {
    data: { name: 'serverinfo', description: 'Server info', usage: ',serverinfo' },
    aliases: ['si'],
    cooldown: 5,

    async execute(message, args, client) {
        const g = message.guild;
        const bot = client || message.client;

        if (g.members.cache.size < g.memberCount) {
            await g.members.fetch().catch(() => {});
        }

        let ownerMember = g.members.cache.get(g.ownerId) || null;
        if (!ownerMember) ownerMember = await g.members.fetch(g.ownerId).catch(() => null);
        const ownerUser = ownerMember?.user || await bot.users.fetch(g.ownerId).catch(() => null);

        const bots = g.members.cache.filter(m => m.user.bot).size;
        const humans = Math.max(0, g.memberCount - bots);

        const textChannels = g.channels.cache.filter(c => c.type === 0 || c.type === 5).size;
        const voiceChannels = g.channels.cache.filter(c => c.type === 2).size;
        const roleTotal = g.roles.cache.size;
        const admins = g.roles.cache.filter(r => r.permissions.has('Administrator')).size;
        const others = Math.max(0, roleTotal - admins);

        const tier = g.premiumTier ?? 0;
        const boosts = g.premiumSubscriptionCount || 0;

        const created = g.createdAt instanceof Date ? g.createdAt : new Date(g.createdTimestamp);
        const hour24 = created.getHours();
        const ampm = hour24 >= 12 ? 'PM' : 'AM';
        const hour = hour24 % 12 || 12;
        const dateStr = `${MONTHS[created.getMonth()]} ${created.getDate()}, ${created.getFullYear()} at ${hour}:${String(created.getMinutes()).padStart(2, '0')} ${ampm}`;

        const ownerName = ownerMember?.displayName || ownerUser?.username || 'Unknown';
        const ownerUsername = ownerUser?.username || '';
        const shardId = bot?.shard?.ids?.[0] ?? 0;

        return message.reply({
            embeds: [createEmbed({
                color: 0x6c5ce7,
                author: ownerUser
                    ? { name: ownerUsername, iconURL: ownerUser.displayAvatarURL({ size: 64 }) }
                    : { name: g.name },
                title: g.name,
                description: `Created on **${dateStr}**`,
                fields: [
                    {
                        name: `${DIV}\n👑 Server Owner`,
                        value: `@ **${ownerName}**${ownerUsername ? ` (${ownerUsername})` : ''}\n${DIV}`,
                        inline: false
                    },
                    {
                        name: `👥 Members (${g.memberCount})`,
                        value: `Humans: **${humans}**\n🤖 Bots: **${bots}**\n${DIV}`,
                        inline: true
                    },
                    {
                        name: `# Channels (${g.channels.cache.size})`,
                        value: `# Text: **${textChannels}**\n🔊 Voice: **${voiceChannels}**\n${DIV}`,
                        inline: true
                    },
                    {
                        name: `🏷 Roles (${roleTotal})`,
                        value: `Admins: **${admins}**\nOthers: **${others}**\n${DIV}`,
                        inline: true
                    },
                    {
                        name: `${DIV}\nℹ Boosting Info`,
                        value: `💎 Boosts: **${boosts}** (${boosts === 0 ? 'No boosters' : boosts === 1 ? '1 booster' : `${boosts} boosters`})\n📊 Level: **${tier}**\n🔗 Vanity: **${g.vanityURLCode || 'N/A'}**`,
                        inline: false
                    },
                    {
                        name: `${DIV}\n🛡 Safety`,
                        value: `Verification: **${VERIFICATION[g.verificationLevel] ?? g.verificationLevel}**\nExplicit Filter: **${EXPLICIT[g.explicitContentFilter] ?? g.explicitContentFilter}**`,
                        inline: false
                    },
                    {
                        name: `${DIV}\n📊 Counters`,
                        value: `😀 Emojis: **${g.emojis.cache.size}/${EMOJI_CAPS[tier] ?? 50}**\n🏷 Stickers: **${g.stickers.cache.size}/${STICKER_CAPS[tier] ?? 5}**`,
                        inline: false
                    }
                ],
                footer: { text: `${g.id} • Shard ${shardId} • ${g.preferredLocale || 'en-US'}` },
                timestamp: false
            })]
        });
    }
};
