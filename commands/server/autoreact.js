const { PermissionFlagsBits, parseEmoji } = require('discord.js');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { query, first, run } = require('../../utils/database');
const { successEmbed, errorEmbed } = require('../../utils/embeds');
const { EMOJIS } = require('../../utils/styles');

function guildAuthor(message) {
    return { name: message.guild.name, icon_url: message.guild.iconURL() || undefined };
}

function parseReactions(value) {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        return [];
    }
}

function resolveReaction(guild, token) {
    if (!token) return null;
    const custom = parseEmoji(token);
    if (custom && custom.id) {
        const found = guild.emojis.cache.get(custom.id) || guild.emojis.cache.find(e => e.name === custom.name);
        if (!found) return null;
        return `<:${found.name}:${found.id}>`;
    }
    const bare = token.replace(/^:+|:+$/g, '');
    const guildEmoji = guild.emojis.cache.find(e => e.name === bare);
    if (guildEmoji) return `<:${guildEmoji.name}:${guildEmoji.id}>`;
    if (token.includes(':')) return null;
    return token;
}

function resolveReactions(guild, input) {
    const out = [];
    for (const token of input.split(/\s+/).filter(Boolean)) {
        const resolved = resolveReaction(guild, token);
        if (!resolved) continue;
        out.push(resolved);
    }
    return out;
}

module.exports = {
    data: {
        name: 'autoreact',
        description: 'Add a reaction(s) to a message',
        usage: ',autoreact <add|remove|list|reset|channel>'
    },
    subcommands: ['add', 'remove', 'list', 'reset', 'channel'],
    cooldown: 5,

    async execute(message) {
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'autoreact add', description: 'Adds a reaction trigger to guild', usage: ',autoreact add panda, :f_thumbsup:' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const content = args.join(' ').trim();
                const parts = content.split(', ');
                if (parts.length === 1) return warn(message, 'No reactions found. Make sure to use a `,` to split the trigger from the reactions');
                const trigger = parts[0].trim();
                if (!trigger) return warn(message, 'No valid trigger found');
                const reactions = resolveReactions(message.guild, parts.slice(1).join(' '));
                if (!reactions.length) return warn(message, "Emojis are not **available** on this server or it's not a **valid** emoji");

                const check = first('SELECT * FROM autoreact WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger);
                if (!check) {
                    run('INSERT INTO autoreact (guild_id, "trigger", reactions) VALUES (?, ?, ?)', message.guild.id, trigger, JSON.stringify(reactions));
                } else {
                    run('UPDATE autoreact SET reactions = ? WHERE guild_id = ? AND "trigger" = ?', JSON.stringify(reactions), message.guild.id, trigger);
                }
                return approve(message, `Your autoreact for **${trigger}** has been created with the reactions ${reactions.join(' ')}`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'autoreact remove', description: 'Removes a reaction trigger in guild', usage: ',autoreact remove skull' },
            async execute(message, args) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const trigger = args.join(' ').trim();
                if (!trigger) return warn(message, 'No valid trigger provided');
                const check = first('SELECT * FROM autoreact WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger);
                if (!check) return warn(message, 'There is no **autoreact** with this trigger');
                run('DELETE FROM autoreact WHERE guild_id = ? AND "trigger" = ?', message.guild.id, trigger);
                return approve(message, `Removed **${trigger}** from autoreact`);
            }
        },

        list: {
            aliases: [],
            data: { name: 'autoreact list', description: 'View a list of every reaction trigger in guild', usage: ',autoreact list' },
            async execute(message) {
                const rows = query('SELECT * FROM autoreact WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There are no autoreactions available in this server');
                const lines = rows.map(row => `${row.trigger} - ${parseReactions(row.reactions).join(' ')}`);
                return paginate(message, lines, 'Autoreactions', guildAuthor(message));
            }
        },

        reset: {
            aliases: [],
            data: { name: 'autoreact reset', description: 'Reset all reaction triggers in guild', usage: ',autoreact reset' },
            async execute(message) {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const rows = query('SELECT * FROM autoreact WHERE guild_id = ?', message.guild.id);
                if (!rows.length) return warn(message, 'There are no autoreactions available in this server');
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **RESET** all autoreactions in this server?`,
                    async i => {
                        run('DELETE FROM autoreact WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Deleted all autoreactions in this server`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Autoreactions deletion got canceled`)], components: [] }).catch(() => {});
                    });
            }
        },

        channel: {
            aliases: [],
            data: { name: 'autoreact channel', description: 'Set up autoreact channel', usage: ',autoreact channel <add|remove|list|reset>' },
            subcommands: ['add', 'remove', 'list', 'reset'],
            async execute(message) {
                return sendCard(message, module.exports.subs.channel);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'autoreact channel add', description: 'Add a channel to autoreact', usage: ',autoreact channel add #general :f_thumbsup:' },
                    async execute(message, args) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const channel = message.mentions.channels.first();
                        const rest = args.filter(a => !a.startsWith('<#'));
                        if (!channel) return warn(message, 'You must mention a channel');
                        if (!channel.rateLimitPerUser) return warn(message, `You need to set a **slowmode** to ${channel} to use this feature.`);
                        const reactions = resolveReactions(message.guild, rest.join(' '));
                        if (!reactions.length) return warn(message, "Emojis are not **available** on this server or it's not a **valid** emoji");

                        const check = first('SELECT * FROM autoreact_channel WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        if (!check) {
                            run('INSERT INTO autoreact_channel (guild_id, channel_id, reactions) VALUES (?, ?, ?)', message.guild.id, channel.id, JSON.stringify(reactions));
                        } else {
                            run('UPDATE autoreact_channel SET reactions = ? WHERE guild_id = ? AND channel_id = ?', JSON.stringify(reactions), message.guild.id, channel.id);
                        }
                        return approve(message, `Set ${reactions.join(' ')} as **auto reactions** for **${channel}**`);
                    }
                },

                remove: {
                    aliases: [],
                    data: { name: 'autoreact channel remove', description: 'Remove a channel from autoreact', usage: ',autoreact channel remove #general' },
                    async execute(message, args) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const channel = message.mentions.channels.first();
                        if (!channel) return warn(message, 'You must mention a channel');
                        const check = first('SELECT * FROM autoreact_channel WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        if (!check) return warn(message, 'There is no **autoreact** with this channel');
                        run('DELETE FROM autoreact_channel WHERE guild_id = ? AND channel_id = ?', message.guild.id, channel.id);
                        return approve(message, `Removed **auto reactions** from ${channel}`);
                    }
                },

                list: {
                    aliases: [],
                    data: { name: 'autoreact channel list', description: 'View a list of every channel in autoreact', usage: ',autoreact channel list' },
                    async execute(message) {
                        const rows = query('SELECT * FROM autoreact_channel WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'There are no autoreactions available in this server');
                        const lines = rows.map(row => `<#${row.channel_id}> - ${parseReactions(row.reactions).join(' ')}`);
                        return paginate(message, lines, 'Autoreactions', guildAuthor(message));
                    }
                },

                reset: {
                    aliases: [],
                    data: { name: 'autoreact channel reset', description: 'Reset all autoreact channels in guild', usage: ',autoreact channel reset' },
                    async execute(message) {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const rows = query('SELECT * FROM autoreact_channel WHERE guild_id = ?', message.guild.id);
                        if (!rows.length) return warn(message, 'There are no autoreactions available in this server');
                return confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **RESET** all autoreactions in this server?`,
                    async i => {
                        run('DELETE FROM autoreact_channel WHERE guild_id = ?', message.guild.id);
                        return i.update({ embeds: [successEmbed(null, `${i.user}: Deleted all autoreactions in this server`)], components: [] }).catch(() => {});
                    },
                    async i => {
                        return i.update({ embeds: [errorEmbed(null, `${i.user}: Autoreactions deletion got canceled`)], components: [] }).catch(() => {});
                    });
                    }
                }
            }
        }
    }
};
