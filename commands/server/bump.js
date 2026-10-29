const { PermissionFlagsBits } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed, permissionDenied } = require('../../utils/embeds');
const { hasPermission, isAdmin } = require('../../utils/permissions');

async function bumpTest(message, key) {
    const { first } = require('../../utils/database');
    const { warn } = require('../../utils/context');
    const { altConvert, scriptPayload } = require('../../utils/embedScript');
    const row = first('SELECT * FROM bumpreminder WHERE guild_id = ?', message.guild.id);
    if (!row) return warn(message, 'Bump reminder feature is **not** enabled\n> Use `,bumpreminder enable` to enable it');
    try {
        const payload = scriptPayload(await altConvert(message.author, row[key]));
        return await message.channel.send(payload);
    } catch (err) {
        return warn(message, `An error occurred while sending the message\n\`\`\`${err.message}\`\`\``);
    }
}

async function bumpView(message, key) {
    const { first } = require('../../utils/database');
    const { warn, say } = require('../../utils/context');
    const row = first('SELECT * FROM bumpreminder WHERE guild_id = ?', message.guild.id);
    if (!row) return warn(message, 'Bump reminder feature is **not** enabled\n> Use `,bumpreminder enable` to enable it');
    const label = key === 'reminder' ? 'bump reminder' : 'bump thankyou';
    return say(message, `Your custom **${label}** message is:\n\`\`\`${row[key]}\`\`\``);
}

module.exports = {
    data: {
        name: 'bumpreminder',
        description: "Get reminders to /bump your server on Disboard!",
        usage: ',bumpreminder [enable|disable|channel|time|set|thankmessage|remindermessage|status]'
    },
    aliases: ["bump"],
    cooldown: 10,

    subs: {
        enable: {
            aliases: [],
            data: { name: 'bumpreminder enable', description: 'Enable the disboard bump reminder feature in your server', usage: ',bumpreminder enable' },
            execute: async (message) => {
                const { first, run } = require('../../utils/database');
                const { warn, approve } = require('../../utils/context');
                if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
                if (first('SELECT guild_id FROM bumpreminder WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'The bump reminder is **already** enabled');
                }
                run('INSERT INTO bumpreminder (guild_id, thankyou, reminder) VALUES (?, ?, ?)',
                    message.guild.id,
                    '{embed}{color: #181a14}$v{description: <:thumbsup:1263643054489993337> Thank you for bumping the server! I will remind you **in 2 hours** to do it again}$v{content: {user.mention}}',
                    '{embed}{color: #181a14}$v{description: 🕰️ Bump the server using `/bump`}$v{content: {user.mention}}');
                return approve(message, 'Bump Reminder is now enabled');
            }
        },
        disable: {
            aliases: [],
            data: { name: 'bumpreminder disable', description: 'Disable the disboard bump reminder feature', usage: ',bumpreminder disable' },
            execute: async (message) => {
                const { first, run } = require('../../utils/database');
                const { warn, approve } = require('../../utils/context');
                if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
                if (!first('SELECT guild_id FROM bumpreminder WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Bump reminder feature is **not** enabled\n> Use `,bumpreminder enable` to enable it');
                }
                run('DELETE FROM bumpreminder WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Bump reminder is now disabled');
            }
        },
        thankyou: {
            aliases: ['ty'],
            data: { name: 'bumpreminder thankyou', description: "Set the 'Thank You' message for successfully running /bump", usage: ',bumpreminder thankyou Thanks, {user.mention}' },
            execute: async (message, args) => {
                const { first, run } = require('../../utils/database');
                const { warn, approve } = require('../../utils/context');
                if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
                if (!first('SELECT guild_id FROM bumpreminder WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Bump reminder feature is **not** enabled\n> Use `,bumpreminder enable` to enable it');
                }
                const code = args.join(' ').trim() || '{embed}{color: #24B8B8}$v{description: Thank you for bumping the server! I will remind you **in 2 hours** to do it again}$v{content: {user.mention}}';
                run('UPDATE bumpreminder SET thankyou = ? WHERE guild_id = ?', code, message.guild.id);
                return approve(message, `Bump reminder thankyou message updated to\n\`\`\`\n${code}\`\`\``);
            }
        },
        reminder: {
            aliases: [],
            data: { name: 'bumpreminder reminder', description: 'Set the reminder message to run /bump', usage: ',bumpreminder reminder Bump the server using `/bump`' },
            execute: async (message, args) => {
                const { first, run } = require('../../utils/database');
                const { warn, approve } = require('../../utils/context');
                if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return;
                if (!first('SELECT guild_id FROM bumpreminder WHERE guild_id = ?', message.guild.id)) {
                    return warn(message, 'Bump reminder feature is **not** enabled\n> Use `,bumpreminder enable` to enable it');
                }
                const code = args.join(' ').trim() || '{embed}{color: #FF6465}$v{description: ⏰ Bump the server using `/bump`}$v{content: {user.mention}}';
                run('UPDATE bumpreminder SET reminder = ? WHERE guild_id = ?', code, message.guild.id);
                return approve(message, `Bump reminder reminder message updated to\n\`\`\`\n${code}\`\`\``);
            }
        },
        leaderboard: {
            aliases: ['lb'],
            data: { name: 'bumpreminder leaderboard', description: 'View the bump reminder leaderboard', usage: ',bumpreminder leaderboard' },
            execute: async (message) => {
                const { query } = require('../../utils/database');
                const { warn, paginate } = require('../../utils/context');
                const res = query('SELECT * FROM bumpreminder_leaderboard WHERE guild_id = ? ORDER BY bumps DESC', message.guild.id);
                if (!res.length) return warn(message, 'No one has bumped the server yet');
                const entries = res.filter((row) => row.user_id).map((row) => `<@${row.user_id}> bumped \`${row.bumps} times\``);
                if (!entries.length) return warn(message, 'No one has bumped the server yet');
                return paginate(message, entries, 'Bump Reminder Leaderboard', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        },
        test: {
            aliases: [],
            data: { name: 'bumpreminder test', description: 'Test your bump reminder/thankyou messages', usage: ',bumpreminder test <reminder|thankyou>' },
            subcommands: ['reminder', 'thankyou'],
            subUsages: {
                reminder: ',bumpreminder test reminder',
                thankyou: ',bumpreminder test thankyou'
            },
            execute: async (message) => {
                const { sendCard } = require('../../utils/helpCard');
                return sendCard(message, module.exports.subs.test);
            },
            subs: {
                reminder: {
                    aliases: [],
                    data: { name: 'bumpreminder test reminder', description: 'Test your bump reminder message', usage: ',bumpreminder test reminder' },
                    execute: async (message) => bumpTest(message, 'reminder')
                },
                thankyou: {
                    aliases: [],
                    data: { name: 'bumpreminder test thankyou', description: 'Test your bump thankyou message', usage: ',bumpreminder test thankyou' },
                    execute: async (message) => bumpTest(message, 'thankyou')
                }
            }
        },
        view: {
            aliases: [],
            data: { name: 'bumpreminder view', description: 'View your bump reminder/thankyou messages', usage: ',bumpreminder view <reminder|thankyou>' },
            subcommands: ['reminder', 'thankyou'],
            subUsages: {
                reminder: ',bumpreminder view reminder',
                thankyou: ',bumpreminder view thankyou'
            },
            execute: async (message) => {
                const { sendCard } = require('../../utils/helpCard');
                return sendCard(message, module.exports.subs.view);
            },
            subs: {
                reminder: {
                    aliases: [],
                    data: { name: 'bumpreminder view reminder', description: 'View your bump reminder message', usage: ',bumpreminder view reminder' },
                    execute: async (message) => bumpView(message, 'reminder')
                },
                thankyou: {
                    aliases: [],
                    data: { name: 'bumpreminder view thankyou', description: 'View your bump thankyou message', usage: ',bumpreminder view thankyou' },
                    execute: async (message) => bumpView(message, 'thankyou')
                }
            }
        }
    },

    async execute(message, args, client, config) {
        const action = args[0]?.toLowerCase();

        const adminActions = ['enable', 'disable', 'channel', 'time', 'set'];
        if (adminActions.includes(action) && !isAdmin(message.member)) {
            return message.reply({ embeds: [permissionDenied(message, 'administrator')] });
        }

        const manageActions = ['thankmessage', 'remindermessage'];
        if (manageActions.includes(action) && !hasPermission(message.member, PermissionFlagsBits.ManageGuild)) {
            return message.reply({ embeds: [permissionDenied(message, 'manage_guild')] });
        }

        if (!action || action === 'status') {
            const br = config.bumpReminder || {};
            return message.reply({
                embeds: [createEmbed({
                    color: 0x729bb0,
                    title: 'Bump Reminder Status',
                    fields: [
                        { name: 'Enabled', value: br.enabled ? 'Yes' : 'No', inline: true },
                        { name: 'Channel', value: br.channel ? `<#${br.channel}>` : 'Not set', inline: true },
                        { name: 'Interval', value: br.interval ? `${br.interval}h` : '2h (default)', inline: true },
                        { name: 'Last Bump', value: br.lastBump ? `<t:${Math.floor(br.lastBump / 1000)}:R>` : 'Never', inline: true },
                        { name: 'Thank Message', value: br.thankMessage || '*Default*', inline: false },
                        { name: 'Reminder Message', value: br.reminderMessage || '*Default*', inline: false }
                    ]
                })]
            });
        }

        if (action === 'enable') {
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, enabled: true }
            });
            return message.reply({ embeds: [successEmbed('Bump Reminder Enabled', 'Bump reminders are now active.')] });
        }

        if (action === 'disable') {
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, enabled: false }
            });
            return message.reply({ embeds: [successEmbed('Bump Reminder Disabled', 'Bump reminders are now off.')] });
        }

        if (action === 'channel') {
            const channel = message.mentions.channels.first() || message.channel;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, channel: channel.id }
            });
            return message.reply({ embeds: [successEmbed('Bump Channel', `Reminders will be sent to ${channel}.`)] });
        }

        if (action === 'time') {
            const hours = parseInt(args[1]) || 2;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, interval: hours }
            });
            return message.reply({ embeds: [successEmbed('Bump Interval', `Reminders set every **${hours}** hour(s).`)] });
        }

        if (action === 'set') {
            if (!config.bumpReminder?.channel) {
                return message.reply({ embeds: [errorEmbed('No Channel', 'Set a channel first with `,bump channel #channel`.')] });
            }

            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, enabled: true, lastBump: Date.now() }
            });

            const channel = message.guild.channels.cache.get(config.bumpReminder.channel);
            if (channel) {
                const interval = config.bumpReminder.interval || 2;
                channel.send({
                    embeds: [createEmbed({
                        color: 0x729bb0,
                        title: 'Bump Reminder Set',
                        description: `I'll remind you to bump in **${interval}** hour(s).`
                    })]
                }).catch(() => {});
            }

            return message.reply({ embeds: [successEmbed('Bump Recorded', `Next reminder in **${config.bumpReminder?.interval || 2}** hour(s).`)] });
        }

        if (action === 'thankmessage') {
            const text = args.slice(1).join(' ');
            if (!text) {
                return message.reply({ embeds: [createEmbed({
                    color: 0x729bb0,
                    title: 'Thank Message',
                    description: 'Set the message sent when someone bumps.\n\n**Current:** ' + (config.bumpReminder?.thankMessage || '*Default*') + '\n\n**Variables:** `{user.mention}`, `{user.name}`, `{guild.name}`, `{guild.count}`, `{interval}`\n**Usage:** `,bump thankmessage Thank you {user.mention} for bumping!`\n**,bump thankmessage default` to reset**'
                })] });
            }

            const value = text.toLowerCase() === 'default' ? null : text;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, thankMessage: value }
            });
            return message.reply({ embeds: [successEmbed('Thank Message Updated', value ? `Set to: ${value}` : 'Reset to default.')] });
        }

        if (action === 'remindermessage') {
            const text = args.slice(1).join(' ');
            if (!text) {
                return message.reply({ embeds: [createEmbed({
                    color: 0x729bb0,
                    title: 'Reminder Message',
                    description: 'Set the reminder message sent when it\'s time to bump.\n\n**Current:** ' + (config.bumpReminder?.reminderMessage || '*Default*') + '\n\n**Variables:** `{guild.name}`, `{guild.count}`\n**Usage:** `,bump remindermessage Time to bump {guild.name}!`\n**,bump remindermessage default` to reset**'
                })] });
            }

            const value = text.toLowerCase() === 'default' ? null : text;
            updateGuildConfig(message.guild.id, {
                bumpReminder: { ...config.bumpReminder, reminderMessage: value }
            });
            return message.reply({ embeds: [successEmbed('Reminder Message Updated', value ? `Set to: ${value}` : 'Reset to default.')] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid: `enable`, `disable`, `channel`, `time`, `set`, `thankmessage`, `remindermessage`, `status`')] });
    }
};
