const { PermissionFlagsBits } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');

function getSticky(guildId, channelId) {
    return first('SELECT * FROM stickymessage WHERE guild_id = ? AND channel_id = ?', guildId, channelId);
}

module.exports = {
    data: {
        name: 'stickymessage',
        description: 'Set up a sticky message in one or multiple channels',
        usage: ',stickymessage <add|remove|list>'
    },
    aliases: ['stickymsg', 'sticky'],
    cooldown: 3,
    subcommands: ['add', 'remove', 'list'],
    subUsages: {
        add: ',stickymessage add #images No NSFW images',
        remove: ',stickymessage remove #images',
        list: ',stickymessage list'
    },
    execute: async (message) => sendCard(message, module.exports),

    subs: {
        add: {
            aliases: [],
            data: { name: 'stickymessage add', description: 'Add a sticky message to a channel', usage: ',stickymessage add #images No NSFW images' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,stickymessage add #images No NSFW images`');
                let code = args.slice(1).join(' ').replace(channel.toString(), '').trim();
                if (!code) return warn(message, 'You must provide a message\n> Usage: `,stickymessage add #images No NSFW images`');
                let notDelete = false;
                if (code.includes(' --not_delete')) {
                    notDelete = true;
                    code = code.replace(' --not_delete', '').trim();
                }
                const check = getSticky(message.guild.id, channel.id);
                if (check) {
                    run('UPDATE stickymessage SET content = ?, not_delete = ? WHERE channel_id = ?', code, notDelete, channel.id);
                } else {
                    run('INSERT INTO stickymessage (guild_id, channel_id, last_message_id, content, not_delete) VALUES (?, ?, NULL, ?, ?)',
                        message.guild.id, channel.id, code, notDelete);
                }
                return approve(message, `Added sticky message to ${channel}\n\`\`\`${code}\`\`\``);
            }
        },
        remove: {
            aliases: [],
            data: { name: 'stickymessage remove', description: 'Remove a sticky message from a channel', usage: ',stickymessage remove #images' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const channel = message.mentions.channels.first();
                if (!channel) return warn(message, 'You must mention a channel\n> Usage: `,stickymessage remove #images`');
                const check = getSticky(message.guild.id, channel.id);
                if (!check) return warn(message, 'There is no sticky message configured in this channel');
                run('DELETE FROM stickymessage WHERE channel_id = ?', channel.id);
                if (check.last_message_id) {
                    try {
                        const old = await channel.messages.fetch(check.last_message_id);
                        await old.delete();
                    } catch (err) {}
                }
                return approve(message, `Deleted the sticky message from ${channel}`);
            }
        },
        list: {
            aliases: [],
            data: { name: 'stickymessage list', description: 'List all channels with a sticky message', usage: ',stickymessage list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const results = query('SELECT * FROM stickymessage WHERE guild_id = ?', message.guild.id);
                if (!results.length) return warn(message, 'There are no sticky messages configured in this server');
                const embeds = results.map((result, index) => ({
                    color: COLORS.NEUTRAL,
                    title: 'Sticky Message Configuration',
                    footer: { text: `Page: ${index + 1}/${results.length}` },
                    fields: [
                        {
                            name: 'Channel',
                            value: message.guild.channels.cache.get(result.channel_id)
                                ? `<#${result.channel_id}>` : 'None',
                            inline: true
                        },
                        {
                            name: 'Message',
                            value: result.content
                                ? `\`\`\`${result.content.length > 1021 ? result.content.slice(0, 1021) + '...' : result.content}\`\`\``
                                : 'No message set',
                            inline: false
                        }
                    ]
                }));
                if (embeds.length > 1) {
                    const { Paginator } = require('../../utils/pagination');
                    const paginator = new Paginator(embeds, { userId: message.author.id });
                    const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
                    await paginator.start(message.channel, sent);
                    return sent;
                }
                return message.reply({ embeds });
            }
        }
    }
};
