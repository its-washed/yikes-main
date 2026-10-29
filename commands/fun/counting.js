const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');
const { COLORS, EMOJIS } = require('../../utils/styles');

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
    return needPerm(message, PermissionFlagsBits.ManageChannels);
}

module.exports = {
    data: { name: 'counting', description: 'Counting game commands', usage: ',counting <set|remove|safemode|leaderboard>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['set', 'remove', 'safemode', 'leaderboard'],
    subUsages: {
        set: ',counting set #channel',
        remove: ',counting remove',
        safemode: ',counting safemode <on|off>',
        leaderboard: ',counting leaderboard'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        set: {
            aliases: [],
            data: { name: 'counting set', description: 'Set the counting channel', usage: 'counting set #channel' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const channel = resolveChannel(message, args.join(' '));
                if (!channel || channel.type !== ChannelType.GuildText) return warn(message, `Channel **${args.join(' ')}** couldn't be found`);
                const existing = first('SELECT channel_id FROM number_counter WHERE guild_id = ?', message.guild.id);
                if (existing) {
                    run('UPDATE number_counter SET channel_id = ? WHERE guild_id = ?', channel.id, message.guild.id);
                    return approve(message, `Counter channel has been updated to ${channel}`);
                }
                run('INSERT INTO number_counter (guild_id, channel_id) VALUES (?, ?)', message.guild.id, channel.id);
                return approve(message, `Counter channel has been set to ${channel}`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'counting remove', description: 'Remove the counting channel' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const existing = first('SELECT channel_id FROM number_counter WHERE guild_id = ?', message.guild.id);
                if (!existing) return warn(message, 'Counter channel is not set');
                run('DELETE FROM number_counter WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Counter channel has been removed');
            }
        },

        safemode: {
            aliases: [],
            data: { name: 'counting safemode', description: 'Enable or disable safe mode for the counting game', usage: 'counting safemode on' },
            async execute(message, args, client, config) {
                if (!await needManageChannels(message)) return;
                const mode = String(args[0] || '').toLowerCase();
                if (mode !== 'on' && mode !== 'off') return warn(message, 'Invalid mode. Choose from `on` or `off`');
                const row = first('SELECT * FROM number_counter WHERE guild_id = ?', message.guild.id);
                if (!row) return warn(message, 'Counter channel is not set');
                if (Number(row.current_number) !== 1) return warn(message, 'Safe mode can only be changed when the current number is 1');
                run('UPDATE number_counter SET safemode = ? WHERE guild_id = ?', mode === 'on' ? 1 : 0, message.guild.id);
                if (mode === 'on') return approve(message, 'Safe mode has been enabled');
                return approve(message, 'Safe mode has been disabled');
            }
        },

        leaderboard: {
            aliases: ['lb', 'top'],
            data: { name: 'counting leaderboard', description: 'Displays the highest number counts across servers' },
            async execute(message, args, client, config) {
                const rows = query('SELECT guild_id, highest_count FROM number_counter WHERE highest_count > 1 ORDER BY highest_count DESC');
                const lines = [];
                for (const row of rows) {
                    const guild = message.client.guilds.cache.get(String(row.guild_id));
                    if (guild) lines.push(`**${guild.name}** - ${row.highest_count}`);
                }
                if (!lines.length) return warn(message, 'No data found for counting leaderboard');
                return paginate(message, lines, 'Counting Leaderboard', {
                    name: message.author.username,
                    icon_url: message.author.displayAvatarURL({ size: 256 })
                });
            }
        }
    },

    async handleCount(message) {
        try {
            const row = first('SELECT channel_id, last_counted, current_number, highest_count, safemode FROM number_counter WHERE guild_id = ?', message.guild.id);
            if (!row) return false;
            if (String(row.channel_id) !== String(message.channel.id)) return false;

            if (message.channel.type === ChannelType.GuildText && !message.channel.rateLimitPerUser) {
                await message.channel.setRateLimitPerUser(5).catch(() => {});
            }

            const evaluateMath = (expression) => {
                if (!/^[-+*/%().\d\s]+$/.test(expression)) return null;
                try {

                    const value = Function(`"use strict"; return (${expression});`)();
                    return typeof value === 'number' && Number.isFinite(value) ? value : null;
                } catch (err) {
                    return null;
                }
            };

            const clean = message.content.replace(/ /g, '');
            let number = null;
            if (/[+\-*/%]/.test(clean)) number = evaluateMath(clean);
            if (number === null) {
                if (!/^-?\d+$/.test(clean)) {
                    const isAdmin = message.member && (message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.permissions.has(PermissionFlagsBits.ManageMessages));
                    if (!isAdmin) await message.delete().catch(() => {});
                    return true;
                }
                number = parseInt(clean, 10);
            }

            const currentNumber = Number(row.current_number) || 1;
            const safemode = Boolean(row.safemode);

            if (String(row.last_counted) === String(message.author.id)) {
                await message.delete().catch(() => {});
                await message.channel.send(`${message.author}, you can't count twice in a row!`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
                return true;
            }

            if (number === currentNumber) {
                run('UPDATE number_counter SET current_number = ?, last_counted = ? WHERE guild_id = ?', currentNumber + 1, message.author.id, message.guild.id);
                await new Promise(resolve => setTimeout(resolve, 500));
                const goal = currentNumber;
                if (goal % 100 === 0) {
                    await message.react('🎉').catch(() => {});
                    await message.react('✅').catch(() => {});
                } else {
                    await message.react('✅').catch(() => {});
                }
                if (!safemode && currentNumber + 1 > (Number(row.highest_count) || 1)) {
                    run('UPDATE number_counter SET highest_count = ? WHERE guild_id = ?', currentNumber + 1, message.guild.id);
                }
            } else {
                await new Promise(resolve => setTimeout(resolve, 500));
                await message.react('❌').catch(() => {});
                if (safemode) {
                    await message.channel.send(`${message.author}, incorrect number, but safemode is ON. Continue from **${currentNumber}**.`)
                        .then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
                } else {
                    await message.channel.send(`${message.author}, wrong number! Start again from **1**`).catch(() => {});
                    run('UPDATE number_counter SET current_number = 1, last_counted = NULL WHERE guild_id = ?', message.guild.id);
                }
            }
            return true;
        } catch (err) {
            return false;
        }
    },

    async handleDelete(message) {
        try {
            if (!message.guild || !message.author || message.author.bot || !message.content) return false;
            const row = first('SELECT channel_id, current_number, last_counted FROM number_counter WHERE guild_id = ?', message.guild.id);
            if (!row) return false;
            if (String(row.channel_id) !== String(message.channel.id)) return false;
            if (String(row.last_counted) !== String(message.author.id)) return false;

            const clean = message.content.replace(/ /g, '');
            if (!/^-?\d+$/.test(clean)) return false;
            const number = parseInt(clean, 10);
            const currentNumber = Number(row.current_number) || 1;
            if (number === currentNumber - 1) {
                await message.channel.send(`${message.author} deleted **${number}** their last count. The next number is **${currentNumber}**`).catch(() => {});
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    }
};
