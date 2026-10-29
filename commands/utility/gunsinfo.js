const { first } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { getJson } = require('../../utils/social');
const { createEmbed, COLORS } = require('../../utils/embeds');
const { EMOJIS, ICONS } = require('../../utils/styles');
const { sendCard } = require('../../utils/helpCard');

const BADGE_EMOJIS = {
    bughunter: EMOJIS.GUNS_BUGHUNTER,
    donor: EMOJIS.GUNS_DONOR,
    imagehost_access: EMOJIS.GUNS_IMAGEHOST_ACCESS,
    og: EMOJIS.GUNS_OG,
    premium: EMOJIS.GUNS_PREMIUM,
    server_booster: EMOJIS.GUNS_SERVER_BOOSTER,
    staff: EMOJIS.GUNS_STAFF,
    verified: EMOJIS.GUNS_VERIFIED,
    christmas_2024: EMOJIS.GUNS_CHRISTMAS_2024,
    winner: EMOJIS.GUNS_WINNER,
    second: EMOJIS.GUNS_SECOND,
    third: EMOJIS.GUNS_THIRD
};

function boolIcon(value) {
    if (value === true) return EMOJIS.APPROVE;
    if (value === false) return EMOJIS.DENY;
    if (value === undefined || value === null || value === '' || value === 'none') return EMOJIS.DENY;
    return value;
}

function cap(value) {
    const text = String(value);
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function customizePages(data) {
    const cfg = data.config || {};
    const effects = cfg.background_effects === 'night' ? 'Night Time'
        : cfg.background_effects === 'blured' ? 'Blured Background'
        : cfg.background_effects === 'tv' ? 'Old TV'
        : cfg.background_effects === 'none' ? EMOJIS.DENY : (cfg.background_effects || EMOJIS.DENY);
    const usernameEffects = cfg.username_effects === 'none' ? EMOJIS.DENY : (cfg.username_effects || EMOJIS.DENY);

    const general = createEmbed({
        title: 'Customize Profile',
        color: COLORS.NEUTRAL,
        description: '> [General Customization](https://guns.lol/customize)',
        fields: [
            { name: 'Description', value: String(cfg.description || EMOJIS.DENY), inline: true },
            { name: 'Profile Opacity', value: `${cfg.opacity !== undefined ? cfg.opacity : EMOJIS.DENY}%`, inline: true },
            { name: 'Profile Blur', value: `${cfg.blur !== undefined ? cfg.blur : EMOJIS.DENY}%`, inline: true },
            { name: 'Background Effects', value: cap(effects), inline: true },
            { name: 'Username Effects', value: cap(usernameEffects), inline: true },
            { name: 'Swap Colors', value: boolIcon(cfg.swap_colors), inline: true },
            { name: 'Social Glow', value: boolIcon(cfg.social_glow), inline: true },
            { name: 'Username Glow', value: boolIcon(cfg.username_glow), inline: true },
            { name: 'Badge Glow', value: boolIcon(cfg.badge_glow), inline: true }
        ],
        footer: { text: 'Page 1/3 (3 entries)' }
    });

    const colorPage = createEmbed({
        title: 'Customize Profile',
        color: COLORS.NEUTRAL,
        description: '> [Color Customization](https://guns.lol/customize)',
        fields: [
            { name: 'Color', value: String(cfg.color || EMOJIS.DENY), inline: true },
            { name: 'Text Color', value: String(cfg.text_color || EMOJIS.DENY), inline: true },
            { name: 'Background Color', value: String(cfg.bg_color || EMOJIS.DENY), inline: true },
            { name: 'Icon Color', value: String(cfg.icon_color || EMOJIS.DENY), inline: true },
            { name: '​', value: '​', inline: true },
            { name: '​', value: '​', inline: true },
            { name: 'Profile Gradient', value: boolIcon(cfg.profile_gradient), inline: true },
            { name: 'Gradient 1', value: String(cfg.gradient_1 || EMOJIS.DENY), inline: true },
            { name: 'Gradient 2', value: String(cfg.gradient_2 || EMOJIS.DENY), inline: true }
        ],
        footer: { text: 'Page 2/3 (3 entries)' }
    });

    const other = createEmbed({
        title: 'Customize Profile',
        color: COLORS.NEUTRAL,
        description: '> [Other Customization](https://guns.lol/customize)',
        fields: [
            { name: 'Monochrome', value: boolIcon(cfg.monochrome), inline: true },
            { name: 'Animated Title', value: boolIcon(cfg.animated_title), inline: true },
            { name: 'Volume Control', value: boolIcon(cfg.volume_control), inline: true },
            { name: 'Use Discord Avatar', value: boolIcon(cfg.use_discord_avatar), inline: true }
        ],
        footer: { text: 'Page 3/3 (3 entry)' }
    });

    return [general, colorPage, other];
}

function premiumPages(data, mention) {
    const cfg = (data.config && data.config.premium) || {};
    const cursorEffects = cfg.cursor_effects === 'none' || !cfg.cursor_effects ? EMOJIS.DENY : cfg.cursor_effects;
    const typewriterTexts = Array.isArray(cfg.typewriter) && cfg.typewriter.length ? cfg.typewriter : [EMOJIS.DENY];
    const page = createEmbed({
        title: 'Customize Profile',
        color: COLORS.NEUTRAL,
        description: '> [Premium Customization](https://guns.lol/customize)',
        fields: [
            { name: 'Layout', value: String(cfg.layout || EMOJIS.DENY), inline: true },
            { name: 'Animation', value: String(cfg.animation || EMOJIS.DENY), inline: true },
            { name: 'Cursor Effects', value: String(cursorEffects), inline: true },
            { name: 'Effects Color', value: String(cfg.effects_color || EMOJIS.DENY), inline: true },
            { name: 'Font', value: String(cfg.font || EMOJIS.DENY), inline: true },
            { name: 'Page Enter Text', value: String(cfg.page_enter_text || EMOJIS.DENY), inline: true },
            { name: 'Typewriter', value: boolIcon(cfg.typewriter_enabled), inline: true },
            { name: 'Typewriter Texts', value: typewriterTexts.join(', ').slice(0, 1024), inline: false }
        ]
    });
    return [page];
}

function buildEmbed(data) {
    const config = data.config || {};
    const displayName = config.display_name || 'Unknown';
    const username = data.username || 'Unknown';
    const description = config.description || 'No description provided';
    const discordId = data.discord ? `> Owned by <@${data.discord.id}>` : '';
    const pageViews = config.page_views !== undefined && config.page_views !== null ? config.page_views : 'Unknown';
    const uidValue = data.uid !== undefined && data.uid !== null ? data.uid : 'Unknown';
    const accountCreated = data.account_created !== undefined && data.account_created !== null ? data.account_created : 'Unknown';
    const alias = data.alias || null;

    let avatarUrl = config.avatar || null;
    if (avatarUrl === '' || avatarUrl === 'None') {
        const discordAvatars = (data.discord && data.discord.avatar) || [];
        avatarUrl = discordAvatars.length ? discordAvatars[0] : null;
    }
    const backgroundUrl = config.url || null;
    const audioUrl = config.audio || null;
    const customCursor = config.custom_cursor || null;

    const userBadges = config.user_badges || [];
    let badges = null;
    if (userBadges.length) {
        let enabled = [];
        if (typeof userBadges[0] === 'object') enabled = userBadges.filter(b => b.enabled).map(b => b.name);
        else if (typeof userBadges[0] === 'string') enabled = userBadges;
        badges = enabled.filter(b => BADGE_EMOJIS[b]).map(b => BADGE_EMOJIS[b]).join(' ') || null;
    }

    const embed = createEmbed({
        color: COLORS.NEUTRAL,
        title: `${displayName} (@${username})`,
        url: `https://guns.lol/${username}`,
        description: `${badges ? badges + '\n' : ''}${description}\n${discordId}`.trim(),
        fields: [{ name: 'Account Creation', value: `<t:${Math.floor(Number(accountCreated) || 0)}:R>` }],
        footer: {
            text: `Views: ${Number(pageViews).toLocaleString('en-US')} ● UID ${Number(uidValue).toLocaleString('en-US')}`,
            icon_url: ICONS.GUNS
        }
    });

    if (alias) embed.fields.push({ name: 'Alias', value: String(alias) });
    if (avatarUrl) {
        embed.thumbnail = { url: avatarUrl };
        embed.fields.push({ name: 'Avatar', value: `[Click here](${avatarUrl})` });
    }
    if (backgroundUrl) {
        embed.image = { url: backgroundUrl };
        embed.fields.push({ name: 'Background', value: `[Click here](${backgroundUrl})` });
    }
    if (customCursor) embed.fields.push({ name: 'Cursor', value: `[Click here](${customCursor})` });
    if (audioUrl && typeof audioUrl === 'string') {
        embed.fields.push({ name: 'Audio', value: `[Click here](${audioUrl})` });
    } else if (Array.isArray(audioUrl) && audioUrl.length) {
        embed.fields.push({ name: 'Audio', value: audioUrl.map(a => `[${a.title}](${a.url})`).join(', '), inline: false });
    }
    return embed;
}

function attachView(sent, data, authorId) {
    const row = {
        type: 1,
        components: [
            { type: 2, style: 2, label: 'Customize', custom_id: 'gunsinfo_customize' },
            { type: 2, style: 2, label: 'Premium', custom_id: 'gunsinfo_premium' }
        ]
    };
    sent.components = [...(sent.components || []), row];
    return sent;
}

module.exports = {
    data: { name: 'gunsinfo', description: 'Gets profile information on the given Guns.lol user', usage: ',gunsinfo [username]' },
    aliases: ['guns'],
    cooldown: 5,
    buildEmbed,

    async execute(message, args, client) {
        let username = args.join(' ').trim() || null;
        if (!username) {
            const check = first('SELECT uid FROM guns WHERE user_id = ?', message.author.id);
            if (check) {
                const data = await getJson(`https://api.evelina.bot/guns/uid?id=${encodeURIComponent(check.uid)}`).catch(() => null);
                username = data ? data.username : null;
            } else {
                return sendCard(message, module.exports);
            }
        }
        if (!username) return sendCard(message, module.exports);

        const data = await getJson(`https://api.evelina.bot/guns/user?username=${encodeURIComponent(username)}`);
        if (!data || data.message !== undefined) {
            return warn(message, `Couldn't get information about Guns user **${username}**`);
        }

        const embed = buildEmbed(data);
        const payload = { embeds: [embed] };
        const sent = await message.reply(payload);
        if (!sent || typeof sent.createMessageComponentCollector !== 'function') return sent;

        const row = {
            type: 1,
            components: [
                { type: 2, style: 2, label: 'Customize', custom_id: 'gunsinfo_customize' },
                { type: 2, style: 2, label: 'Premium', custom_id: 'gunsinfo_premium' }
            ]
        };
        await sent.edit({ embeds: [embed], components: [row] }).catch(() => {});

        const collector = sent.createMessageComponentCollector({
            filter: i => i.user.id === message.author.id,
            time: 300000
        });

        let pageIndex = 0;
        let pages = null;

        collector.on('collect', async i => {
            if (i.customId === 'gunsinfo_customize') {
                pages = customizePages(data);
                pageIndex = (pageIndex + 1) % pages.length;
                return i.update({ embeds: [pages[pageIndex]], components: [row] }).catch(() => {});
            }
            if (i.customId === 'gunsinfo_premium') {
                if (data.premium === false || data.premium === undefined) {
                    return i.reply({
                        embeds: [createEmbed({
                            color: COLORS.WARNING,
                            description: `${EMOJIS.WARNING} ${i.user.mention}: User has no premium, so you can't view his settings`
                        })],
                        ephemeral: true
                    }).catch(() => {});
                }
                pages = premiumPages(data, i.user.mention);
                pageIndex = 0;
                return i.update({ embeds: [pages[pageIndex]], components: [row] }).catch(() => {});
            }
        });

        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });

        return sent;
    }
};
