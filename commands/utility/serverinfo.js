const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { warn } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { PRESERVE } = require('../../utils/embeds');

const n = value => Number(value || 0).toLocaleString('en-US');

async function resolveTarget(message, value) {
    if (!value) return { guild: message.guild, embed: null, invite: null };
    const server = String(value).trim();

    let invite = null;
    let guild = null;
    let embed = null;

    if (!/^[a-zA-Z0-9-_]+$/.test(server)) return { error: 'The invite code contains invalid characters.' };

    invite = await message.client.fetchInvite(server).catch(() => null);
    if (invite) {
        guild = invite.guild;
        embed = {
            color: COLORS.NEUTRAL,
            title: `Invite code: ${invite.code}`,
            description: (guild && guild.description) || '',
            thumbnail: guild && guild.iconURL() ? { url: guild.iconURL({ size: 256 }) } : undefined,
            fields: [
                {
                    name: 'Invite',
                    value: `>>> **Channel:** ${invite.channel ? `${invite.channel.name} (${invite.channel.type})` : 'Unknown'}\n**ID:** \`${invite.channel ? invite.channel.id : 'unknown'}\`\n**Expires:** ${invite.expiresAt ? `yes` : 'no'}\n**Uses:** ${invite.uses === null || invite.uses === undefined ? 'unknown' : invite.uses}`
                },
                {
                    name: 'Server',
                    value: `>>> **Name:** ${guild ? guild.name : 'Unknown'}\n**ID:** \`${guild ? guild.id : 'unknown'}\`\n**Members:** ${invite.approximateMemberCount ? n(invite.approximateMemberCount) : 0}\n**Created**: ${guild ? `<t:${Math.floor((guild.createdTimestamp || 0) / 1000)}:R>` : 'N/A'}`
                }
            ]
        };
    }

    if (!guild) {
        if (/^\d{17,20}$/.test(server)) guild = message.client.guilds.cache.get(server) || null;
        if (!guild) return { error: 'Bot is not in this **server** or the **invite** is invalid' };
        embed = null;
    }

    const fullGuild = (guild && guild.id && message.client.guilds.cache.get(guild.id)) || guild;
    return { guild: fullGuild || message.guild, embed, invite };
}

module.exports = {
    data: { name: 'serverinfo', description: "View information about a server", usage: ',serverinfo [server]' },
    aliases: ['si'],
    cooldown: 5,

    async execute(message, args, client) {
        const target = await resolveTarget(message, args.join(' '));
        if (target.error) return warn(message, target.error);

        const guild = target.guild;
        let embed = target.embed;

        if (guild && !embed) {
            if (guild.members.cache.size < guild.memberCount) await guild.members.fetch().catch(() => {});
            const servers = [...(client ? client.guilds.cache.values() : [])].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
            const owner = guild.members.cache.get(guild.ownerId) || null;

            embed = {
                color: COLORS.NEUTRAL,
                title: guild.name,
                description: `${guild.description || ''}\n\nCreated on <t:${Math.floor(guild.createdTimestamp / 1000)}:D> <t:${Math.floor(guild.createdTimestamp / 1000)}:R>\nJoined on ${guild.members.me && guild.members.me.joinedTimestamp ? `<t:${Math.floor(guild.members.me.joinedTimestamp / 1000)}:D> <t:${Math.floor(guild.members.me.joinedTimestamp / 1000)}:R>` : 'N/A'}`,
                author: owner
                    ? { name: `${owner.user.username} (${owner.id})`, icon_url: owner.user.displayAvatarURL() }
                    : { name: 'Unknown Owner' },
                thumbnail: guild.iconURL() ? { url: guild.iconURL({ size: 256 }) } : undefined,
                fields: [
                    { name: 'Counts', value: `>>> **Roles:** ${n(guild.roles.cache.size)}\n**Emojis:** ${n(guild.emojis.cache.size)}\n**Stickers:** ${n(guild.stickers.cache.size)}` },
                    { name: 'Members', value: `>>> **Users:** ${n(guild.members.cache.filter(m => !m.user.bot).size)}\n**Bots:** ${n(guild.members.cache.filter(m => m.user.bot).size)}\n**Total:** ${n(guild.memberCount)}` },
                    { name: 'Channels', value: `>>> **Text:** ${n(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).size)}\n**Voice:** ${n(guild.channels.cache.filter(c => c.type === 2).size)}\n**Categories:** ${n(guild.channels.cache.filter(c => c.type === 4).size)}` },
                    { name: 'Info', value: `>>> **Vanity:** ${guild.vanityURLCode || 'N/A'}\n**Popularity:** ${servers.findIndex(g => g.id === guild.id) + 1}/${servers.length}\n**Owner:** ${owner ? `${owner}` : 'Unknown Owner'}` },
                    { name: 'Boost', value: `>>> **Boosts:** ${n(guild.premiumSubscriptionCount)}\n**Level:** ${guild.premiumTier}\n**Boosters:** ${n(guild.members.cache.filter(m => m.premiumSince).size)}` }
                ],
                footer: { text: `Guild ID: ${guild.id} • Shard: ${guild.shardId || 0}/${client && client.ws ? Math.max(client.ws.shards.size, 1) : 1}` }
            };
        }

        const row = new ActionRowBuilder();
        if (guild.iconURL()) row.addComponents(new ButtonBuilder().setLabel('Icon').setStyle(ButtonStyle.Link).setURL(guild.iconURL({ size: 1024 })));
        if (guild.bannerURL()) row.addComponents(new ButtonBuilder().setLabel('Banner').setStyle(ButtonStyle.Link).setURL(guild.bannerURL({ size: 1024 })));
        if (guild.splashURL()) row.addComponents(new ButtonBuilder().setLabel('Splash').setStyle(ButtonStyle.Link).setURL(guild.splashURL({ size: 1024 })));
        if (guild.vanityURLCode) row.addComponents(new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(`https://discord.gg/${guild.vanityURLCode}`));
        else if (target.invite) row.addComponents(new ButtonBuilder().setLabel('Invite').setStyle(ButtonStyle.Link).setURL(target.invite.url));

        const components = row.components.length ? [row] : [];
        return message.reply({ embeds: [embed], components, [PRESERVE]: true });
    }
};
