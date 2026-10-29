const { PermissionFlagsBits } = require('discord.js');
const { query, first, run } = require('../../utils/database');
const { paginate, warn, approve } = require('../../utils/context');
const { needPerm, prefix, confirm } = require('../../utils/moderation');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { sendCard } = require('../../utils/helpCard');

function moduleRow(guildId) {
    return first('SELECT * FROM whitelist_module WHERE guild_id = ?', guildId);
}

async function needEnabled(message) {
    if (moduleRow(message.guild.id)) return true;
    await warn(message, `Whitelist is **not** enabled\n> Use \`${prefix(message)}whitelist enable\` to enable it`);
    return false;
}

async function resolveTarget(message, value, client) {
    if (!value) return null;
    const mentioned = message.mentions.users.first();
    if (mentioned) return mentioned;
    const id = String(value).replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return await client.users.fetch(id).catch(() => null);
    return null;
}

module.exports = {
    permission: "administrator",
    data: { name: 'whitelist', description: 'Manage the whitelist module', usage: ',whitelist <enable|disable|message|punishment|add|remove|list>' },
    aliases: ['wl'],
    cooldown: 5,
    subcommands: ['enable', 'disable', 'message', 'punishment', 'add', 'remove', 'list'],
    subUsages: {
        enable: ',whitelist enable',
        disable: ',whitelist disable',
        message: ',whitelist message <text|none|default>',
        punishment: ',whitelist punishment <kick|ban>',
        add: ',whitelist add <user>',
        remove: ',whitelist remove <user>',
        list: ',whitelist list'
    },
    execute: async (message, args, client) => {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        return sendCard(message, module.exports);
    },
    subs: {
        enable: {
            aliases: [],
            data: { name: 'whitelist enable', description: 'Turn on the whitelist system', usage: ',whitelist enable' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (moduleRow(message.guild.id)) {
                    return warn(message, 'The whitelist is **already** enabled');
                }
                return confirm(message, `${message.author}: Are you sure you want to **enable** the whitelist system?\n> This will kick every user that joins your server if you don't whitelist them!`,
                    async i => {
                        run('INSERT OR IGNORE INTO whitelist_module (guild_id, module) VALUES (?, ?)', message.guild.id, 'default');
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Enabled the **whitelist**`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Whitelist activation got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },
        disable: {
            aliases: [],
            data: { name: 'whitelist disable', description: 'Turn off the whitelist system', usage: ',whitelist disable' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needEnabled(message)) return;
                run('DELETE FROM whitelist_module WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Disabled the **whitelist**');
            }
        },
        message: {
            aliases: ['msg', 'dm'],
            data: { name: 'whitelist message', description: 'Change the message sent to users when not in the whitelist', usage: ',whitelist message <text|none|default>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needEnabled(message)) return;
                const code = args.join(' ').trim();
                if (!code) return warn(message, 'Usage: `whitelist message <text|none|default>`');
                const lowered = code.toLowerCase();
                if (lowered === 'none') {
                    run('UPDATE whitelist_module SET embed = ? WHERE guild_id = ?', 'none', message.guild.id);
                    return approve(message, 'Removed your **whitelist** message users will no longer be notified');
                }
                if (lowered === 'default') {
                    run('UPDATE whitelist_module SET embed = ? WHERE guild_id = ?', 'default', message.guild.id);
                    return approve(message, 'Set your **whitelist** message to the default');
                }
                run('UPDATE whitelist_module SET embed = ? WHERE guild_id = ?', code, message.guild.id);
                return approve(message, 'Set your **custom** whitelist message');
            }
        },
        punishment: {
            aliases: ['punish'],
            data: { name: 'whitelist punishment', description: 'Change the punishment for not being whitelisted', usage: ',whitelist punishment <kick|ban>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needEnabled(message)) return;
                const punishment = (args[0] || '').toLowerCase();
                if (punishment !== 'kick' && punishment !== 'ban') {
                    return warn(message, 'Punishment must be either `kick` or `ban`');
                }
                run('UPDATE whitelist_module SET punishment = ? WHERE guild_id = ?', punishment, message.guild.id);
                return approve(message, `Set your **whitelist** punishment to \`${punishment}\``);
            }
        },
        add: {
            aliases: [],
            data: { name: 'whitelist add', description: 'Add someone to the server whitelist', usage: ',whitelist add <user>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needEnabled(message)) return;
                const target = await resolveTarget(message, args[0], client);
                if (!target) return warn(message, `User **${args[0] || ''}** couldn't be found`);
                if (first('SELECT 1 AS ok FROM whitelist WHERE guild_id = ? AND user_id = ?', message.guild.id, target.id)) {
                    return warn(message, `${target} is already **whitelisted**`);
                }
                run('INSERT OR IGNORE INTO whitelist (guild_id, user_id) VALUES (?, ?)', message.guild.id, target.id);
                return approve(message, `Added ${target} to the **whitelist**`);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'whitelist remove', description: 'Remove someone from the server whitelist', usage: ',whitelist remove <user>' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needEnabled(message)) return;
                const target = await resolveTarget(message, args[0], client);
                if (!target) return warn(message, `User **${args[0] || ''}** couldn't be found`);
                if (!first('SELECT 1 AS ok FROM whitelist WHERE guild_id = ? AND user_id = ?', message.guild.id, target.id)) {
                    return warn(message, `${target} is not **whitelisted**`);
                }
                run('DELETE FROM whitelist WHERE guild_id = ? AND user_id = ?', message.guild.id, target.id);
                const member = message.guild.members.cache.get(String(target.id));
                let kicked = null;
                if (member) {
                    kicked = await member.kick(`Removed from the whitelist by ${message.author.tag} (${message.author.id})`).then(() => true).catch(() => false);
                }
                if (kicked === false) {
                    return approve(message, `Removed ${target} from the **whitelist** - failed to kick the member`);
                }
                return approve(message, `Removed ${target} from the **whitelist**`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'whitelist list', description: 'View all whitelisted members', usage: ',whitelist list' },
            execute: async (message, args, client) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needEnabled(message)) return;
                const rows = query('SELECT user_id FROM whitelist WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'No users are **whitelisted**');
                const lines = [];
                for (const row of rows) {
                    const user = client.users.cache.get(String(row.user_id)) || await client.users.fetch(String(row.user_id)).catch(() => null);
                    if (user) lines.push(`${user} (\`${user.id}\`)`);
                    else lines.push(`Unknown User (\`${row.user_id}\`)`);
                }
                return paginate(message, lines, 'Whitelist Users', {
                    name: message.guild.name,
                    icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                });
            }
        }
    }
};
