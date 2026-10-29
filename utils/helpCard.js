const { EmbedBuilder } = require('discord.js');
const { Paginator } = require('./pagination');
const { PRESERVE } = require('./embeds');
const { COLORS, EMOJIS } = require('./styles');

const ALIASES = {
    manageserver: 'manage_guild',
    manageguild: 'manage_guild',
    timeout: 'moderate_members',
    timeoutmembers: 'moderate_members',
    manageemoji: 'manage_emojis_and_expressions',
    manageemojis: 'manage_emojis_and_expressions',
    manageexpressions: 'manage_emojis_and_expressions',
    managewebhook: 'manage_webhooks',
    auditlog: 'view_audit_log',
    viewauditlog: 'view_audit_log',
    priorityspeaker: 'priority_speaker',
    useapplicationcommands: 'use_application_commands',
    createinstantinvite: 'create_instant_invite',
    readmessagehistory: 'read_message_history',
    attachfiles: 'attach_files',
    embedlinks: 'embed_links',
    managethreads: 'manage_threads',
    manageevents: 'manage_events',
    managenicknames: 'manage_nicknames',
    moderatemembers: 'moderate_members',
    banmembers: 'ban_members',
    kickmembers: 'kick_members',
    movemembers: 'move_members',
    deafenmembers: 'deafen_members',
    mutemembers: 'mute_members',
    administrator: 'administrator',
    sendmessages: 'send_messages',
    sendmessagesinthreads: 'send_messages_in_threads',
    managelinks: 'manage_guild_expressions',
    viewchannel: 'view_channel'
};

const DISPLAY = {
    manage_guild: 'Manage Guild',
    administrator: 'Administrator',
    bot_developer: 'Bot Developer',
    server_owner: 'Server Owner',
    everyone: 'Everyone'
};

function toKey(name) {
    if (!name) return null;
    const flat = String(name).toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ALIASES[flat]) return ALIASES[flat];
    if (ALIASES[flat + 's']) return ALIASES[flat + 's'];
    const spaced = String(name)
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .trim();
    const key = spaced.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return key || null;
}

function displayName(key) {
    if (!key) return DISPLAY.everyone;
    if (DISPLAY[key]) return DISPLAY[key];
    return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function extractMetadata(src, category, file) {
    const meta = {
        module: `${category}/${file}`,
        subcommands: [],
        permissionKey: null,
        subUsages: {}
    };

    const readsFirstArg = /const\s+[a-zA-Z_$][\w$]*\s*=\s*args\[0\]/.test(src);
    let match;

    if (readsFirstArg) {
        const stringRe = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g;
        while ((match = stringRe.exec(src))) {
            const text = (match[1] !== undefined ? match[1] : match[2] || '')
                .replace(/\\`/g, '`')
                .replace(/\\'/g, "'")
                .replace(/\\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (!/^valid(?:\s+subcommands?)?\s*:/i.test(text)) continue;
            const list = text.replace(/^valid(?:\s+subcommands?)?\s*:\s*/i, '');
            for (const part of list.split(/,|\|| and /i)) {
                const name = part.replace(/[`\\]/g, '').trim();
                if (/^[a-z0-9_-]{1,32}$/i.test(name) && !meta.subcommands.includes(name)) {
                    meta.subcommands.push(name);
                }
            }
        }
    }

    const name = String(file).replace(/\.js$/, '');

    const usageRe = /'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g;
    while ((match = usageRe.exec(src))) {
        const raw = (match[1] || match[2] || '')
            .replace(/\\`/g, '`')
            .replace(/\\'/g, "'")
            .replace(/\\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const clean = raw.replace(/^usage:?\s*/i, '');
        if (clean.length < 3 || clean.length > 160) continue;
        for (const sub of meta.subcommands) {
            if (meta.subUsages[sub]) continue;
            if (clean === `,${name} ${sub}` || clean.startsWith(`,${name} ${sub} `) ||
                clean === `${name} ${sub}` || clean.startsWith(`${name} ${sub} `)) {
                meta.subUsages[sub] = clean.startsWith(',') ? clean : `,${clean}`;
            }
        }
    }

    const permissionPatterns = [
        /isAdmin\s*\(/,
        /isOwner\s*\(/,
        /hasPermission\(\s*[^,]+,\s*PermissionFlagsBits\.(\w+)/,
        /hasPermission\(\s*[^,]+,\s*['"]([\w ]+)['"]/,
        /permissions\.has\(\s*PermissionFlagsBits\.(\w+)/,
        /permissions\.has\(\s*\[?\s*PermissionFlagsBits\.(\w+)/,
        /permissions\.has\(\s*['"](\w+)['"]/
    ];

    if (permissionPatterns[0].test(src)) meta.permissionKey = 'administrator';
    else if (permissionPatterns[1].test(src)) meta.permissionKey = 'server_owner';
    else {
        for (let i = 2; i < permissionPatterns.length; i++) {
            const m = permissionPatterns[i].exec(src);
            if (m) {
                meta.permissionKey = toKey(m[1]);
                break;
            }
        }
    }

    return meta;
}

function tokensOf(usage) {
    const tokens = [];
    const re = /[<[]([^>\]]+)[>\]]/g;
    let m;
    while ((m = re.exec(usage || ''))) tokens.push(m[1]);
    return tokens;
}

function titleCase(text) {
    return String(text).split(/\s+/).map(word => (word ? word[0].toUpperCase() + word.slice(1) : word)).join(' ');
}

function paramList(cmd, usage, sub) {
    const declared = cmd && cmd.data ? cmd.data.params : null;
    const list = [];
    if (Array.isArray(declared)) {
        for (const entry of declared) {
            const text = String(entry).trim();
            if (!text) continue;
            const optional = text.startsWith('[');
            const name = text.replace(/^[<[]|[>\]]$/g, '');
            if (name) list.push({ name, required: !optional });
        }
        return list;
    }
    const re = /[<[]([^>\]]+)[>\]]/g;
    let m;
    while ((m = re.exec(usage || ''))) {
        if (m[1].includes('|') && sub !== null) continue;
        list.push({ name: m[1], required: m[0][0] === '<' });
    }
    return list;
}

function cardPage(cmd, sub, botUser) {
    const usage = (sub && cmd.subUsages && cmd.subUsages[sub]) || cmd.data.usage || `,${cmd.data.name}`;
    const params = paramList(cmd, usage, sub);
    const flags = cmd.data.flags && Object.keys(cmd.data.flags).length ? cmd.data.flags : null;
    const aliasText = cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'N/A';
    const names = params.map(p => p.name);
    if (flags) names.push('flags');
    const parameterText = names.length ? names.join(', ') : 'N/A';
    const permission = cmd.permissionKey;
    const brief = typeof cmd.permission === 'string' && cmd.permission.trim()
        ? titleCase(cmd.permission.trim())
        : permission
            ? displayName(permission)
            : null;
    const information = [
        cmd.cooldown ? `${EMOJIS.COOLDOWN} ${cmd.cooldown} seconds` : null,
        brief ? `${EMOJIS.WARNING} ${brief}` : null
    ].filter(Boolean).join('\n') || 'N/A';

    const label = `${cmd.data.name}${sub ? ` ${sub}` : ''}`;
    const syntaxParts = params.map(p => `[${p.name}]`);
    if (flags) syntaxParts.push('[flags]');
    const syntax = `,${label}${syntaxParts.length ? ` ${syntaxParts.join(' ')}` : ''}`;
    const example = usage && !/[<[]/.test(usage) && usage.trim() !== `,${label}` ? usage.trim() : null;
    const lines = [`Syntax: ${syntax}`];
    if (example) lines.push(`Example: ${example}`);
    const usageBlock = ['```js', ...lines, '```'].join('\n');

    const description = cmd.data.description
        ? `${cmd.data.description}${sub ? `\n\nSubcommand: \`${sub}\`` : ''}`
        : sub
            ? `Subcommand: \`${sub}\``
            : '';

    const fields = [
        { name: 'Aliases', value: aliasText, inline: true },
        { name: 'Parameters', value: parameterText, inline: true },
        { name: 'Information', value: information, inline: true }
    ];
    if (flags) {
        fields.push({
            name: 'Optional Flags',
            value: Object.entries(flags).map(([flag, desc]) => `\`--${flag}\`: ${desc}`).join('\n'),
            inline: false
        });
    }
    fields.push({ name: 'Usage', value: usageBlock, inline: false });

    return {
        [PRESERVE]: true,
        embeds: [{
            color: COLORS.NEUTRAL,
            title: `Command: ${label}`,
            description,
            author: botUser ? {
                name: botUser.username || String(botUser),
                icon_url: botUser.displayAvatarURL ? botUser.displayAvatarURL({ size: 256 }) : undefined
            } : undefined,
            fields,
            footer: { text: `Module: ${(cmd.category || 'unknown')}.py` }
        }]
    };
}

function buildCardPages(cmd, opts = {}) {
    const subs = Array.isArray(cmd.subcommands) ? cmd.subcommands : [];
    if (!subs.length) return [cardPage(cmd, null, opts.botUser)];
    const focus = opts.sub && subs.includes(opts.sub) ? [opts.sub] : subs;
    return focus.map(sub => cardPage(cmd, sub, opts.botUser));
}

async function sendCard(message, cmd, opts = {}) {
    const pages = buildCardPages(cmd, {
        ...opts,
        botUser: (message.client && message.client.user) || (message.user && message.user.client && message.user.client.user)
    });
    const paginator = new Paginator(pages, { userId: message.author.id });
    const embeds = paginator.buildEmbeds();
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    const sent = await message.reply({ embeds, components, [PRESERVE]: true });
    if (pages.length > 1) {
        await paginator.start(message.channel, sent);
    }
    return sent;
}

module.exports = { extractMetadata, buildCardPages, sendCard, toKey, displayName, cardPage, paramList };
