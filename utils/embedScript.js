const { resolve } = require('./variables');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function ordinal(n) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function embedReplacement(user, params) {
    if (!params || !user) return params;
    params = params.replace(/\{user\}/g, String(user));
    params = resolve(params, { member: user, user: user.user || user, guild: user.guild });
    const guild = user.guild;
    params = params.replace('{invisible}', '2b2d31');
    params = params.replace('{botcolor}', '729bb0');
    params = params.replace('{botavatar}', 'https://cdn.discordapp.com/icons/1228371886690537624/494604786a585cd444a4a7946381dead.png');
    if (guild) {
        params = params.replace('{guild.count.format}', ordinal(guild.memberCount || 0));
        params = params.replace('{guild.booster_count.format}', ordinal(guild.members?.cache?.filter(m => m.premiumSince)?.size || 0));
        params = params.replace('{guild.icon}', guild.iconURL({ dynamic: true }) || 'https://none.none');
        params = params.replace('{guild.vanity}', guild.vanityURLCode || 'none');
    }
    if (user.user) {
        params = params.replace('{user.nick}', user.nickname || user.displayName);
        params = params.replace('{user.display}', user.displayName);
        params = params.replace('{user.avatar}', (user.user.avatar || user.user.defaultAvatarURL));
    }
    return params;
}

function isUrl(text) {
    const regex = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|\([^\s()<>]+\))*\))+(?:\(([^\s()<>]+|\([^\s()<>]+\))*\)|[^\s!()\[\]{};:'".,<>?«»“”‘’]))/i;
    return regex.test(text);
}

function validator(text, maxLen, error) {
    if (text && text.length >= maxLen) throw new Error(error);
}

function getParts(params) {
    if (!params) return [];
    params = params.replace('{embed}', '');
    return params.split('$v').map(p => (p.length > 1 ? p.slice(1, -1) : p)).map(p => p.trim());
}

function toObject(params) {
    const x = {};
    const fields = [];
    const buttons = [];
    let content = null;
    let deleteAfter = null;

    for (const raw of getParts(params)) {
        let part = raw;
        if (part.startsWith('content:')) {
            content = part.slice('content:'.length);
            validator(content, 2000, 'Message content too long');
        }
        if (part.startsWith('title:')) {
            const t = part.slice('title:'.length);
            validator(t, 256, 'Embed title too long');
            x.title = t;
        }
        if (part.startsWith('url:')) {
            const url = part.slice('url:'.length).trim();
            if (isUrl(url)) x.url = url;
        }
        if (part.startsWith('description:')) {
            const d = part.slice('description:'.length);
            validator(d, 2048, 'Embed description too long');
            x.description = d;
        }
        if (part.startsWith('color:')) {
            try {
                x.color = parseInt(part.slice('color:'.length).replace('#', ''), 16);
                if (Number.isNaN(x.color)) x.color = parseInt('808080', 16);
            } catch {
                x.color = parseInt('808080', 16);
            }
        }
        if (part.startsWith('thumbnail:')) {
            const u = part.slice('thumbnail:'.length).trim();
            if (isUrl(u)) x.thumbnail = { url: u };
        }
        if (part.startsWith('image:')) {
            const u = part.slice('image:'.length).trim();
            if (isUrl(u)) x.image = { url: u };
        }
        if (part === 'timestamp') x.timestamp = new Date().toISOString();
        if (part.startsWith('delete:')) {
            const v = parseFloat(part.slice('delete:'.length).trim());
            deleteAfter = Number.isFinite(v) ? Math.min(v, 30) : null;
        }
        if (part.startsWith('author:')) {
            let name = null;
            let url = null;
            let iconUrl = null;
            for (const z of part.slice('author:'.length).trim().split(' && ')) {
                if (z.startsWith('name:')) {
                    name = z.slice('name:'.length);
                    validator(name, 256, 'author name too long');
                }
                if (z.startsWith('icon:')) {
                    const v = z.slice('icon:'.length);
                    iconUrl = isUrl(v) ? v : null;
                }
                if (z.startsWith('url:')) {
                    const v = z.slice('url:'.length);
                    url = isUrl(v) ? v : null;
                }
            }
            x.author = { name: name };
            if (iconUrl) x.author.icon_url = iconUrl;
            if (url) x.author.url = url;
        }
        if (part.startsWith('field:')) {
            let name = null;
            let value = null;
            let inline = false;
            for (const z of part.slice('field:'.length).trim().split(' && ')) {
                if (z.startsWith('name:')) {
                    name = z.slice('name:'.length);
                    validator(name, 256, 'field name too long');
                }
                if (z.startsWith('value:')) {
                    value = z.slice('value:'.length);
                    validator(value, 1024, 'field value too long');
                }
                if (z.trim() === 'inline') inline = true;
            }
            fields.push({ name: name || 'Empty', value: value || 'Empty', inline: inline });
        }
        if (part.startsWith('footer:')) {
            let text = null;
            let iconUrl = null;
            for (const z of part.slice('footer:'.length).trim().split(' && ')) {
                if (z.startsWith('text:')) {
                    text = z.slice('text:'.length);
                    validator(text, 2048, 'footer text too long');
                }
                if (z.startsWith('icon:')) {
                    const v = z.slice('icon:'.length);
                    if (isUrl(v)) iconUrl = v;
                }
            }
            if (text) {
                x.footer = { text: text };
                if (iconUrl) x.footer.icon_url = iconUrl;
            }
        }
        if (part.startsWith('button:')) {
            let disabled = true;
            let style = ButtonStyle.Secondary;
            let emoji = null;
            let label = null;
            let url = null;
            for (const m of part.slice('button:'.length).split(' && ')) {
                if (m.includes('label:')) label = m.replace('label:', '').trim();
                if (m.includes('url:')) {
                    url = m.replace('url:', '').trim();
                    if (isUrl(url)) disabled = false;
                }
                if (m.includes('emoji:')) emoji = m.replace('emoji:', '').trim();
                if (m.includes('disabled')) disabled = true;
                if (m.includes('style:')) {
                    const styleName = m.replace('style:', '').trim();
                    style = {
                        red: ButtonStyle.Danger,
                        green: ButtonStyle.Success,
                        gray: ButtonStyle.Secondary,
                        blue: ButtonStyle.Primary
                    }[styleName] || ButtonStyle.Secondary;
                }
            }
            if (!label && !emoji) continue;
            const btn = new ButtonBuilder().setStyle(style);
            if (label) btn.setLabel(label);
            if (emoji) btn.setEmoji(emoji);
            if (url && isUrl(url)) btn.setURL(url);
            btn.setDisabled(disabled);
            buttons.push(btn);
        }
    }

    if (!x.title && !x.description && !x.image && !content && !x.author) {
        if (Object.keys(x).length) throw new Error('Either **title**, **description**, **author** or **image** is required for the embed.');
    }
    let embed = null;
    if (Object.keys(x).length) {
        if (fields.length > 25) throw new Error('There are more than **25** fields in your embed');
        if (fields.length) x.fields = fields;
        embed = x;
    }
    return { content, embed, buttons, deleteAfter };
}

function altConvert(member, argument) {
    if (!argument) return { content: null, embed: null, buttons: [], deleteAfter: null };
    const replaced = embedReplacement(member, argument);
    if (!replaced) return { content: null, embed: null, buttons: [], deleteAfter: null };
    const parsed = toObject(replaced);
    if (parsed.content || parsed.embed) return parsed;
    return { content: replaced, embed: null, buttons: [], deleteAfter: null };
}

function scriptPayload(result) {
    const payload = {};
    if (result.content) payload.content = result.content;
    if (result.embed) payload.embeds = [result.embed];
    if (result.buttons && result.buttons.length) {
        payload.components = [];
        for (let i = 0; i < result.buttons.length; i += 5) {
            payload.components.push(new ActionRowBuilder().addComponents(result.buttons.slice(i, i + 5)));
        }
    }
    return payload;
}

module.exports = { altConvert, scriptPayload, embedReplacement, toObject };
