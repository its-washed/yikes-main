const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');
const { trackMessage } = require('../utils/activity');
const { resolve } = require('../utils/variables');
const { createEmbed } = require('../utils/embeds');
const { isCommandDisabled, isDeveloper } = require('../utils/developer');
const { first } = require('../utils/database');
const { run } = require('../utils/database');
const fs = require('fs');
const path = require('path');

const AFK_FILE = path.join(__dirname, '../data/afk.json');
const BOOST_FILE = path.join(__dirname, '../data/boosters.json');
const DISBOARD_ID = '302050872383846401';

function loadJSON(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function formatDuration(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'}`;
    const d = Math.floor(h / 24);
    return `${d} day${d === 1 ? '' : 's'}`;
}

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        trackMessage(message.guild.id, message.author.id);


        try {
            run('INSERT INTO seen (user_id, guild_id, time) VALUES (?, ?, ?) ON CONFLICT (user_id, guild_id) DO UPDATE SET time = excluded.time',
                message.author.id, message.guild.id, Date.now() / 1000);
        } catch (err) {}


        try {
            const ignored = first('SELECT 1 AS ok FROM activity_ignore WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);
            if (!ignored) {
                const today = new Date().toISOString().slice(0, 10);
                run('INSERT INTO activity_messages (user_id, channel_id, server_id, message_date, message_count) VALUES (?, ?, ?, ?, 1) ' +
                    'ON CONFLICT (user_id, server_id, message_date) DO UPDATE SET message_count = message_count + 1, channel_id = excluded.channel_id',
                    message.author.id, message.channel.id, message.guild.id, today);
            }
        } catch (err) {}

        if (!message.channel.isThread()) {
            try {
                const auto = first('SELECT 1 AS ok FROM autothread WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);
                if (auto) {
                    const duration = message.channel.defaultAutoArchiveDuration || 10080;
                    const thread = await message.startThread({
                        name: `${message.author.username}'s thread`,
                        autoArchiveDuration: duration
                    }).catch(() => null);
                    if (thread) {
                        const poke = await thread.send('.').catch(() => null);
                        if (poke) await poke.delete().catch(() => {});
                    }
                }
            } catch (err) {}
        }

        const config = getGuildConfig(message.guild.id);

        if (message.content) {
            const lastfmRow = message.author.id
                ? first('SELECT 1 AS ok FROM lastfm WHERE user_id = ? AND customcmd = ?', message.author.id, message.content)
                : null;
            if (lastfmRow) {
                const disabled = isCommandDisabled('nowplaying', message.guild.id, 'lastfm');
                const bypass = Boolean(message.member) &&
                    (message.member.permissions.has(PermissionFlagsBits.Administrator) || isDeveloper(message.author.id));
                if (!disabled || bypass) {
                    const cmd = message.client.commands.get('nowplaying') || message.client.commands.get(message.client.aliases.get('nowplaying'));
                    if (cmd) {
                        try {
                            await cmd.execute(message, [message.author.id], message.client, config);
                        } catch (err) {}
                    }
                }
            }
        }

        const afkData = loadJSON(AFK_FILE);
        const guildAfk = afkData[message.guild.id];
        const isCommand = message.content.startsWith(config.prefix || ',');
        if (!isCommand && guildAfk && guildAfk[message.author.id]) {
            const afkEntry = guildAfk[message.author.id];
            const goneFor = Date.now() - afkEntry.timestamp;
            delete guildAfk[message.author.id];

            try {
                const dir = path.dirname(AFK_FILE);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(AFK_FILE, JSON.stringify(afkData, null, 2));
            } catch {}

            const nickname = message.member.nickname || message.author.username;
            if (nickname.startsWith('[AFK] ')) {
                try {
                    await message.member.setNickname(nickname.replace('[AFK] ', ''));
                } catch {}
            }

            message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xffd600)
                    .setDescription(`😴 <@${message.author.id}>: Welcome back! You were gone for ${formatDuration(goneFor)}`)
                ]
            })
                .catch(() => {}).then(msg => {
                if (msg) setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
        }

        if (message.mentions.users.size > 0) {
            for (const [, user] of message.mentions.users) {
                if (guildAfk && guildAfk[user.id]) {
                    const afkEntry = guildAfk[user.id];
                    message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(0xffd600)
                            .setDescription(`😴 <@${user.id}> is AFK for ${formatDuration(Date.now() - afkEntry.timestamp)} - ${afkEntry.reason}`)
                        ]
                    }).catch(() => {});
                }
            }
        }


        try {
            if (message.content || message.attachments.size || message.embeds.length) {
                const sticky = first('SELECT * FROM stickymessage WHERE channel_id = ? AND guild_id = ?', message.channel.id, message.guild.id);
                if (sticky) {
                    if (sticky.not_delete === false && sticky.last_message_id) {
                        try {
                            const old = await message.channel.messages.fetch(sticky.last_message_id);
                            await old.delete();
                        } catch (err) {}
                    }
                    try {
                        const { altConvert, scriptPayload } = require('../utils/embedScript');
                        const payload = scriptPayload(await altConvert(message.author, sticky.content));
                        const newMsg = await message.channel.send(payload);
                        const { run } = require('../utils/database');
                        run('UPDATE stickymessage SET last_message_id = ? WHERE channel_id = ? AND guild_id = ?', newMsg.id, message.channel.id, message.guild.id);
                    } catch (err) {}
                }
            }
        } catch (err) {}

        if (message.author.id === DISBOARD_ID) {
            const br = config.bumpReminder;
            if (br?.enabled && br.channel) {
                const isBumpSuccess = message.embeds.some(e => {
                    const text = ((e.description || '') + ' ' + (e.title || '')).toLowerCase();
                    return text.includes('bump') && (text.includes('done') || text.includes('success') || text.includes('performed') || text.includes('thank'));
                });
                if (isBumpSuccess) {
                    updateGuildConfig(message.guild.id, {
                        bumpReminder: { ...br, lastBump: Date.now() }
                    });

                    const channel = message.guild.channels.cache.get(br.channel);
                    if (channel) {
                        const defaultThank = 'Thanks for bumping! Next reminder in **{interval}** hour(s).';
                        const thankMsg = br.thankMessage || defaultThank;
                        const interval = br.interval || 2;
                        const ctx = { guild: message.guild, member: null, user: null, duration: `${interval}h` };
                        const content = resolve(thankMsg, ctx).replace('{interval}', interval.toString());

                        channel.send({
                            embeds: [createEmbed({
                                color: 0x39ffb8,
                                title: 'Bump Detected!',
                                description: content
                            })]
                        }).catch(() => {});
                    }
                }
            }


            try {
                const bumpRow = first('SELECT * FROM bumpreminder WHERE guild_id = ?', message.guild.id);
                if (bumpRow) {
                    const isBumpSuccess = message.embeds.some(e => {
                        const text = ((e.description || '') + ' ' + (e.title || '')).toLowerCase();
                        return text.includes('bump') && (text.includes('done') || text.includes('success') || text.includes('performed') || text.includes('thank'));
                    });
                    if (isBumpSuccess) {
                        const now = Math.floor(Date.now() / 1000);
                        run('UPDATE bumpreminder SET time = ?, channel_id = ? WHERE guild_id = ?', now + 7200, message.channel.id, message.guild.id);
                        try {
                            const { altConvert, scriptPayload } = require('../utils/embedScript');
                            const payload = scriptPayload(await altConvert(message.author, bumpRow.thankyou));
                            await message.channel.send(payload).catch(() => {});
                        } catch (err) {}
                        const interaction = message.interaction || message.interactionMetadata;
                        const bumper = interaction && interaction.user ? interaction.user : null;
                        if (bumper) {
                            const existing = first('SELECT bumps FROM bumpreminder_leaderboard WHERE guild_id = ? AND user_id = ?', message.guild.id, bumper.id);
                            if (existing) {
                                run('UPDATE bumpreminder_leaderboard SET bumps = bumps + 1 WHERE guild_id = ? AND user_id = ?', message.guild.id, bumper.id);
                            } else {
                                run('INSERT INTO bumpreminder_leaderboard (guild_id, user_id, bumps) VALUES (?, ?, 1)', message.guild.id, bumper.id);
                            }
                        }
                    }
                }
            } catch (err) {}
        }

        if (config.starboard?.enabled && config.starboard.emoji) {
            const emoji = config.starboard.emoji;
            if (message.content.includes(emoji)) {
                const starCount = (message.content.split(emoji).length - 1);
                if (starCount >= (config.starboard.threshold || 5)) {
                    const starChannel = message.guild.channels.cache.get(config.starboard.channel);
                    if (starChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(0xffd600)
                            .setTitle('Starred Message')
                            .setDescription(message.content)
                            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                            .setFooter({ text: `${emoji} ${starCount} | #${message.channel.name}` })
                            .setTimestamp();

                        starChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
            }
        }
    }
};
