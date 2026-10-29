const { PermissionFlagsBits } = require('discord.js');
const { first, run, query } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needBotPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { needVcOwner, vcRenameAllowed } = require('../../utils/predicates');
const { Paginator } = require('../../utils/pagination');
const { PRESERVE } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

const EVELINA_GUILD = '1228371886690537624';
const EVELINA_ALLOWED_ROLE = '1351298298207535156';

const loadCooldowns = new Map();

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

function containsBannedWord(words, text) {
    const lower = String(text || '').toLowerCase();
    return words.some(word => word && lower.includes(word));
}

function resolveMember(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.members.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return null;
}

function resolveTarget(message, text) {
    const raw = String(text || '').trim();
    if (!raw) return null;
    const role = message.mentions.roles.first();
    if (role) return { target: role, type: 'role' };
    const user = message.mentions.users.first();
    if (user) return { target: user, type: 'member' };
    const id = raw.replace(/[<@!&>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byId = message.guild.roles.cache.get(id);
        if (byId) return { target: byId, type: 'role' };
        const userById = message.client.users.cache.get(id);
        if (userById) return { target: userById, type: 'member' };
    }
    const byName = message.guild.roles.cache.find(r => r.name.toLowerCase() === raw.toLowerCase());
    if (byName) return { target: byName, type: 'role' };
    const member = message.guild.members.cache.find(m => m.user.username.toLowerCase() === raw.toLowerCase() || m.displayName.toLowerCase() === raw.toLowerCase());
    if (member) return { target: member.user, type: 'member' };
    return null;
}

function captureOverwrites(guild, channel) {
    const out = {};
    for (const [id, ow] of channel.permissionOverwrites.cache) {
        const type = guild.roles.cache.has(id) ? 'role' : 'member';
        out[id] = { type, allow: Number(ow.allow.bitfield), deny: Number(ow.deny.bitfield) };
    }
    const everyone = channel.permissionOverwrites.cache.get(guild.id);
    const hidden = everyone ? everyone.deny.has(PermissionFlagsBits.ViewChannel) : false;
    const locked = everyone ? everyone.deny.has(PermissionFlagsBits.Connect) : false;
    if (hidden) out[guild.id] = { type: 'role', allow: 0, deny: 1024 };
    if (locked) {
        if (out[guild.id]) out[guild.id].deny |= 1048576;
        else out[guild.id] = { type: 'role', allow: 0, deny: 1048576 };
    }
    return out;
}

async function applyPreset(guild, channel, settings, overwrites, reason) {
    const userLimit = Number.isInteger(settings.user_limit) ? settings.user_limit : 0;
    await channel.edit({
        name: settings.name,
        bitrate: settings.bitrate,
        userLimit,
        reason
    });
    const skipped = [];
    const payload = [];
    for (const [id, data] of Object.entries(overwrites)) {
        const target = data.type === 'role' ? guild.roles.cache.get(id) : guild.members.cache.get(id);
        if (target) payload.push({ id, type: data.type === 'role' ? 'role' : 'member', allow: BigInt(data.allow || 0), deny: BigInt(data.deny || 0) });
        else skipped.push(id);
    }
    if (payload.length) await channel.edit({ permissionOverwrites: payload, reason });
    return skipped;
}

async function sendLoading(message, text) {
    return message.reply({
        embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: ${text}` }]
    });
}

function loadingResult(sent, color, emoji, text) {
    return sent.edit({ embeds: [{ color, description: `${emoji} ${text}` }] }).catch(() => sent);
}

module.exports = {
    data: {
        name: 'voice',
        description: 'Manage your VoiceMaster channel',
        usage: ',voice <lock|unlock|rename|hide|reveal|permit|reject|kick|claim|transfer|status|limit|preset>'
    },
    aliases: ['vc'],
    cooldown: 3,
    subcommands: ['lock', 'unlock', 'rename', 'hide', 'reveal', 'permit', 'reject', 'kick', 'claim', 'transfer', 'status', 'limit', 'preset'],
    subUsages: {
        lock: ',voice lock',
        unlock: ',voice unlock',
        rename: ',voice rename <name>',
        hide: ',voice hide',
        reveal: ',voice reveal',
        permit: ',voice permit <user>',
        reject: ',voice reject <user>',
        kick: ',voice kick <user>',
        claim: ',voice claim',
        transfer: ',voice transfer <user>',
        status: ',voice status <status>',
        limit: ',voice limit <0-99>',
        preset: ',voice preset <add|load|autoload|update|edit|delete|list>'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        lock: {
            aliases: [],
            data: { name: 'voice lock', description: 'Lock your voice channel', usage: ',voice lock' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = message.member.voice.channel;
                await channel.permissionOverwrites.edit(message.guild.id, { Connect: false }, { reason: `Channel locked by ${message.author.tag}` }).catch(err => warn(message, `Failed to lock the channel\n\`\`\`\`${err.message}\`\`\`\``));
                if (message.guild.id === EVELINA_GUILD) {
                    const allowedRole = message.guild.roles.cache.get(EVELINA_ALLOWED_ROLE);
                    if (allowedRole) {
                        await channel.permissionOverwrites.edit(allowedRole, { Connect: true }, { reason: `Allow role ${allowedRole.name} to connect` }).catch(() => {});
                    }
                }
                return approve(message, `locked ${channel}`);
            }
        },

        unlock: {
            aliases: [],
            data: { name: 'voice unlock', description: 'Unlock your voice channel', usage: ',voice unlock' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = message.member.voice.channel;
                await channel.permissionOverwrites.edit(message.guild.id, { Connect: true }, { reason: `Channel unlocked by ${message.author.tag}` }).catch(err => warn(message, `Failed to unlock the channel\n\`\`\`\`${err.message}\`\`\`\``));
                return approve(message, `Unlocked ${channel}`);
            }
        },

        rename: {
            aliases: [],
            data: { name: 'voice rename', description: 'Rename your voice channel', usage: ',voice rename <name>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!vcRenameAllowed(message.member.voice.channel.id)) {
                    return warn(message, 'You renamed this channel too many times in a short amount of time');
                }
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name');
                if (containsBannedWord(getBannedWords(message.guild.id), name)) {
                    return warn(message, 'This voice channel name contains a prohibited word. Please choose a different name.');
                }
                const channel = message.member.voice.channel;
                try {
                    await channel.edit({ name, reason: `Voice channel renamed by ${message.author.tag}` });
                } catch (err) {
                    if (err.code === 50035) return warn(message, 'Name contains words not allowed for servers in Server Discover');
                    return warn(message, `Failed to rename the channel\n\`\`\`\`${err.message}\`\`\`\``);
                }
                const row = first('SELECT savesettings FROM voicemaster WHERE guild_id = ?', message.guild.id);
                if (row && row.savesettings) {
                    run('INSERT OR REPLACE INTO voicemaster_names (guild_id, user_id, name) VALUES (?, ?, ?)', message.guild.id, message.author.id, name);
                }
                return approve(message, `Renamed the voice channel to **${name}**`);
            }
        },

        hide: {
            aliases: [],
            data: { name: 'voice hide', description: 'Hide your voice channel', usage: ',voice hide' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = message.member.voice.channel;
                await channel.permissionOverwrites.edit(message.guild.id, { ViewChannel: false }, { reason: `Channel hidden by ${message.author.tag}` }).catch(err => warn(message, `Failed to hide the channel\n\`\`\`\`${err.message}\`\`\`\``));
                return approve(message, `Hidden ${channel}`);
            }
        },

        reveal: {
            aliases: [],
            data: { name: 'voice reveal', description: 'Reveal your voice channel', usage: ',voice reveal' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const channel = message.member.voice.channel;
                await channel.permissionOverwrites.edit(message.guild.id, { ViewChannel: true }, { reason: `Channel revealed by ${message.author.tag}` }).catch(err => warn(message, `Failed to reveal the channel\n\`\`\`\`${err.message}\`\`\`\``));
                return approve(message, `Revealed ${channel}`);
            }
        },

        permit: {
            aliases: [],
            data: { name: 'voice permit', description: 'Permit a member or role to join your voice channel', usage: ',voice permit <user>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const member = resolveMember(message, args.join(' '));
                if (!member) return warn(message, 'You must mention a user or provide an id');
                const channel = message.member.voice.channel;
                await channel.permissionOverwrites.edit(member, { Connect: true, ViewChannel: true }, { reason: `Permitted by ${message.author.tag}` }).catch(err => warn(message, `Failed to permit the member\n\`\`\`\`${err.message}\`\`\`\``));
                return approve(message, `${member} is allowed to join ${channel}`);
            }
        },

        reject: {
            aliases: [],
            data: { name: 'voice reject', description: 'Reject a member or role from joining your voice channel', usage: ',voice reject <user>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const member = resolveMember(message, args.join(' '));
                if (!member) return warn(message, 'You must mention a user or provide an id');
                const channel = message.member.voice.channel;
                if (member.id === message.author.id) return message.reply({ content: 'why would u wanna kick urself >_<' });
                if (member.voice && member.voice.channelId === channel.id) {
                    await member.voice.disconnect(`Rejected from voice channel by ${message.author.tag}`).catch(() => {});
                }
                await channel.permissionOverwrites.edit(member, { Connect: false }, { reason: `Rejected by ${message.author.tag}` }).catch(err => warn(message, `Failed to reject the member\n\`\`\`\`${err.message}\`\`\`\``));
                return approve(message, `${member} is not allowed to join ${channel} anymore`);
            }
        },

        kick: {
            aliases: [],
            data: { name: 'voice kick', description: 'Kick a member or role from joining your voice channel', usage: ',voice kick <user>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const member = resolveMember(message, args.join(' '));
                if (!member) return warn(message, 'You must mention a user or provide an id');
                const channel = message.member.voice.channel;
                if (member.id === message.author.id) return message.reply({ content: 'why would u wanna kick urself >_<' });
                if (!member.voice || member.voice.channelId !== channel.id) {
                    return warn(message, `${member} isn't in **your** voice channel`);
                }
                await member.voice.disconnect(`Kicked from voice channel by ${message.author.tag}`).catch(() => {});
                return approve(message, `${member} got kicked from ${channel}`);
            }
        },

        claim: {
            aliases: [],
            data: { name: 'voice claim', description: 'Claim an inactive voice channel', usage: ',voice claim' },
            async execute(message, args, client, config) {
                const voice = message.member.voice.channel;
                if (!voice) return warn(message, 'You are **not** in a voice channel');
                const row = first('SELECT user_id FROM voicemaster_channels WHERE voice = ?', voice.id);
                if (!row) return warn(message, 'You are **not** in a voice channel made by the bot');
                if (String(row.user_id) === message.author.id) return warn(message, 'You are the **owner** of this voice channel');
                const members = [...voice.members.values()];
                if (members.some(m => m.id === String(row.user_id))) return warn(message, 'The owner is still in the voice channel');
                run('UPDATE voicemaster_channels SET user_id = ? WHERE voice = ?', message.author.id, voice.id);
                const oldOwner = message.guild.members.cache.get(String(row.user_id));
                if (oldOwner) {
                    await voice.permissionOverwrites.edit(oldOwner, { ViewChannel: null, Connect: null }, { reason: 'Voice channel claimed' }).catch(() => {});
                }
                await voice.permissionOverwrites.edit(message.author, { ViewChannel: true, Connect: true }, { reason: 'Voice channel claimed' }).catch(() => {});
                return approve(message, 'You are the new **owner** of this voice channel');
            }
        },

        transfer: {
            aliases: [],
            data: { name: 'voice transfer', description: 'Transfer ownership of your voice channel to another member', usage: ',voice transfer <user>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                const member = resolveMember(message, args.join(' '));
                if (!member) return warn(message, 'You must mention a user or provide an id');
                const channel = message.member.voice.channel;
                if (member.id === message.author.id) return warn(message, 'You are already the **owner** of this **voice channel**');
                if (!member.voice || member.voice.channelId !== channel.id) return warn(message, `${member} is not in your voice channel`);
                run('UPDATE voicemaster_channels SET user_id = ? WHERE voice = ?', member.id, channel.id);
                return approve(message, `Transfered the voice ownership to ${member}`);
            }
        },

        status: {
            aliases: [],
            data: { name: 'voice status', description: "Chance the status of your voice channel", usage: ',voice status <status>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const status = args.join(' ').trim();
                if (!status) return warn(message, 'You must provide a status');
                const channel = message.member.voice.channel;
                try {
                    await message.client.rest.put(`/channels/${channel.id}/voice-status`, { body: { status } });
                } catch (err) {
                    return warn(message, `Failed to change the voice channel status\n\`\`\`\`${err.message}\`\`\`\``);
                }
                return approve(message, `Changed the voice channel status to **${status}**`);
            }
        },

        limit: {
            aliases: [],
            data: { name: 'voice limit', description: 'Change the user limit of your voice channel', usage: ',voice limit <0-99>' },
            async execute(message, args, client, config) {
                if (!await needVcOwner(message)) return;
                if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return;
                const limit = parseInt(args[0], 10);
                if (isNaN(limit) || limit < 0 || limit > 99) return warn(message, 'User limit must be between 0 and 99');
                const channel = message.member.voice.channel;
                await channel.edit({ userLimit: limit, reason: `Voice channel limit changed by ${message.author.tag}` }).catch(err => warn(message, `Failed to change the limit\n\`\`\`\`${err.message}\`\`\`\``));
                return approve(message, `Changed the user limit to **${limit}**`);
            }
        },

        preset: {
            aliases: ['p'],
            data: { name: 'voice preset', description: 'Manage your voice channel presets', usage: ',voice preset <add|load|autoload|update|edit|delete|list>' },
            subcommands: ['add', 'load', 'autoload', 'update', 'edit', 'delete', 'list'],
            async execute(message, args, client, config) {
                return sendCard(message, module.exports.subs.preset);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'voice preset add', description: 'Create a preset for the current temp voice channel', usage: ',voice preset add <name>' },
                    async execute(message, args, client, config) {
                        if (!await needVcOwner(message)) return;
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'You must provide a name');
                        const channel = message.member.voice.channel;
                        const count = first('SELECT COUNT(*) AS c FROM voicemaster_presets WHERE user_id = ?', message.author.id);
                        if (count && count.c >= 10) return warn(message, 'You can only have up to **10 presets**');
                        const existing = first('SELECT 1 AS ok FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        if (existing) return warn(message, `There is **already** a preset created named **${name}**`);
                        const loading = await sendLoading(message, 'Creating your preset...');
                        const settings = { name: channel.name, bitrate: channel.bitrate, user_limit: channel.userLimit };
                        const overwrites = captureOverwrites(message.guild, channel);
                        run('INSERT INTO voicemaster_presets (user_id, name, settings, overwrites) VALUES (?, ?, ?, ?)',
                            message.author.id, name, JSON.stringify(settings), JSON.stringify(overwrites));
                        return loadingResult(loading, COLORS.SUCCESS, EMOJIS.APPROVE, `${message.author}: Preset with name **${name}** has been created!`);
                    }
                },
                load: {
                    aliases: [],
                    data: { name: 'voice preset load', description: 'Apply a saved preset to the current temp voice channel', usage: ',voice preset load <name>' },
                    async execute(message, args, client, config) {
                        if (!await needVcOwner(message)) return;
                        const now = Date.now();
                        const last = loadCooldowns.get(message.author.id) || 0;
                        if (now - last < 60000) {
                            const wait = Math.ceil((60000 - (now - last)) / 1000);
                            return warn(message, `You are on cooldown, try again in **${wait}s**`);
                        }
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'You must provide a name');
                        const channel = message.member.voice.channel;
                        const record = first('SELECT settings, overwrites FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        if (!record) return warn(message, `No preset found with the name **${name}**`);
                        loadCooldowns.set(message.author.id, now);
                        const loading = await sendLoading(message, `Loading **${name}** preset to your vc..`);
                        let settings, overwrites;
                        try {
                            settings = JSON.parse(record.settings);
                            overwrites = JSON.parse(record.overwrites);
                        } catch (err) {
                            return loadingResult(loading, COLORS.ERROR, EMOJIS.DENY, `${message.author}: Error loading preset **${name}**\n\`\`\`${err.message}\`\`\``);
                        }
                        try {
                            const skipped = await applyPreset(message.guild, channel, settings, overwrites, `Loaded preset ${name} from ${message.author.username}`);
                            let msg = `Preset **${name}** loaded successfully!`;
                            if (skipped.length) msg += `\nSkipped invalid targets: ${skipped.join(', ')}`;
                            return loadingResult(loading, COLORS.SUCCESS, EMOJIS.APPROVE, `${message.author}: ${msg}`);
                        } catch (err) {
                            return loadingResult(loading, COLORS.ERROR, EMOJIS.DENY, `${message.author}: Error loading preset **${name}**\n\`\`\`${err.message}\`\`\``);
                        }
                    }
                },
                autoload: {
                    aliases: [],
                    data: { name: 'voice preset autoload', description: 'Automatically load the preset of the user when they join a voice channel', usage: ',voice preset autoload <name|none>' },
                    async execute(message, args, client, config) {
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'You must provide a preset name');
                        const presets = query('SELECT 1 AS ok FROM voicemaster_presets WHERE user_id = ?', message.author.id) || [];
                        if (!presets.length) return warn(message, "You don't have a presets");
                        if (name === 'none') {
                            run('UPDATE voicemaster_presets SET autoload = 0 WHERE user_id = ? AND autoload = 1', message.author.id);
                            return approve(message, 'Disabled **autoload** for all presets');
                        }
                        const result = first('SELECT autoload FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        if (!result) return warn(message, `No preset named **${name}** found`);
                        run('UPDATE voicemaster_presets SET autoload = 0 WHERE user_id = ?', message.author.id);
                        run('UPDATE voicemaster_presets SET autoload = 1 WHERE user_id = ? AND name = ?', message.author.id, name);
                        return approve(message, `Preset **${name}** will now be **automatically loaded** when you join a voice channel`);
                    }
                },
                update: {
                    aliases: [],
                    data: { name: 'voice preset update', description: "Update an existing preset with the current temp voice channel's settings.", usage: ',voice preset update <name>' },
                    async execute(message, args, client, config) {
                        if (!await needVcOwner(message)) return;
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'You must provide a name');
                        const channel = message.member.voice.channel;
                        const exists = first('SELECT 1 AS ok FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        if (!exists) return warn(message, `No preset named **${name}** found.\nUse \`voice preset add ${name}\` instead.`);
                        const settings = { name: channel.name, bitrate: channel.bitrate, user_limit: channel.userLimit };
                        const captured = captureOverwrites(message.guild, channel);
                        const overwrites = {};
                        for (const [id, data] of Object.entries(captured)) {
                            const stillExists = data.type === 'role'
                                ? message.guild.roles.cache.has(id)
                                : message.guild.members.cache.has(id);
                            if (stillExists) overwrites[id] = data;
                        }
                        run('UPDATE voicemaster_presets SET settings = ?, overwrites = ? WHERE user_id = ? AND name = ?',
                            JSON.stringify(settings), JSON.stringify(overwrites), message.author.id, name);
                        return approve(message, `Preset **${name}** has been **successfully** updated!`);
                    }
                },
                edit: {
                    aliases: [],
                    data: { name: 'voice preset edit', description: 'Add/remove a user or role to the overwrites of a preset', usage: ',voice preset edit <name> <user|role>' },
                    async execute(message, args, client, config) {
                        const name = (args[0] || '').trim();
                        if (!name) return warn(message, 'You must provide a preset name');
                        const resolved = resolveTarget(message, args.slice(1).join(' '));
                        if (!resolved) return warn(message, 'You must mention a user or role, or provide an id');
                        const record = first('SELECT overwrites FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        if (!record) return warn(message, `No preset found with the name **${name}**`);
                        let overwrites;
                        try {
                            overwrites = JSON.parse(record.overwrites) || {};
                        } catch (err) {
                            overwrites = {};
                        }
                        const key = String(resolved.target.id);
                        if (overwrites[key]) {
                            delete overwrites[key];
                            await run('UPDATE voicemaster_presets SET overwrites = ? WHERE user_id = ? AND name = ?', JSON.stringify(overwrites), message.author.id, name);
                            return approve(message, `Removed **${resolved.target}** from the overwrites of the preset **${name}**`);
                        }
                        overwrites[key] = { type: resolved.type, allow: 0, deny: 0 };
                        await run('UPDATE voicemaster_presets SET overwrites = ? WHERE user_id = ? AND name = ?', JSON.stringify(overwrites), message.author.id, name);
                        return approve(message, `Added **${resolved.target}** to the overwrites of the preset **${name}**`);
                    }
                },
                delete: {
                    aliases: [],
                    data: { name: 'voice preset delete', description: 'Delete a voicemaster preset', usage: ',voice preset delete <name>' },
                    async execute(message, args, client, config) {
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'You must provide a name');
                        const existing = first('SELECT 1 AS ok FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        if (!existing) return warn(message, `There is no preset saved with the name **${name}**`);
                        run('DELETE FROM voicemaster_presets WHERE user_id = ? AND name = ?', message.author.id, name);
                        return approve(message, `Preset **${name}** has been successfully deleted`);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'voice preset list', description: 'List all presets created by the user', usage: ',voice preset list' },
                    async execute(message, args, client, config) {
                        const results = query('SELECT name, settings, overwrites FROM voicemaster_presets WHERE user_id = ?', message.author.id) || [];
                        if (!results.length) return warn(message, 'You have **no** presets created');
                        const pages = [];
                        for (let i = 0; i < results.length; i += 2) {
                            const fields = [];
                            for (const preset of results.slice(i, i + 2)) {
                                let settings = {};
                                let overwrites = {};
                                try { settings = JSON.parse(preset.settings) || {}; } catch (err) {}
                                try { overwrites = JSON.parse(preset.overwrites) || {}; } catch (err) {}
                                const allowed = [];
                                const disallowed = [];
                                for (const [uid, perms] of Object.entries(overwrites)) {
                                    if (uid === message.guild.id) continue;
                                    const mention = perms.type === 'role' ? `<@&${uid}>` : `<@${uid}>`;
                                    if (perms.allow) allowed.push(mention);
                                    if (perms.deny) disallowed.push(mention);
                                }
                                fields.push({
                                    name: `**${preset.name}**`,
                                    value: [
                                        `> **Channel Name:** ${settings.name}`,
                                        `> **Bitrate:** ${settings.bitrate}`,
                                        `> **User Limit:** ${settings.user_limit || 'No limit'}`,
                                        `> **Allowed:** ${allowed.length ? allowed.join(', ') : 'N/A'}`,
                                        `> **Disallowed:** ${disallowed.length ? disallowed.join(', ') : 'N/A'}`
                                    ].join('\n'),
                                    inline: true
                                });
                            }
                            pages.push({
                                [PRESERVE]: true,
                                color: COLORS.NEUTRAL,
                                title: 'Voice Presets',
                                author: { name: message.author.username, icon_url: message.author.displayAvatarURL() },
                                fields,
                                footer: { text: `Page ${pages.length + 1}/${Math.ceil(results.length / 2)} (${results.length} entries)` }
                            });
                        }
                        const paginator = new Paginator(pages, { userId: message.author.id });
                        const sent = await message.reply({
                            embeds: paginator.buildEmbeds(),
                            components: pages.length > 1 ? [paginator.buildRow()] : []
                        });
                        if (pages.length > 1) await paginator.start(message.channel, sent);
                        return sent;
                    }
                }
            }
        }
    }
};
