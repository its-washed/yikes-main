const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

function resolveChannel(message, value, types) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byId = message.guild.channels.cache.get(id);
        if (byId && (!types || types.includes(byId.type))) return byId;
    }
    const byName = message.guild.channels.cache.find(c => c.name.toLowerCase() === raw.toLowerCase() && (!types || types.includes(c.type)));
    return byName || null;
}

async function needChannelPerm(message) {
    if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return false;
    if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return false;
    return true;
}

module.exports = {
    permission: "manage channels",
    data: { name: 'channel', description: "Manage channels in your sever", usage: ',channel <create|remove|rename|category|nsfw|topic>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['create', 'remove', 'rename', 'category', 'nsfw', 'topic'],
    subUsages: {
        create: ',channel create #commands',
        remove: ',channel remove #commands',
        rename: ',channel rename #commands cmds',
        category: ',channel category #commands home',
        nsfw: ',channel nsfw #images',
        topic: ',channel topic [#channel] <topic>'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        create: {
            aliases: ['make'],
            data: { name: 'channel create', description: 'Create a channel in your server', usage: ',channel create #commands' },
            async execute(message, args, client, config) {
                if (!await needChannelPerm(message)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name for the channel\n> Usage: `channel create <name>`');
                const channel = await message.guild.channels.create({ name, type: ChannelType.GuildText }).catch(err => {
                    warn(message, `I couldn't create the channel\n\`\`\`\`${err.message}\`\`\`\``);
                    return null;
                });
                if (!channel) return;
                return approve(message, `Created ${channel}`);
            }
        },

        remove: {
            aliases: ['delete', 'del'],
            data: { name: 'channel remove', description: 'Delete a channel in your server', usage: ',channel remove #commands' },
            async execute(message, args, client, config) {
                if (!await needChannelPerm(message)) return;
                const channel = resolveChannel(message, args.join(' '), [ChannelType.GuildText]) || message.channel;

                await confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to delete the channel **${channel.name}**?`,
                    async (interaction) => {
                        try {
                            await channel.delete(`Deleted by ${message.author} (${message.author.id})`);
                        } catch (err) {
                            const text = err.code === 50074
                                ? `Cannot delete ${channel} because it is required for community servers.`
                                : `Couldn't delete ${channel} due to insufficient permissions.`;
                            return interaction.update({
                                embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: ${text}` }],
                                components: []
                            }).catch(() => {});
                        }
                        if (channel.id !== message.channel.id) {
                            return interaction.update({
                                embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Channel \`#${channel.name}\` deleted successfully` }],
                                components: []
                            }).catch(() => {});
                        }
                        return interaction.update({ components: [] }).catch(() => {});
                    },
                    async (interaction) => {
                        await interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: Channel deletion was canceled.` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        rename: {
            aliases: ['name'],
            data: { name: 'channel rename', description: 'Rename a channel', usage: ',channel rename #commands cmds' },
            async execute(message, args, client, config) {
                if (!await needChannelPerm(message)) return;
                const parts = [...args];
                const resolved = resolveChannel(message, parts[0], [ChannelType.GuildText, ChannelType.GuildAnnouncement]);
                const channel = resolved || message.channel;
                if (resolved) parts.shift();
                const name = parts.join(' ').trim();
                if (!name) return warn(message, 'You must provide a new name\n> Usage: `channel rename <#channel> <name>`');
                if (name.length > 150) return warn(message, "Channel names can't be over **150 characters**");
                const finalName = name.replace(/ /g, '-');
                const oldName = channel.name;
                try {
                    await channel.edit({ name: finalName });
                } catch (err) {
                    return warn(message, `Couldn't rename ${channel}`);
                }
                return approve(message, `Renamed \`#${oldName}\` to **${finalName}**`);
            }
        },

        category: {
            aliases: [],
            data: { name: 'channel category', description: 'Move a channel to a new category', usage: ',channel category #commands home' },
            async execute(message, args, client, config) {
                if (!await needChannelPerm(message)) return;
                const parts = [...args];
                const resolved = resolveChannel(message, parts[0]);
                const channel = resolved || message.channel;
                if (resolved) parts.shift();
                const category = resolveChannel(message, parts.join(' '), [ChannelType.GuildCategory]);
                if (!category) return warn(message, `Category **${parts.join(' ')}** couldn't be found`);
                try {
                    await channel.edit({ parent: category.id });
                } catch (err) {
                    return warn(message, `Couldn't change ${channel}'s category`);
                }
                return approve(message, `Moved ${channel} under ${category}`);
            }
        },

        nsfw: {
            aliases: ['naughty'],
            data: { name: 'channel nsfw', description: 'Toggle NSFW for a channel', usage: ',channel nsfw #images' },
            async execute(message, args, client, config) {
                if (!await needChannelPerm(message)) return;
                const channel = resolveChannel(message, args.join(' '), [ChannelType.GuildText]) || message.channel;
                try {
                    await channel.edit({ nsfw: !channel.nsfw });
                } catch (err) {
                    return warn(message, `Couldn't mark/unmark ${channel} as NSFW`);
                }
                await message.react('✅').catch(() => {});
            }
        },

        topic: {
            aliases: [],
            data: { name: 'channel topic', description: "Change a channel's topic", usage: ',channel topic [#channel] <topic>' },
            async execute(message, args, client, config) {
                if (!await needChannelPerm(message)) return;
                const parts = [...args];
                const resolved = resolveChannel(message, parts[0], [ChannelType.GuildText, ChannelType.GuildAnnouncement]);
                const channel = resolved || message.channel;
                if (resolved) parts.shift();
                const topic = parts.join(' ').trim();
                if (!topic) return warn(message, 'You must provide a topic\n> Usage: `channel topic [#channel] <topic>`');
                if (topic.length > 1024) return warn(message, "Channel topics can't be over **1024 characters**");
                try {
                    await channel.edit({ topic });
                } catch (err) {
                    return warn(message, `Couldn't change ${channel}'s topic`);
                }
                return approve(message, `Changed ${channel}'s topic to \`${topic}\``);
            }
        }
    }
};
