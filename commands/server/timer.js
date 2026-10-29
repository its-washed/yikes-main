const { PermissionFlagsBits } = require('discord.js');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm, formatTimespan } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { altConvert, scriptPayload } = require('../../utils/embedScript');

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
}

module.exports = {
    permission: "manage guild",
    data: {
        name: 'timer',
        description: 'Post repeating messages in your server',
        usage: ',timer <add|remove|test|list>'
    },
    subcommands: ['add', 'remove', 'test', 'list'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'timer add', description: 'Add repeating message to a channel', usage: ',timer add #general 10m {embed}$v{description: Hello world}' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'You must mention a channel');
                const intervalArg = args.find(a => !a.startsWith('<#'));
                const interval = intervalArg ? parseTime(intervalArg) : null;
                if (!interval) return warn(message, 'You must provide a valid interval like `10m`');
                if (interval < 300) return warn(message, 'Interval must be at least 5 minutes');
                const code = args.slice(args.indexOf(intervalArg) + 1).join(' ').trim();
                if (!code) return warn(message, 'You must provide a message code');

                const check = first('SELECT 1 AS ok FROM timer WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (check) return warn(message, `Channel ${channel} already has a timed message`);
                run('INSERT INTO timer (guild_id, channel_id, "interval", code, time) VALUES (?, ?, ?, ?, ?)',
                    message.guild.id, channel.id, interval, code, Date.now() / 1000);
                return approve(message, `Added an **auto message** with \`${formatTimespan(interval)}\` interval to ${channel}\nYou can preview your message by running \`,timer test ${channel}\``);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'timer remove', description: 'Remove repeating message from a channel', usage: ',timer remove #general' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'You must mention a channel');
                const check = first('SELECT 1 AS ok FROM timer WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (!check) return warn(message, `Channel ${channel} doesn't have a timed message`);
                run('DELETE FROM timer WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `Removed the **auto message** for ${channel}`);
            }
        },

        test: {
            aliases: [],
            data: { name: 'timer test', description: "Preview a channel's auto message", usage: ',timer test #general' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const mentioned = message.mentions.channels.first();
                const channel = mentioned || message.channel;
                const check = first('SELECT * FROM timer WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (!check) return warn(message, `Channel ${channel} does not have a timed message`);
                const target = message.guild.channels.cache.get(check.channel_id);
                if (!target) return warn(message, `Channel ${channel} is not available`);
                const payload = scriptPayload(altConvert(message.member, check.code));
                if (!payload.content && !payload.embeds) return warn(message, 'The message code did not produce anything to send');
                const sent = await target.send(payload).catch(() => null);
                if (!sent) return warn(message, 'Could not send the message to that channel');
                return approve(message, `Sent the message ${sent.url}`);
            }
        },

        list: {
            aliases: [],
            data: { name: 'timer list', description: 'View all auto messages in your server', usage: ',timer list' },
            async execute(message) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query('SELECT * FROM timer WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There is no timed message configured in this server');
                const lines = [];
                for (const row of rows) {
                    const channel = message.guild.channels.cache.get(row.channel_id);
                    lines.push(`${channel || 'None'} - \`${formatTimespan(row.interval)}\`\n\`\`\`${row.code}\`\`\``);
                }
                return paginate(message, lines, 'Timed Messages Configuration', guildAuthor(message), { perPage: 4, maxChars: 1800 });
            }
        }
    }
};
