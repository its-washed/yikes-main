const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, needBotPerm, prefix } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { buildComponents, defaultButtons, interfaceEmbed, persistButtons } = require('../../utils/voiceMaster');
const { COLORS, EMOJIS } = require('../../utils/styles');

const REGIONS = ['none', 'brazil', 'hongkong', 'india', 'japan', 'rotterdam', 'russia', 'singapore', 'south-korea', 'southafrica', 'sydney', 'us-central', 'us-east', 'us-south', 'us-west'];

function configured(message) {
    return first('SELECT * FROM voicemaster WHERE guild_id = ?', message.guild.id);
}

function getBannedWords(guildId) {
    const row = first('SELECT banned_words FROM voicemaster WHERE guild_id = ?', guildId);
    if (!row || !row.banned_words) return [];
    try {
        const parsed = JSON.parse(row.banned_words);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function saveBannedWords(guildId, words) {
    run('UPDATE voicemaster SET banned_words = ? WHERE guild_id = ?', JSON.stringify(words), guildId);
}

function resolveCategory(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.find(c => c.type === 4);
    if (mentioned) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return message.guild.channels.cache.find(c => c.type === 4 && c.name.toLowerCase() === raw.toLowerCase()) || null;
}

module.exports = {
    data: {
        name: 'voicemaster',
        description: 'Make temporary voice channels in your server',
        usage: ',voicemaster <setup|unsetup|region|name|bitrate|category|savesettings|blacklist|unblacklist|blacklisted>'
    },
    aliases: ['vm'],
    cooldown: 3,
    subcommands: ['setup', 'unsetup', 'region', 'name', 'bitrate', 'category', 'savesettings', 'blacklist', 'unblacklist', 'blacklisted'],
    subUsages: {
        setup: ',voicemaster setup',
        unsetup: ',voicemaster unsetup',
        region: ',voicemaster region <region|none>',
        name: ",voicemaster name {user.display_name}'s vc",
        bitrate: ',voicemaster bitrate <8-384>',
        category: ',voicemaster category [#category]',
        savesettings: ',voicemaster savesettings <on|off>',
        blacklist: ',voicemaster blacklist <words>',
        unblacklist: ',voicemaster unblacklist <words>',
        blacklisted: ',voicemaster blacklisted'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        setup: {
            aliases: [],
            data: { name: 'voicemaster setup', description: 'Start the setup for the VoiceMaster module', usage: ',voicemaster setup' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                if (configured(message)) {
                    return warn(message, `VoiceMaster is **already** configured\n> Use \`${prefix(message)}voicemaster unsetup\` to reset it`);
                }
                const loading = await message.reply({
                    embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: Creating the VoiceMaster interface` }]
                });
                let category;
                try {
                    category = await message.guild.channels.create({ name: 'voicemaster', type: 4, reason: 'voicemaster category created' });
                } catch (err) {
                    return loading.edit({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: I lack permissions to create categories in this server.` }] }).catch(() => {});
                }
                let voice, text;
                try {
                    voice = await message.guild.channels.create({ name: 'join to create', type: 2, parent: category.id, reason: 'voicemaster channel created' });
                    text = await message.guild.channels.create({
                        name: 'interface',
                        type: 0,
                        parent: category.id,
                        reason: 'voicemaster interface created',
                        permissionOverwrites: [{ id: message.guild.id, deny: ['SendMessages'] }]
                    });
                } catch (err) {
                    category.delete({ reason: 'setup failed' }).catch(() => {});
                    return loading.edit({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Failed to create channels, use \`${prefix(message)}voicemaster unsetup\` and try again` }] }).catch(() => {});
                }
                const embed = interfaceEmbed(message.guild, client, {
                    title: 'VoiceMaster Interface',
                    description: `Control the voice channels created from ${voice}`
                });
                const buttons = defaultButtons();
                try {
                    await text.send({ embeds: [embed], components: buildComponents(buttons) });
                } catch (err) {
                    return loading.edit({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: I am missing permissions to setup the **voicemaster** module` }] }).catch(() => {});
                }
                run('INSERT OR REPLACE INTO voicemaster (guild_id, channel_id, text) VALUES (?, ?, ?)', message.guild.id, voice.id, text.id);
                persistButtons(message.guild.id, buttons);
                return loading.edit({
                    embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Created the VoiceMaster interface in ${text} and the voice channel in ${voice}` }]
                }).catch(() => {});
            }
        },

        unsetup: {
            aliases: [],
            data: { name: 'voicemaster unsetup', description: 'Reset server configuration for VoiceMaster', usage: ',voicemaster unsetup' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const check = configured(message);
                if (!check) return warn(message, 'VoiceMaster is **not** configured');
                const loading = await message.reply({
                    embeds: [{ color: COLORS.NEUTRAL, description: `${EMOJIS.LOADING} ${message.author}: Disabling the VoiceMaster interface` }]
                });
                const voice = message.guild.channels.cache.get(String(check.channel_id));
                if (voice) {
                    try {
                        if (voice.type === 2) {
                            if (voice.parent) {
                                for (const channel of [...voice.parent.children.cache.values()]) {
                                    await channel.delete({ reason: `VoiceMaster module disabled by ${message.author.tag}` }).catch(() => {});
                                }
                                await voice.parent.delete({ reason: `VoiceMaster module disabled by ${message.author.tag}` }).catch(() => {});
                            } else {
                                await voice.delete({ reason: `VoiceMaster module disabled by ${message.author.tag}` }).catch(() => {});
                            }
                        }
                    } catch (err) {
                        if (err.code === 50074) {
                            return loading.edit({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${message.author}: Cannot delete a channel required for community servers.` }] }).catch(() => {});
                        }
                    }
                }
                run('DELETE FROM voicemaster WHERE guild_id = ?', message.guild.id);
                run('DELETE FROM voicemaster_buttons WHERE guild_id = ?', message.guild.id);
                return loading.edit({
                    embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${message.author}: Successfully disabled the VoiceMaster module` }]
                }).catch(() => {});
            }
        },

        region: {
            aliases: [],
            data: { name: 'voicemaster region', description: 'Set the region for the voice channels created by the bot', usage: ',voicemaster region <region>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const region = (args[0] || '').toLowerCase();
                if (!REGIONS.includes(region)) {
                    return warn(message, `Invalid region, please choose one of the following: ${REGIONS.slice(1).map(r => `\`${r}\``).join(', ')}`);
                }
                const check = configured(message);
                if (!check) return warn(message, 'VoiceMaster is **not** configured');
                if (region === 'none') {
                    run('UPDATE voicemaster SET region = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Set the voice channel region to **default**');
                }
                run('UPDATE voicemaster SET region = ? WHERE guild_id = ?', region, message.guild.id);
                return approve(message, `Set the default voice channel region to **${region}**`);
            }
        },

        name: {
            aliases: [],
            data: { name: 'voicemaster name', description: 'Set the name for the voice channels created by the bot', usage: ",voicemaster name {user.display_name}'s vc" },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name');
                const check = configured(message);
                if (!check) return warn(message, 'VoiceMaster is **not** configured');
                if (name === 'none') {
                    run('UPDATE voicemaster SET name = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Set the voice channel name to **default**');
                }
                run('UPDATE voicemaster SET name = ? WHERE guild_id = ?', name, message.guild.id);
                return approve(message, `Set the default voice channel name to **${name}**`);
            }
        },

        bitrate: {
            aliases: [],
            data: { name: 'voicemaster bitrate', description: 'Set the bitrate for the voice channels created by the bot', usage: ',voicemaster bitrate <8-384>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const bitrate = parseInt(args[0], 10);
                if (isNaN(bitrate) || bitrate < 8 || bitrate > 384) return warn(message, 'Bitrate must be between 8 and 384');
                const check = configured(message);
                if (!check) return warn(message, 'VoiceMaster is **not** configured');
                const value = bitrate * 1000;
                run('UPDATE voicemaster SET bitrate = ? WHERE guild_id = ?', value, message.guild.id);
                return approve(message, `Set the default voice channel bitrate to **${value}**`);
            }
        },

        category: {
            aliases: [],
            data: { name: 'voicemaster category', description: 'Set the category for the voice channels created by the bot', usage: ',voicemaster category [#category]' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const check = configured(message);
                if (!check) return warn(message, 'VoiceMaster is **not** configured');
                if (!args.length || !args.join(' ').trim()) {
                    run('UPDATE voicemaster SET category = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Set the voice channel category to **default**');
                }
                const category = resolveCategory(message, args.join(' '));
                if (!category) return warn(message, `Category **${args.join(' ')}** couldn't be found`);
                run('UPDATE voicemaster SET category = ? WHERE guild_id = ?', category.id, message.guild.id);
                return approve(message, `Set the default voice channel category to **${category.name}**`);
            }
        },

        savesettings: {
            aliases: [],
            data: { name: 'voicemaster savesettings', description: 'Enable or disable if user settings should be saved', usage: ',voicemaster savesettings <on|off>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const option = (args[0] || '').toLowerCase();
                const check = configured(message);
                if (!check) return warn(message, 'VoiceMaster is **not** configured');
                if (option === 'on') {
                    run('UPDATE voicemaster SET savesettings = 1 WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Enabled that user settings get saved from old channel');
                }
                if (option === 'off') {
                    run('UPDATE voicemaster SET savesettings = 0 WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Disabled that user settings get saved from old channel');
                }
                return warn(message, 'Invalid option. Valid options are: `on` & `off`');
            }
        },

        blacklist: {
            aliases: [],
            data: { name: 'voicemaster blacklist', description: 'Blacklist a word that can no longer be used as a voicemaster name', usage: ',voicemaster blacklist <words>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const words = args.join(' ').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
                if (!words.length) return warn(message, 'You must provide at least one word');
                const banned = getBannedWords(message.guild.id);
                const added = [];
                for (const word of words) {
                    if (banned.includes(word)) {
                        await warn(message, `Word \`${word}\` is already banned.`);
                    } else {
                        banned.push(word);
                        added.push(word);
                    }
                }
                if (added.length) {
                    saveBannedWords(message.guild.id, banned);
                    return approve(message, `Following words have been added:\n> **${added.join(', ')}**`);
                }
                return warn(message, 'No new words were added to the banned words list.');
            }
        },

        unblacklist: {
            aliases: [],
            data: { name: 'voicemaster unblacklist', description: 'Unblacklist a word to allow it as a voicemaster name again', usage: ',voicemaster unblacklist <words>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const words = args.join(' ').split(',').map(w => w.trim().toLowerCase()).filter(Boolean);
                if (!words.length) return warn(message, 'You must provide at least one word');
                const banned = getBannedWords(message.guild.id);
                const removed = [];
                for (const word of words) {
                    const idx = banned.indexOf(word);
                    if (idx === -1) {
                        await warn(message, `Word \`${word}\` is not banned.`);
                    } else {
                        banned.splice(idx, 1);
                        removed.push(word);
                    }
                }
                if (removed.length) {
                    saveBannedWords(message.guild.id, banned);
                    return approve(message, `Following words have been removed:\n> **${removed.join(', ')}**`);
                }
                return warn(message, 'No words were removed from the banned words list.');
            }
        },

        blacklisted: {
            aliases: [],
            data: { name: 'voicemaster blacklisted', description: 'Shows all blacklisted words for voicemaster names', usage: ',voicemaster blacklisted' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
                const banned = getBannedWords(message.guild.id);
                if (!banned.length) return message.reply({ embeds: [{ color: COLORS.NEUTRAL, description: 'There are no banned words.' }] });
                const lines = banned.map(word => `**${word}**`);
                return paginate(message, lines, 'Blacklisted words', {
                    name: message.guild.name,
                    icon_url: message.guild.iconURL()
                });
            }
        }
    }
};
