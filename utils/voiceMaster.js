const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { run, query } = require('./database');
const { COLORS } = require('./styles');

const STYLES = {
    red: ButtonStyle.Danger,
    green: ButtonStyle.Success,
    blue: ButtonStyle.Primary,
    gray: ButtonStyle.Secondary
};

const DEFAULT_ACTIONS = [
    ['lock', '\u{1F512}'],
    ['unlock', '\u{1F513}'],
    ['hide', '\u{1F648}'],
    ['reveal', '\u{1F440}'],
    ['claim', '\u{1F451}'],
    ['kick', '\u{1F9B5}'],
    ['info', '\u{2139}️'],
    ['rename', '\u{270F}️'],
    ['increase', '⬆️'],
    ['decrease', '⬇️']
];

const USAGE_VALUES = [
    ['\u{1F512}', '`Lock` the voice channel'],
    ['\u{1F513}', '`Unlock` the voice channel'],
    ['\u{1F648}', '`Hide` the voice channel'],
    ['\u{1F440}', '`Reveal` the voice channel'],
    ['\u{1F451}', '`Claim` the voice channel'],
    ['\u{1F9B5}', '`Manage` permitted & rejected users'],
    ['\u{2139}️', '`Info` about the voice channel'],
    ['\u{270F}️', '`Rename` the voice channel'],
    ['⬆️', '`Increase` the user limit'],
    ['⬇️', '`Decrease` the user limit']
];

function buttonFor(spec) {
    const btn = new ButtonBuilder()
        .setCustomId(`vm_${spec.action}`)
        .setStyle(STYLES[spec.style] || ButtonStyle.Secondary);
    if (spec.label) btn.setLabel(spec.label);
    if (spec.emoji) btn.setEmoji(spec.emoji);
    return btn;
}

function buildComponents(buttons) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5).map(buttonFor)));
    }
    return rows;
}

function defaultButtons() {
    return DEFAULT_ACTIONS.map(([action, emoji]) => ({ action, emoji, label: '', style: 'gray' }));
}

function usageValue(fieldName) {
    return USAGE_VALUES.map(([emoji, text]) => `${emoji} - ${text}`).join('\n');
}

function interfaceEmbed(guild, client, { title, description, fieldName = 'usage' }) {
    const embed = {
        color: COLORS.NEUTRAL,
        title,
        description,
        author: { name: guild.name, icon_url: guild.iconURL() || undefined },
        fields: [{ name: fieldName, value: usageValue(), inline: false }]
    };
    const avatar = client && client.user ? client.user.displayAvatarURL() : null;
    if (avatar) embed.thumbnail = { url: avatar };
    return embed;
}

function persistButtons(guildId, buttons) {
    for (const spec of buttons) {
        run('INSERT OR REPLACE INTO voicemaster_buttons (guild_id, "action", label, emoji, style) VALUES (?, ?, ?, ?, ?)',
            guildId, spec.action, spec.label || null, spec.emoji || null, spec.style || 'gray');
    }
}

function loadButtons(guildId) {
    const rows = query('SELECT "action", label, emoji, style FROM voicemaster_buttons WHERE guild_id = ?', guildId) || [];
    if (!rows.length) return defaultButtons();
    return rows.map(row => ({
        action: row.action,
        label: row.label || '',
        emoji: row.emoji || null,
        style: row.style || 'gray'
    }));
}

function parseScriptButtons(code) {
    const buttons = [];
    const parts = String(code || '').split('$v')
        .map(p => (p.length > 1 ? p.slice(1, -1) : p))
        .map(p => p.trim());
    for (const part of parts) {
        if (!part.startsWith('button:')) continue;
        const choices = part.slice('button:'.length).split(' && ');
        const action = choices[0].trim().toLowerCase();
        if (!action) continue;
        let label = '';
        let emoji = null;
        let style = 'gray';
        for (const choice of choices) {
            if (choice.startsWith('label:')) label = choice.slice('label:'.length).trim();
            else if (choice.startsWith('emoji:')) emoji = choice.slice('emoji:'.length).trim();
            else if (choice.startsWith('style:')) style = choice.slice('style:'.length).trim();
        }
        buttons.push({ action, label, emoji, style });
    }
    return buttons;
}

module.exports = {
    DEFAULT_ACTIONS,
    buildComponents,
    defaultButtons,
    interfaceEmbed,
    persistButtons,
    loadButtons,
    parseScriptButtons
};
