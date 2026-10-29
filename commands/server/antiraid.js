const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve, paginate, parseTime } = require('../../utils/context');
const { needPerm, formatTimespan } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { parseChannel } = require('../../utils/helpers');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

const PUNISHMENTS = ['ban', 'kick', 'timeout', 'strip'];

function parseList(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function getConfig(guildId) {
    return first('SELECT * FROM antiraid WHERE guild_id = ?', guildId);
}

function needConfigured(message) {
    const row = getConfig(message.guild.id);
    if (row) return row;
    warn(message, 'Antiraid is **not** configured\n> Use `,antiraid setup` to enable it');
    return null;
}

function readPunishment(message, value) {
    const punishment = String(value || '').toLowerCase();
    if (!PUNISHMENTS.includes(punishment)) {
        warn(message, `Invalid punishment. Use one of: ${PUNISHMENTS.map(p => `\`${p}\``).join(', ')}`);
        return null;
    }
    if (punishment === 'strip') {
        warn(message, '**Strip** can\'t be a punishment in this case');
        return null;
    }
    return punishment;
}

function iconOf(guild) {
    return guild.icon ? guild.iconURL({ size: 256 }) : undefined;
}

module.exports = {
    permission: "administrator",
    data: { name: 'antiraid', description: 'Configure protection against potential raids', usage: ',antiraid <setup|reset|logs|config|age|avatar|massjoin|whitelist|unwhitelist|whitelisted>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['setup', 'reset', 'logs', 'config', 'age', 'avatar', 'massjoin', 'whitelist', 'unwhitelist', 'whitelisted'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: setup, reset, logs, config, age, avatar, massjoin, whitelist, unwhitelist, whitelisted');
        return sendCard(message, module.exports);
    },
    subs: {
        setup: {
            aliases: [],
            data: { name: 'antiraid setup', description: 'Setup antiraid in your server', usage: ',antiraid setup' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = getConfig(message.guild.id);
                if (check && String(check.configured) === 'true') return warn(message, 'Antiraid is **already** configured');
                if (check) run('UPDATE antiraid SET configured = ? WHERE guild_id = ?', 'true', message.guild.id);
                else run('INSERT INTO antiraid (guild_id, configured) VALUES (?, ?)', message.guild.id, 'true');
                return approve(message, 'Antiraid has been **successfully** configured');
            }
        },
        reset: {
            aliases: [],
            data: { name: 'antiraid reset', description: 'Reset antiraid in your server', usage: ',antiraid reset' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = needConfigured(message);
                if (!check) return;
                run('DELETE FROM antiraid WHERE guild_id = ?', message.guild.id);
                return approve(message, 'Antiraid has been **successfully** reset');
            }
        },
        logs: {
            aliases: [],
            data: { name: 'antiraid logs', description: 'Set logs channel for antiraid', usage: ',antiraid logs <channel>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = needConfigured(message);
                if (!check) return;
                const channel = parseChannel(message, args[0]);
                if (!channel) return warn(message, 'Usage: `antiraid logs <channel>`');
                run('UPDATE antiraid SET logs = ? WHERE guild_id = ?', channel.id, message.guild.id);
                return approve(message, `Logs channel has been set to ${channel}`);
            }
        },
        config: {
            aliases: [],
            data: { name: 'antiraid config', description: 'View current antiraid configuration', usage: ',antiraid config' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = needConfigured(message);
                if (!check) return;
                const newAccounts = first('SELECT * FROM antiraid_age WHERE guild_id = ?', message.guild.id);
                const defaultAvatar = first('SELECT * FROM antiraid_avatar WHERE guild_id = ?', message.guild.id);
                const massJoin = first('SELECT * FROM antiraid_massjoin WHERE guild_id = ?', message.guild.id);
                const embed = createEmbed({ color: COLORS.NEUTRAL, title: 'Antiraid Settings', timestamp: false });
                embed.setAuthor({ name: message.guild.name, iconURL: iconOf(message.guild) });
                embed.setDescription(`**Logs Channel:** ${check.logs ? `<#${check.logs}>` : EMOJIS.DENY}`);
                if (newAccounts) embed.addFields({ name: `New Accounts (${formatTimespan(Number(newAccounts.threshold))})`, value: `Punishment: **${newAccounts.punishment}**` });
                if (defaultAvatar) embed.addFields({ name: 'Default Avatar', value: `Punishment: **${defaultAvatar.punishment}**` });
                if (massJoin) embed.addFields({ name: `Mass Join (${massJoin.threshold})`, value: `Punishment: **${massJoin.punishment}**` });
                if (!embed.data.fields || !embed.data.fields.length) return warn(message, 'Antiraid has no modules enabled');
                return message.reply({ embeds: [embed] });
            }
        },
        age: {
            aliases: [],
            data: { name: 'antiraid age', description: 'Punish new registered accounts', usage: ',antiraid age <enable|disable|punishment>' },
            subcommands: ['enable', 'disable', 'punishment'],
            execute: async (message) => sendCard(message, module.exports.subs.age),
            subs: {
                enable: {
                    aliases: [],
                    data: { name: 'antiraid age enable', description: 'Enable new accounts protection', usage: ',antiraid age enable <time> <punishment>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const check = needConfigured(message);
                        if (!check) return;
                        const time = parseTime(args[0]);
                        const punishment = readPunishment(message, args[1]);
                        if (!time || !punishment) return warn(message, 'Usage: `antiraid age enable <time> <punishment>`');
                        if (first('SELECT * FROM antiraid_age WHERE guild_id = ?', message.guild.id)) {
                            run('UPDATE antiraid_age SET punishment = ?, threshold = ? WHERE guild_id = ?', punishment, time, message.guild.id);
                        } else {
                            run('INSERT INTO antiraid_age (guild_id, punishment, threshold) VALUES (?, ?, ?)', message.guild.id, punishment, time);
                        }
                        return approve(message, `Enabled **new accounts** protection\n> Punishment: **${punishment}** Applying to: Accounts newer than **${formatTimespan(time)}**`);
                    }
                },
                disable: {
                    aliases: [],
                    data: { name: 'antiraid age disable', description: 'Disable new accounts protection', usage: ',antiraid age disable' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const check = needConfigured(message);
                        if (!check) return;
                        if (!first('SELECT * FROM antiraid_age WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'New accounts protection is **not** enabled');
                        }
                        run('DELETE FROM antiraid_age WHERE guild_id = ?', message.guild.id);
                        return approve(message, 'Disabled **new accounts** protection');
                    }
                },
                punishment: {
                    aliases: [],
                    data: { name: 'antiraid age punishment', description: 'Change punishment for new accounts protection', usage: ',antiraid age punishment <punishment>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const check = needConfigured(message);
                        if (!check) return;
                        const punishment = readPunishment(message, args[0]);
                        if (!punishment) return;
                        if (!first('SELECT * FROM antiraid_age WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'New accounts protection is **not** enabled');
                        }
                        run('UPDATE antiraid_age SET punishment = ? WHERE guild_id = ?', punishment, message.guild.id);
                        return approve(message, `Changed punishment to **${punishment}** for new accounts protection`);
                    }
                }
            }
        },
        avatar: {
            aliases: [],
            data: { name: 'antiraid avatar', description: 'Punish members with default avatars', usage: ',antiraid avatar <enable|disable|punishment>' },
            subcommands: ['enable', 'disable', 'punishment'],
            execute: async (message) => sendCard(message, module.exports.subs.avatar),
            subs: {
                enable: {
                    aliases: [],
                    data: { name: 'antiraid avatar enable', description: 'Enable default avatar protection', usage: ',antiraid avatar enable <punishment>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const check = needConfigured(message);
                        if (!check) return;
                        const punishment = readPunishment(message, args[0]);
                        if (!punishment) return;
                        if (first('SELECT * FROM antiraid_avatar WHERE guild_id = ?', message.guild.id)) {
                            run('UPDATE antiraid_avatar SET punishment = ? WHERE guild_id = ?', punishment, message.guild.id);
                        } else {
                            run('INSERT INTO antiraid_avatar (guild_id, punishment) VALUES (?, ?)', message.guild.id, punishment);
                        }
                        return approve(message, `Enabled **default avatar** protection\n> Punishment: **${punishment}**`);
                    }
                },
                disable: {
                    aliases: [],
                    data: { name: 'antiraid avatar disable', description: 'Disable default avatar protection', usage: ',antiraid avatar disable' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const check = needConfigured(message);
                        if (!check) return;
                        if (!first('SELECT * FROM antiraid_avatar WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'Default avatar protection is **not** enabled');
                        }
                        run('DELETE FROM antiraid_avatar WHERE guild_id = ?', message.guild.id);
                        return approve(message, 'Disabled **default avatar** protection');
                    }
                },
                punishment: {
                    aliases: [],
                    data: { name: 'antiraid avatar punishment', description: 'Change punishment for default avatar protection', usage: ',antiraid avatar punishment <punishment>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const check = needConfigured(message);
                        if (!check) return;
                        const punishment = readPunishment(message, args[0]);
                        if (!punishment) return;
                        if (!first('SELECT * FROM antiraid_avatar WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'Default avatar protection is **not** enabled');
                        }
                        run('UPDATE antiraid_avatar SET punishment = ? WHERE guild_id = ?', punishment, message.guild.id);
                        return approve(message, `Changed punishment to **${punishment}** for default avatar protection`);
                    }
                }
            }
        },
        massjoin: {
            aliases: [],
            data: { name: 'antiraid massjoin', description: 'Prevent join raids on your server', usage: ',antiraid massjoin <enable|disable|threshold|punishment>' },
            subcommands: ['enable', 'disable', 'threshold', 'punishment'],
            execute: async (message) => sendCard(message, module.exports.subs.massjoin),
            subs: {
                enable: {
                    aliases: ['e'],
                    data: { name: 'antiraid massjoin enable', description: 'Enable mass join protection', usage: ',antiraid massjoin enable <punishment> <threshold>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const punishment = readPunishment(message, args[0]);
                        const threshold = parseInt(args[1], 10);
                        if (!punishment || !Number.isInteger(threshold)) return warn(message, 'Usage: `antiraid massjoin enable <punishment> <threshold>`');
                        if (threshold < 1) return warn(message, "Rate can't be lower than **1**");
                        if (first('SELECT * FROM antiraid_massjoin WHERE guild_id = ?', message.guild.id)) {
                            run('UPDATE antiraid_massjoin SET punishment = ?, threshold = ? WHERE guild_id = ?', punishment, threshold, message.guild.id);
                        } else {
                            run('INSERT INTO antiraid_massjoin (guild_id, punishment, threshold) VALUES (?, ?, ?)', message.guild.id, punishment, threshold);
                        }
                        return approve(message, `Enabled **mass join** protection\n> Punishment: **${punishment}** Threshold: **${threshold}**`);
                    }
                },
                disable: {
                    aliases: ['dis'],
                    data: { name: 'antiraid massjoin disable', description: "Disbale antiraid mass join protection", usage: ',antiraid massjoin disable' },
                    execute: async (message) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        if (!first('SELECT * FROM antiraid_massjoin WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'Mass join protection is **not** enabled');
                        }
                        run('DELETE FROM antiraid_massjoin WHERE guild_id = ?', message.guild.id);
                        return approve(message, 'Disabled **mass join** protection');
                    }
                },
                threshold: {
                    aliases: [],
                    data: { name: 'antiraid massjoin threshold', description: 'Change threshold for mass join protection', usage: ',antiraid massjoin threshold <threshold>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const threshold = parseInt(args[0], 10);
                        if (!Number.isInteger(threshold)) return warn(message, 'Usage: `antiraid massjoin threshold <threshold>`');
                        if (threshold < 1) return warn(message, "Rate can't be lower than **1**");
                        if (!first('SELECT * FROM antiraid_massjoin WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'Antiraid mass join protection is **not** enabled');
                        }
                        run('UPDATE antiraid_massjoin SET threshold = ? WHERE guild_id = ?', threshold, message.guild.id);
                        return approve(message, `Changed threshold to **${threshold}** for mass join protection`);
                    }
                },
                punishment: {
                    aliases: [],
                    data: { name: 'antiraid massjoin punishment', description: 'Change punishment for anti mass join protection', usage: ',antiraid massjoin punishment <punishment>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                        const punishment = readPunishment(message, args[0]);
                        if (!punishment) return;
                        if (!first('SELECT * FROM antiraid_massjoin WHERE guild_id = ?', message.guild.id)) {
                            return warn(message, 'Antiraid mass join protection is **not** enabled');
                        }
                        run('UPDATE antiraid_massjoin SET punishment = ? WHERE guild_id = ?', punishment, message.guild.id);
                        return approve(message, `Changed punishment to **${punishment}** for mass join protection`);
                    }
                }
            }
        },
        whitelist: {
            aliases: ['wl'],
            data: { name: 'antiraid whitelist', description: 'Create a one-time whitelist to allow a user to join', usage: ',antiraid whitelist <user>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = needConfigured(message);
                if (!check) return;
                const user = message.mentions.users.first() || message.client.users.cache.get(String(args[0] || '').replace(/[<@!>]/g, ''));
                if (!user) return warn(message, 'Usage: `antiraid whitelist <user>`');
                const whitelisted = parseList(check.whitelisted).map(Number);
                if (whitelisted.includes(Number(user.id))) return warn(message, 'This member is **already** antiraid whitelisted');
                whitelisted.push(Number(user.id));
                run('UPDATE antiraid SET whitelisted = ? WHERE guild_id = ?', JSON.stringify(whitelisted), message.guild.id);
                return approve(message, `Whitelisted ${user} from Antiraid system`);
            }
        },
        unwhitelist: {
            aliases: ['uwl'],
            data: { name: 'antiraid unwhitelist', description: 'Unwhitelist a user or role from Antiraid system', usage: ',antiraid unwhitelist <user>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = needConfigured(message);
                if (!check) return;
                const user = message.mentions.users.first() || message.client.users.cache.get(String(args[0] || '').replace(/[<@!>]/g, ''));
                if (!user) return warn(message, 'Usage: `antiraid unwhitelist <user>`');
                const whitelisted = parseList(check.whitelisted).map(Number);
                if (!whitelisted.includes(Number(user.id))) return warn(message, "This member isn't antiraid whitelisted");
                whitelisted.splice(whitelisted.indexOf(Number(user.id)), 1);
                run('UPDATE antiraid SET whitelisted = ? WHERE guild_id = ?', JSON.stringify(whitelisted), message.guild.id);
                return approve(message, `Unwhitelisted ${user} from antiraid system`);
            }
        },
        whitelisted: {
            aliases: [],
            data: { name: 'antiraid whitelisted', description: 'View all current antiraid whitelists', usage: ',antiraid whitelisted' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const check = needConfigured(message);
                if (!check) return;
                const whitelisted = parseList(check.whitelisted);
                const content = whitelisted.map(entry => `<@${entry}> (\`${entry}\`)`);
                if (!content.length) return warn(message, 'There are **no** whitelisted members or roles');
                return paginate(message, content, 'Antiraid Whitelist', { name: message.guild.name, icon_url: iconOf(message.guild) });
            }
        }
    }
};
