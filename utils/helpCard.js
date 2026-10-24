const { EmbedBuilder } = require('discord.js');
const { Paginator } = require('./pagination');
const { PRESERVE } = require('./embeds');

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

function sampleFor(token) {
    const t = String(token).toLowerCase().trim();
    if (t.includes('|')) return t.split('|')[0].trim();
    if (t.includes('channeltype') || t.includes('channel type')) return 'text';
    if (t.includes('emoji')) return 'star';
    if (t.includes('category')) return '#category';
    if (t.includes('role')) return '@role';
    if (t.includes('channel')) return '#channel';
    if (/(^|[^a-z])(user|member|target|owner|victim)([^a-z]|$)/.test(t)) return '@user';
    if (/(^|[^a-z])ids?([^a-z]|$)/.test(t)) return '123456789012345678';
    if (/(amount|count|quantity|number|level|limit|threshold|multiplier|percent|pages?|position|index)/.test(t)) return '10';
    if (/(seconds|minutes|hours|days|weeks|months)/.test(t)) return '10';
    if (/(time|duration)/.test(t)) return '10m';
    if (/(reason|text|message|name|title|content|word|description|url|link|code|query)/.test(t)) return 'text';
    if (/(prefix)/.test(t)) return ',';
    if (/(flags?|args?)/.test(t)) return '--flag value';
    if (/(type|kind|mode|option)/.test(t)) return null;
    return null;
}

function exampleFor(usage) {
    if (!usage) return null;
    const out = [];
    for (const part of usage.split(/\s+/)) {
        const m = part.match(/^[<[]([^>\]]+)[>\]]$/);
        if (m) {
            const sample = sampleFor(m[1]);
            if (sample === null) return null;
            out.push(sample);
        } else {
            out.push(part);
        }
    }
    const example = out.join(' ').trim();
    return example === usage.trim() ? null : example;
}

function cardPage(cmd, sub) {
    const usage = (sub && cmd.subUsages && cmd.subUsages[sub]) || cmd.data.usage || `,${cmd.data.name}`;
    const parameters = tokensOf(usage).filter(t => !t.includes('|') || sub === null);
    const aliasText = cmd.aliases && cmd.aliases.length ? cmd.aliases.join(', ') : 'N/A';
    const parameterText = parameters.length ? parameters.join(', ') : 'N/A';
    const permission = cmd.permissionKey;
    const information = permission
        ? `⚠️ ${displayName(permission)}`
        : DISPLAY.everyone;

    const lines = [`Syntax: ${usage}`];
    const example = exampleFor(usage);
    if (example) lines.push(`Example: ${example}`);
    const usageBlock = ['```', ...lines, '```'].join('\n');

    const description = cmd.data.description
        ? `${cmd.data.description}${sub ? `\n\nSubcommand: \`${sub}\`` : ''}`
        : sub
            ? `Subcommand: \`${sub}\``
            : '';

    return {
        [PRESERVE]: true,
        embeds: [{
            color: 0x6c5ce7,
            title: `Command: ${cmd.data.name}${sub ? ` ${sub}` : ''}`,
            description,
            fields: [
                { name: 'Aliases', value: aliasText, inline: true },
                { name: 'Parameters', value: parameterText, inline: true },
                { name: 'Information', value: information, inline: true },
                { name: 'Usage', value: usageBlock, inline: false }
            ],
            footer: { text: `Module: ${cmd.module || cmd.category || 'unknown'}` }
        }]
    };
}

function buildCardPages(cmd, opts = {}) {
    const subs = Array.isArray(cmd.subcommands) ? cmd.subcommands : [];
    if (!subs.length) return [cardPage(cmd, null)];
    const focus = opts.sub && subs.includes(opts.sub) ? [opts.sub] : subs;
    return focus.map(sub => cardPage(cmd, sub));
}

async function sendCard(message, cmd, opts = {}) {
    const pages = buildCardPages(cmd, opts);
    const paginator = new Paginator(pages, { userId: message.author.id });
    const embeds = paginator.buildEmbeds();
    const components = pages.length > 1 ? [paginator.buildRow()] : [];
    const sent = await message.reply({ embeds, components, [PRESERVE]: true });
    if (pages.length > 1) {
        await paginator.start(message.channel, sent);
    }
    return sent;
}

module.exports = { extractMetadata, buildCardPages, sendCard, toKey, displayName, cardPage };
