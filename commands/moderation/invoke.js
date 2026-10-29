const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS } = require('../../utils/styles');
const { altConvert, scriptPayload } = require('../../utils/embedScript');

module.exports = {
    data: { name: 'invoke', description: 'Change punishment messages for DM or command response', usage: ',invoke <message|dm>' },
    aliases: [],
    cooldown: 5,
    subcommands: ['message', 'dm'],
    execute: async (message, args, client) => sendCard(message, module.exports),
    subs: {
        message: {
            aliases: [],
            data: { name: 'invoke message', description: 'Change punishment messages for command response', usage: ',invoke message <ban|unban|kick|mute|unmute|jail|jailchannel|unjail|warn>' },
            subcommands: ['ban', 'unban', 'kick', 'mute', 'unmute', 'jail', 'jailchannel', 'unjail', 'warn'],
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message),
            subs: {
        ban: {
            aliases: [],
            data: { name: 'invoke message ban', description: 'Change ban message for command response', usage: ',invoke message ban <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message ban add <message>',
                remove: ',invoke message ban remove',
                view: ',invoke message ban view',
                test: ',invoke message ban test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.ban),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message ban add', description: 'Add ban message for command response', usage: ',invoke message ban add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message ban add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **ban** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'ban');
                        return approve(message, `Updated your custom **ban** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'ban', code);
                    return approve(message, `Added your custom **ban** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message ban remove', description: 'Remove ban message for command response', usage: ',invoke message ban remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (!check) return warn(message, `You don't have a custom **ban** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    return approve(message, `Removed your custom **ban** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message ban view', description: 'View ban message for command response', usage: ',invoke message ban view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (!check) return warn(message, `You don't have a custom **ban** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **ban** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message ban test', description: 'Test ban message for command response', usage: ',invoke message ban test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (!check) return warn(message, `You don't have a custom **ban** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        unban: {
            aliases: [],
            data: { name: 'invoke message unban', description: 'Change unban message for command response', usage: ',invoke message unban <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message unban add <message>',
                remove: ',invoke message unban remove',
                view: ',invoke message unban view',
                test: ',invoke message unban test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.unban),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message unban add', description: 'Add unban message for command response', usage: ',invoke message unban add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message unban add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **unban** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'unban');
                        return approve(message, `Updated your custom **unban** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'unban', code);
                    return approve(message, `Added your custom **unban** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message unban remove', description: 'Remove unban message for command response', usage: ',invoke message unban remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (!check) return warn(message, `You don't have a custom **unban** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    return approve(message, `Removed your custom **unban** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message unban view', description: 'View unban message for command response', usage: ',invoke message unban view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (!check) return warn(message, `You don't have a custom **unban** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **unban** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message unban test', description: 'Test unban message for command response', usage: ',invoke message unban test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (!check) return warn(message, `You don't have a custom **unban** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        kick: {
            aliases: [],
            data: { name: 'invoke message kick', description: 'Change kick message for command response', usage: ',invoke message kick <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message kick add <message>',
                remove: ',invoke message kick remove',
                view: ',invoke message kick view',
                test: ',invoke message kick test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.kick),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message kick add', description: 'Add kick message for command response', usage: ',invoke message kick add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message kick add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **kick** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'kick');
                        return approve(message, `Updated your custom **kick** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'kick', code);
                    return approve(message, `Added your custom **kick** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message kick remove', description: 'Remove kick message for command response', usage: ',invoke message kick remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (!check) return warn(message, `You don't have a custom **kick** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    return approve(message, `Removed your custom **kick** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message kick view', description: 'View kick message for command response', usage: ',invoke message kick view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (!check) return warn(message, `You don't have a custom **kick** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **kick** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message kick test', description: 'Test kick message for command response', usage: ',invoke message kick test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (!check) return warn(message, `You don't have a custom **kick** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        mute: {
            aliases: [],
            data: { name: 'invoke message mute', description: 'Change mute message for command response', usage: ',invoke message mute <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message mute add <message>',
                remove: ',invoke message mute remove',
                view: ',invoke message mute view',
                test: ',invoke message mute test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.mute),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message mute add', description: 'Add mute message for command response', usage: ',invoke message mute add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message mute add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **mute** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'mute');
                        return approve(message, `Updated your custom **mute** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'mute', code);
                    return approve(message, `Added your custom **mute** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message mute remove', description: 'Remove mute message for command response', usage: ',invoke message mute remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (!check) return warn(message, `You don't have a custom **mute** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    return approve(message, `Removed your custom **mute** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message mute view', description: 'View mute message for command response', usage: ',invoke message mute view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (!check) return warn(message, `You don't have a custom **mute** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **mute** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message mute test', description: 'Test mute message for command response', usage: ',invoke message mute test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (!check) return warn(message, `You don't have a custom **mute** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        unmute: {
            aliases: [],
            data: { name: 'invoke message unmute', description: 'Change unmute message for command response', usage: ',invoke message unmute <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message unmute add <message>',
                remove: ',invoke message unmute remove',
                view: ',invoke message unmute view',
                test: ',invoke message unmute test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.unmute),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message unmute add', description: 'Add unmute message for command response', usage: ',invoke message unmute add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message unmute add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **unmute** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'unmute');
                        return approve(message, `Updated your custom **unmute** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'unmute', code);
                    return approve(message, `Added your custom **unmute** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message unmute remove', description: 'Remove unmute message for command response', usage: ',invoke message unmute remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (!check) return warn(message, `You don't have a custom **unmute** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    return approve(message, `Removed your custom **unmute** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message unmute view', description: 'View unmute message for command response', usage: ',invoke message unmute view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (!check) return warn(message, `You don't have a custom **unmute** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **unmute** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message unmute test', description: 'Test unmute message for command response', usage: ',invoke message unmute test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (!check) return warn(message, `You don't have a custom **unmute** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        jail: {
            aliases: [],
            data: { name: 'invoke message jail', description: 'Change jail message for command response', usage: ',invoke message jail <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message jail add <message>',
                remove: ',invoke message jail remove',
                view: ',invoke message jail view',
                test: ',invoke message jail test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.jail),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message jail add', description: 'Add jail message for command response', usage: ',invoke message jail add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message jail add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **jail** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'jail');
                        return approve(message, `Updated your custom **jail** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'jail', code);
                    return approve(message, `Added your custom **jail** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message jail remove', description: 'Remove jail message for command response', usage: ',invoke message jail remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (!check) return warn(message, `You don't have a custom **jail** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    return approve(message, `Removed your custom **jail** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message jail view', description: 'View jail message for command response', usage: ',invoke message jail view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (!check) return warn(message, `You don't have a custom **jail** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **jail** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message jail test', description: 'Test jail message for command response', usage: ',invoke message jail test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (!check) return warn(message, `You don't have a custom **jail** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        jailchannel: {
            aliases: [],
            data: { name: 'invoke message jailchannel', description: "Change jail channel message for command response", usage: ',invoke message jailchannel <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message jailchannel add <message>',
                remove: ',invoke message jailchannel remove',
                view: ',invoke message jailchannel view',
                test: ',invoke message jailchannel test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.jailchannel),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message jailchannel add', description: "Add jail channel message for command response", usage: ',invoke message jailchannel add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message jailchannel add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jailchannel');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **jailchannel** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'jailchannel');
                        return approve(message, `Updated your custom **jailchannel** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'jailchannel', code);
                    return approve(message, `Added your custom **jailchannel** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message jailchannel remove', description: "Remove jail channel message for command response", usage: ',invoke message jailchannel remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jailchannel');
                    if (!check) return warn(message, `You don't have a custom **jailchannel** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jailchannel');
                    return approve(message, `Removed your custom **jailchannel** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message jailchannel view', description: "View jail channel message for command response", usage: ',invoke message jailchannel view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jailchannel');
                    if (!check) return warn(message, `You don't have a custom **jailchannel** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **jailchannel** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message jailchannel test', description: "Test jail channel message for command response", usage: ',invoke message jailchannel test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'jailchannel');
                    if (!check) return warn(message, `You don't have a custom **jailchannel** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        unjail: {
            aliases: [],
            data: { name: 'invoke message unjail', description: 'Change unjail message for command response', usage: ',invoke message unjail <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message unjail add <message>',
                remove: ',invoke message unjail remove',
                view: ',invoke message unjail view',
                test: ',invoke message unjail test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.unjail),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message unjail add', description: 'Add unjail message for command response', usage: ',invoke message unjail add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message unjail add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **unjail** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'unjail');
                        return approve(message, `Updated your custom **unjail** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'unjail', code);
                    return approve(message, `Added your custom **unjail** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message unjail remove', description: 'Remove unjail message for command response', usage: ',invoke message unjail remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (!check) return warn(message, `You don't have a custom **unjail** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    return approve(message, `Removed your custom **unjail** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message unjail view', description: 'View unjail message for command response', usage: ',invoke message unjail view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (!check) return warn(message, `You don't have a custom **unjail** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **unjail** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message unjail test', description: 'Test unjail message for command response', usage: ',invoke message unjail test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (!check) return warn(message, `You don't have a custom **unjail** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        warn: {
            aliases: [],
            data: { name: 'invoke message warn', description: 'Change warn message for command response', usage: ',invoke message warn <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke message warn add <message>',
                remove: ',invoke message warn remove',
                view: ',invoke message warn view',
                test: ',invoke message warn test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.message.subs.warn),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke message warn add', description: 'Add warn message for command response', usage: ',invoke message warn add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke message warn add <message>');
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **warn** message set up`);
                        run('UPDATE invoke_message SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'warn');
                        return approve(message, `Updated your custom **warn** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_message (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'warn', code);
                    return approve(message, `Added your custom **warn** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke message warn remove', description: 'Remove warn message for command response', usage: ',invoke message warn remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (!check) return warn(message, `You don't have a custom **warn** message`);
                    run('DELETE FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    return approve(message, `Removed your custom **warn** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke message warn view', description: 'View warn message for command response', usage: ',invoke message warn view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (!check) return warn(message, `You don't have a custom **warn** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **warn** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke message warn test', description: 'Test warn message for command response', usage: ',invoke message warn test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_message WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (!check) return warn(message, `You don't have a custom **warn** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        }
            }
        },
        dm: {
            aliases: [],
            data: { name: 'invoke dm', description: 'Change punishment messages for DM', usage: ',invoke dm <ban|unban|kick|mute|unmute|jail|unjail|warn>' },
            subcommands: ['ban', 'unban', 'kick', 'mute', 'unmute', 'jail', 'unjail', 'warn'],
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm),
            subs: {
        ban: {
            aliases: [],
            data: { name: 'invoke dm ban', description: 'Change ban message for DM', usage: ',invoke dm ban <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm ban add <message>',
                remove: ',invoke dm ban remove',
                view: ',invoke dm ban view',
                test: ',invoke dm ban test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.ban),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm ban add', description: 'Add ban message for DM', usage: ',invoke dm ban add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm ban add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **ban** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'ban');
                        return approve(message, `Updated your custom **ban** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'ban', code);
                    return approve(message, `Added your custom **ban** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm ban remove', description: 'Remove ban message for DM', usage: ',invoke dm ban remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (!check) return warn(message, `You don't have a custom **ban** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    return approve(message, `Removed your custom **ban** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm ban view', description: 'View ban message for DM', usage: ',invoke dm ban view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (!check) return warn(message, `You don't have a custom **ban** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **ban** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm ban test', description: 'Test ban message for DM', usage: ',invoke dm ban test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'ban');
                    if (!check) return warn(message, `You don't have a custom **ban** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        unban: {
            aliases: [],
            data: { name: 'invoke dm unban', description: 'Change unban message for DM', usage: ',invoke dm unban <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm unban add <message>',
                remove: ',invoke dm unban remove',
                view: ',invoke dm unban view',
                test: ',invoke dm unban test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.unban),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm unban add', description: 'Add unban message for DM', usage: ',invoke dm unban add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm unban add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **unban** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'unban');
                        return approve(message, `Updated your custom **unban** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'unban', code);
                    return approve(message, `Added your custom **unban** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm unban remove', description: 'Remove unban message for DM', usage: ',invoke dm unban remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (!check) return warn(message, `You don't have a custom **unban** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    return approve(message, `Removed your custom **unban** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm unban view', description: 'View unban message for DM', usage: ',invoke dm unban view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (!check) return warn(message, `You don't have a custom **unban** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **unban** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm unban test', description: 'Test unban message for DM', usage: ',invoke dm unban test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unban');
                    if (!check) return warn(message, `You don't have a custom **unban** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        kick: {
            aliases: [],
            data: { name: 'invoke dm kick', description: 'Change kick message for DM', usage: ',invoke dm kick <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm kick add <message>',
                remove: ',invoke dm kick remove',
                view: ',invoke dm kick view',
                test: ',invoke dm kick test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.kick),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm kick add', description: 'Add kick message for DM', usage: ',invoke dm kick add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm kick add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **kick** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'kick');
                        return approve(message, `Updated your custom **kick** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'kick', code);
                    return approve(message, `Added your custom **kick** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm kick remove', description: 'Remove kick message for DM', usage: ',invoke dm kick remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (!check) return warn(message, `You don't have a custom **kick** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    return approve(message, `Removed your custom **kick** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm kick view', description: 'View kick message for DM', usage: ',invoke dm kick view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (!check) return warn(message, `You don't have a custom **kick** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **kick** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm kick test', description: 'Test kick message for DM', usage: ',invoke dm kick test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'kick');
                    if (!check) return warn(message, `You don't have a custom **kick** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        mute: {
            aliases: [],
            data: { name: 'invoke dm mute', description: 'Change mute message for DM', usage: ',invoke dm mute <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm mute add <message>',
                remove: ',invoke dm mute remove',
                view: ',invoke dm mute view',
                test: ',invoke dm mute test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.mute),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm mute add', description: 'Add mute message for DM', usage: ',invoke dm mute add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm mute add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **mute** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'mute');
                        return approve(message, `Updated your custom **mute** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'mute', code);
                    return approve(message, `Added your custom **mute** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm mute remove', description: 'Remove mute message for DM', usage: ',invoke dm mute remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (!check) return warn(message, `You don't have a custom **mute** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    return approve(message, `Removed your custom **mute** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm mute view', description: 'View mute message for DM', usage: ',invoke dm mute view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (!check) return warn(message, `You don't have a custom **mute** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **mute** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm mute test', description: 'Test mute message for DM', usage: ',invoke dm mute test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'mute');
                    if (!check) return warn(message, `You don't have a custom **mute** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        unmute: {
            aliases: [],
            data: { name: 'invoke dm unmute', description: 'Change unmute message for DM', usage: ',invoke dm unmute <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm unmute add <message>',
                remove: ',invoke dm unmute remove',
                view: ',invoke dm unmute view',
                test: ',invoke dm unmute test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.unmute),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm unmute add', description: 'Add unmute message for DM', usage: ',invoke dm unmute add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm unmute add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **unmute** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'unmute');
                        return approve(message, `Updated your custom **unmute** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'unmute', code);
                    return approve(message, `Added your custom **unmute** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm unmute remove', description: 'Remove unmute message for DM', usage: ',invoke dm unmute remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (!check) return warn(message, `You don't have a custom **unmute** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    return approve(message, `Removed your custom **unmute** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm unmute view', description: 'View unmute message for DM', usage: ',invoke dm unmute view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (!check) return warn(message, `You don't have a custom **unmute** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **unmute** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm unmute test', description: 'Test unmute message for DM', usage: ',invoke dm unmute test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unmute');
                    if (!check) return warn(message, `You don't have a custom **unmute** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        jail: {
            aliases: [],
            data: { name: 'invoke dm jail', description: 'Change jail message for DM', usage: ',invoke dm jail <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm jail add <message>',
                remove: ',invoke dm jail remove',
                view: ',invoke dm jail view',
                test: ',invoke dm jail test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.jail),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm jail add', description: 'Add jail message for DM', usage: ',invoke dm jail add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm jail add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **jail** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'jail');
                        return approve(message, `Updated your custom **jail** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'jail', code);
                    return approve(message, `Added your custom **jail** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm jail remove', description: 'Remove jail message for DM', usage: ',invoke dm jail remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (!check) return warn(message, `You don't have a custom **jail** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    return approve(message, `Removed your custom **jail** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm jail view', description: 'View jail message for DM', usage: ',invoke dm jail view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (!check) return warn(message, `You don't have a custom **jail** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **jail** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm jail test', description: 'Test jail message for DM', usage: ',invoke dm jail test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'jail');
                    if (!check) return warn(message, `You don't have a custom **jail** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        unjail: {
            aliases: [],
            data: { name: 'invoke dm unjail', description: 'Change unjail message for DM', usage: ',invoke dm unjail <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm unjail add <message>',
                remove: ',invoke dm unjail remove',
                view: ',invoke dm unjail view',
                test: ',invoke dm unjail test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.unjail),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm unjail add', description: 'Add unjail message for DM', usage: ',invoke dm unjail add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm unjail add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **unjail** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'unjail');
                        return approve(message, `Updated your custom **unjail** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'unjail', code);
                    return approve(message, `Added your custom **unjail** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm unjail remove', description: 'Remove unjail message for DM', usage: ',invoke dm unjail remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (!check) return warn(message, `You don't have a custom **unjail** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    return approve(message, `Removed your custom **unjail** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm unjail view', description: 'View unjail message for DM', usage: ',invoke dm unjail view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (!check) return warn(message, `You don't have a custom **unjail** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **unjail** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm unjail test', description: 'Test unjail message for DM', usage: ',invoke dm unjail test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'unjail');
                    if (!check) return warn(message, `You don't have a custom **unjail** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        },
        warn: {
            aliases: [],
            data: { name: 'invoke dm warn', description: 'Change warn message for DM', usage: ',invoke dm warn <add|remove|view|test>' },
            subcommands: ['add', 'remove', 'view', 'test'],
            subUsages: {
                add: ',invoke dm warn add <message>',
                remove: ',invoke dm warn remove',
                view: ',invoke dm warn view',
                test: ',invoke dm warn test'
            },
            execute: async (message, args, client) => sendCard(message, module.exports.subs.dm.subs.warn),
            subs: {
            add: {
                aliases: [],
                data: { name: 'invoke dm warn add', description: 'Add warn message for DM', usage: ',invoke dm warn add <message>' },
                execute: async (message, args) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const code = args.join(' ').trim();
                    if (!code) return warn(message, 'Usage: invoke dm warn add <message>');
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (check) {
                        if (code === check) return warn(message, `You already have this custom **warn** message set up`);
                        run('UPDATE invoke_dm SET embed = ? WHERE guild_id = ? AND command = ?', code, message.guild.id, 'warn');
                        return approve(message, `Updated your custom **warn** message as\n\`\`\`${code}\`\`\``);
                    }
                    run('INSERT INTO invoke_dm (guild_id, command, embed) VALUES (?, ?, ?)', message.guild.id, 'warn', code);
                    return approve(message, `Added your custom **warn** message as\n\`\`\`${code}\`\`\``);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'invoke dm warn remove', description: 'Remove warn message for DM', usage: ',invoke dm warn remove' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (!check) return warn(message, `You don't have a custom **warn** message`);
                    run('DELETE FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    return approve(message, `Removed your custom **warn** message`);
                }
            },
            view: {
                aliases: [],
                data: { name: 'invoke dm warn view', description: 'View warn message for DM', usage: ',invoke dm warn view' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (!check) return warn(message, `You don't have a custom **warn** message`);
                    return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: `${message.author.mention}: Your custom **warn** message is:\n\`\`\`${check}\`\`\`` }] });
                }
            },
            test: {
                aliases: [],
                data: { name: 'invoke dm warn test', description: 'Test warn message for DM', usage: ',invoke dm warn test' },
                execute: async (message) => {
                    if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                    const check = first('SELECT embed FROM invoke_dm WHERE guild_id = ? AND command = ?', message.guild.id, 'warn');
                    if (!check) return warn(message, `You don't have a custom **warn** message`);
                    const code = check.replace(/\{reason\}/g, 'test').replace(/\{duration\}/g, '1 hour').replace(/\{time\}/g, '1 hour');
                    let payload;
                    try {
                        payload = scriptPayload(altConvert(message.member, code));
                    } catch (err) {
                        return warn(message, `An error occurred while creating the embed:\n\`\`\`${err.message}\`\`\``);
                    }
                    return message.reply(payload);
                }
            }
            }
        }
            }
        }
    }
};
