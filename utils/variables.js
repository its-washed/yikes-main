const { Guild, GuildMember, User, Message } = require('discord.js');

function resolve(str, ctx = {}) {
    if (!str || typeof str !== 'string') return str;
    const { member, user, guild, message, target, reason, duration, inviter, level } = ctx;
    const vars = {
        'user.id': user?.id || member?.id || '',
        'user.name': user?.username || member?.user?.username || '',
        'user.nick': member?.nickname || '',
        'user.display': member?.displayName || user?.username || '',
        'user.mention': member ? `${member}` : user ? `<@${user.id}>` : '',
        'user.discriminator': user?.discriminator || '0',
        'user.avatar': user?.displayAvatarURL({ dynamic: true }) || '',
        'user.guild.avatar': member?.displayAvatarURL({ dynamic: true }) || '',
        'user.joined_at': member?.joinedAt?.toISOString() || '',
        'user.created_at': user?.createdAt?.toISOString() || '',
        'guild.id': guild?.id || '',
        'guild.name': guild?.name || '',
        'guild.icon': guild?.iconURL({ dynamic: true }) || '',
        'guild.created_at': guild?.createdAt?.toISOString() || '',
        'guild.count': guild?.memberCount?.toString() || '0',
        'guild.count.format': ordinal(guild?.memberCount || 0),
        'guild.boost_count': guild?.premiumSubscriptionCount?.toString() || '0',
        'guild.boost_count.format': ordinal(guild?.premiumSubscriptionCount || 0),
        'guild.booster_count': guild?.members?.cache?.filter(m => m.premiumSince)?.size?.toString() || '0',
        'guild.booster_count.format': ordinal(guild?.members?.cache?.filter(m => m.premiumSince)?.size || 0),
        'guild.boost_tier': guild?.premiumTier?.toString() || '0',
        'guild.vanity': guild?.vanityURLCode || '',
        'member.id': target?.id || '',
        'member.name': target?.user?.username || '',
        'member.mention': target ? `${target}` : '',
        'member.discriminator': target?.user?.discriminator || '0',
        'member.avatar': target?.user?.displayAvatarURL({ dynamic: true }) || '',
        'reason': reason || 'No reason provided',
        'duration': duration || '',
        'level': level?.toString() || '0',
        'target_xp': level ? ((level + 1) * (level + 1) * 100).toString() : '100',
        'inviter.id': inviter?.id || '',
        'inviter.name': inviter?.user?.username || '',
        'inviter.display': inviter?.displayName || '',
        'inviter.mention': inviter ? `${inviter}` : '',
        'inviter.avatar': inviter?.user?.displayAvatarURL({ dynamic: true }) || '',
    };

    return str.replace(/\{([^}]+)\}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
    });
}

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function parseEmbed(str, ctx = {}) {
    if (!str) return null;
    const resolved = resolve(str, ctx);
    const embed = {};
    const parts = splitParams(resolved);
    for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx === -1) continue;
        const key = part.slice(0, colonIdx).trim().toLowerCase();
        const val = part.slice(colonIdx + 1).trim();
        switch (key) {
            case 'color': embed.color = parseColor(val); break;
            case 'title': embed.title = val; break;
            case 'description': embed.description = val; break;
            case 'url': embed.url = val; break;
            case 'image': embed.image = { url: val }; break;
            case 'thumbnail': embed.thumbnail = { url: val }; break;
            case 'timestamp': embed.timestamp = new Date().toISOString(); break;
            case 'author': {
                const authorParts = parseSubParams(val);
                embed.author = { name: authorParts.name || '', icon_url: authorParts.icon, url: authorParts.url };
                break;
            }
            case 'footer': {
                const footerParts = parseSubParams(val);
                embed.footer = { text: footerParts.text || '', icon_url: footerParts.icon };
                break;
            }
            case 'field': {
                const fieldParts = parseSubParams(val);
                if (!embed.fields) embed.fields = [];
                embed.fields.push({
                    name: fieldParts.name || 'Empty',
                    value: fieldParts.value || 'Empty',
                    inline: val.toLowerCase().includes('inline')
                });
                break;
            }
            case 'button': {
                const btnParts = parseSubParams(val);
                if (!embed.buttons) embed.buttons = [];
                embed.buttons.push({
                    label: btnParts.label || '',
                    emoji: btnParts.emoji,
                    url: btnParts.url,
                    style: btnParts.style || 'blue'
                });
                break;
            }
        }
    }
    return embed;
}

function splitParams(str) {
    const result = [];
    let depth = 0;
    let current = '';
    for (const ch of str) {
        if (ch === '{') { depth++; current += ch; }
        else if (ch === '}') { depth--; current += ch; }
        else if (ch === '$' && depth === 0) { result.push(current.trim()); current = ''; }
        else { current += ch; }
    }
    if (current.trim()) result.push(current.trim());
    return result;
}

function parseSubParams(str) {
    const result = {};
    const parts = str.split('&&').map(s => s.trim());
    for (const part of parts) {
        const colonIdx = part.indexOf(':');
        if (colonIdx !== -1) {
            result[part.slice(0, colonIdx).trim()] = part.slice(colonIdx + 1).trim();
        }
    }
    return result;
}

function parseColor(str) {
    if (!str) return 0x6c5ce7;
    str = str.replace('#', '');
    return parseInt(str, 16) || 0x6c5ce7;
}

module.exports = { resolve, parseEmbed, parseColor };
