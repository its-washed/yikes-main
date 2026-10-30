const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, run } = require('../../utils/database');

const ROLE_TABLES = [
    'autorole', 'autorole_bots', 'autorole_humans', 'counters', 'invites_rewards',
    'jail', 'level_multiplier', 'level_multiplier_voice', 'level_rewards', 'booster_award',
    'lockdown_role', 'mute_images', 'mute_reactions', 'reactionrole', 'suggestions_module',
    'voicerole_default', 'warns_rewards', 'restrictcommand'
];

const CHANNEL_TABLES = [
    'welcome', 'boost', 'leave', 'autopublish',
    'autoreact_channel', 'autothread', 'bumpreminder', 'button_message', 'button_role',
    'button_settings', 'channel_disabled_commands', 'channel_disabled_module', 'confess', 'giveaway',
    'jail', 'number_counter', 'only_bot', 'only_img',
    'only_link', 'only_text', 'paginate_embeds', 'quotes',
    'reactionrole', 'reminder', 'reposter_channels', 'snipes', 'snipes_edit',
    'snipes_reaction', 'starboard', 'stickymessage', 'suggestions_module', 'timer',
    'autopost_twitch'
];

const ROLE_COLUMN = {
    mute_images: 'channel_id',
    mute_reactions: 'channel_id'
};

async function cleanupTable(message, table, column, id, deleted) {
    try {
        const entries = query(`SELECT 1 FROM ${table} WHERE ${column} = ? LIMIT 1`, id);
        if (entries.length) {
            run(`DELETE FROM ${table} WHERE ${column} = ?`, id);
            deleted.push(table);
        }
    } catch (err) {}
}

module.exports = {
    permission: "administrator",
    data: { name: 'cleanup', description: 'Cleanup your server database', usage: ',cleanup <role|channel>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['role', 'channel'],
    subUsages: {
        role: ',cleanup role 1272482302227910708',
        channel: ',cleanup channel 1272482302227910708'
    },
    execute: async (message) => {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        return sendCard(message, module.exports);
    },

    subs: {
        role: {
            aliases: [],
            data: { name: 'cleanup role', description: "Delete a channel from database", usage: ',cleanup role 1272482302227910708' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const id = String(args[0] || '').replace(/[<@&>]/g, '');
                if (!/^\d{17,20}$/.test(id)) return warn(message, 'You must provide a role id\n> Usage: `,cleanup role 1272482302227910708`');
                if (message.guild.roles.cache.has(id) || id === message.guild.id) {
                    return warn(message, "Role isn't from this server");
                }
                const deleted = [];
                for (const table of ROLE_TABLES) {
                    await cleanupTable(message, table, ROLE_COLUMN[table] || 'role_id', id, deleted);
                }
                if (deleted.length) {
                    return approve(message, `Role **${id}** was deleted from the following features:\n\`\`\`${deleted.join(', ')}\`\`\``);
                }
                return warn(message, `No entries found for the role **${id}**`);
            }
        },
        channel: {
            aliases: [],
            data: { name: 'cleanup channel', description: "Delete a role from datebase", usage: ',cleanup channel 1272482302227910708' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const id = String(args[0] || '').replace(/[<#>]/g, '');
                if (!/^\d{17,20}$/.test(id)) return warn(message, 'You must provide a channel id\n> Usage: `,cleanup channel 1272482302227910708`');
                if (message.guild.channels.cache.has(id)) {
                    return warn(message, "Channel isn't from this server");
                }
                const deleted = [];
                for (const table of CHANNEL_TABLES) {
                    await cleanupTable(message, table, 'channel_id', id, deleted);
                }
                if (deleted.length) {
                    return approve(message, `Channel **${id}** was deleted from the following features:\n\`\`\`${deleted.join(', ')}\`\`\``);
                }
                return warn(message, `No entries found for the channel **${id}**`);
            }
        }
    }
};
