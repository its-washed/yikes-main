const { warn, approve, paginate } = require('../../utils/context');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { query, first, run } = require('../../utils/database');
const { sendCard } = require('../../utils/helpCard');

function resolveChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase()) || null;
}

async function needManageChannels(message) {
    const { needPerm, needBotPerm } = require('../../utils/moderation');
    const { PermissionFlagsBits } = require('discord.js');
    if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return false;
    return true;
}

module.exports = {
    data: { name: 'guessthenumner', description: 'Guess the number game', usage: ',guessthenumner <start|stop|list|lock>' },
    aliases: ["gtn"],
    cooldown: 5,
    subcommands: ['start', 'stop', 'list', 'lock'],
    subUsages: {
        start: ',guessthenumner start #channel <min> <max>',
        stop: ',guessthenumner stop #channel',
        list: ',guessthenumner list',
        lock: ',guessthenumner lock <on|off>'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        start: {
            aliases: [],
            data: { name: 'guessthenumner start', description: 'Start a guess the number game', usage: 'guessthenumber start #number 1 200' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const channel = resolveChannel(message, args[0]);
                if (!channel) return warn(message, `Channel **${args[0] || ''}** couldn't be found`);
                const min = parseInt(args[1], 10);
                const max = parseInt(args[2], 10);
                if (!Number.isFinite(min) || !Number.isFinite(max)) {
                    return warn(message, 'You must provide a valid minimum and maximum number\n> Usage: `guessthenumber start #channel <min> <max>`');
                }
                if (min > max) return warn(message, 'The minimum number cannot be higher than the maximum number');
                const check = first('SELECT * FROM guessthenumber WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (check) return warn(message, 'There is already a guess the number game in this channel');
                const number = Math.floor(Math.random() * (max - min + 1)) + min;

                const embed = {
                    color: COLORS.NEUTRAL,
                    title: 'Guess the Number',
                    description: `Guess a number between **${min}** and **${max}**`,
                    author: {
                        name: message.guild.name,
                        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                    },
                    footer: {
                        text: `Game started by ${message.author.tag}`,
                        icon_url: message.author.displayAvatarURL({ size: 256 })
                    }
                };
                await channel.send({ embeds: [embed] }).catch(() => {});
                run('INSERT INTO guessthenumber (guild_id, channel_id, number) VALUES (?, ?, ?)', message.guild.id, channel.id, number);
                try {
                    await message.author.send({
                        embeds: [{ color: COLORS.NEUTRAL, description: `Guess the number game started in ${channel}, the number is **${number}**` }]
                    });
                } catch (err) {}
                return approve(message, `Guess the number game started in ${channel}`);
            }
        },

        stop: {
            aliases: [],
            data: { name: 'guessthenumner stop', description: 'Stop the guess the number game', usage: 'gessthenumber stop #number' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const channel = resolveChannel(message, args[0]);
                if (!channel) return warn(message, `Channel **${args[0] || ''}** couldn't be found`);
                const check = first('SELECT * FROM guessthenumber WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                if (!check) return warn(message, 'There is no guess the number game in this channel');
                const embed = {
                    color: COLORS.NEUTRAL,
                    title: 'Guess the Number',
                    description: 'The game has been stopped',
                    author: {
                        name: message.guild.name,
                        icon_url: message.guild.icon ? message.guild.iconURL({ size: 256 }) : undefined
                    },
                    footer: {
                        text: `Game stopped by ${message.author.tag}`,
                        icon_url: message.author.displayAvatarURL({ size: 256 })
                    }
                };
                await channel.send({ embeds: [embed] }).catch(() => {});
                run('DELETE FROM guessthenumber WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                return approve(message, `Guess the number game stopped in ${channel}`);
            }
        },

        list: {
            aliases: [],
            data: { name: 'guessthenumner list', description: 'List all guess the number games' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const rows = query('SELECT * FROM guessthenumber WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There are no guess the number games in this server');
                const lines = rows.map(row => {
                    const channel = message.guild.channels.cache.get(String(row.channel_id));
                    return `${channel ? `${channel}` : `<#${row.channel_id}>`} - ${row.number}`;
                });
                return paginate(message, lines, 'Guess the Number - Games', {
                    name: message.author.username,
                    icon_url: message.author.displayAvatarURL({ size: 256 })
                });
            }
        },

        lock: {
            aliases: [],
            data: { name: 'guessthenumner lock', description: 'Change the lock status of the game', usage: 'guessthenumber lock on' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const mode = String(args[0] || '').toLowerCase();
                if (mode !== 'on' && mode !== 'off') return warn(message, 'Invalid mode. Choose from `on` or `off`');
                const check = first('SELECT 1 AS ok FROM guessthenumber_settings WHERE guild_id = ?', message.guild.id);
                if (!check) {
                    run('INSERT INTO guessthenumber_settings (guild_id, lock) VALUES (?, ?)', message.guild.id, mode === 'on' ? 1 : 0);
                } else {
                    run('UPDATE guessthenumber_settings SET lock = ? WHERE guild_id = ?', mode === 'on' ? 1 : 0, message.guild.id);
                }
                if (mode === 'on') return approve(message, 'Guess the number games will be locked after a win');
                return approve(message, 'Guess the number games will not be locked after a win');
            }
        }
    },

    async handleGuess(message) {
        try {
            const check = first('SELECT * FROM guessthenumber WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);
            if (!check) return false;
            if (!/^\d+$/.test(message.content.trim())) return false;
            const number = parseInt(message.content.trim(), 10);
            if (number !== Number(check.number)) return false;

            await message.channel.send({
                embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author} guessed the number! The number was **${check.number}**` }]
            }).catch(() => {});
            run('DELETE FROM guessthenumber WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);

            const settings = first('SELECT * FROM guessthenumber_settings WHERE guild_id = ?', message.guild.id);
            if (settings && settings.lock && message.channel.isTextBased() && !message.channel.isThread()) {
                const roles = query('SELECT role_id FROM lockdown_role WHERE guild_id = ?', message.guild.id)
                    .map(row => message.guild.roles.cache.get(String(row.role_id)))
                    .filter(Boolean);
                if (roles.length) {
                    for (const role of roles) {
                        const overwrites = message.channel.permissionOverwrites.cache.get(role.id);
                        if (overwrites && !overwrites.allow.has('SendMessages')) continue;
                        await message.channel.permissionOverwrites.edit(role, { SendMessages: false }, {
                            reason: `Channel locked by ${message.author}`
                        }).catch(() => {});
                    }
                }
            }
            return true;
        } catch (err) {
            return false;
        }
    }
};
