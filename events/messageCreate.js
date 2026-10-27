const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');
const { trackMessage } = require('../utils/activity');
const { resolve } = require('../utils/variables');
const { createEmbed } = require('../utils/embeds');
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

        const config = getGuildConfig(message.guild.id);

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
                    .setColor(0xfbbf24)
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
                            .setColor(0xfbbf24)
                            .setDescription(`😴 <@${user.id}> is AFK for ${formatDuration(Date.now() - afkEntry.timestamp)} - ${afkEntry.reason}`)
                        ]
                    }).catch(() => {});
                }
            }
        }

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
                                color: 0x00d26a,
                                title: 'Bump Detected!',
                                description: content
                            })]
                        }).catch(() => {});
                    }
                }
            }
        }

        if (config.starboard?.enabled && config.starboard.emoji) {
            const emoji = config.starboard.emoji;
            if (message.content.includes(emoji)) {
                const starCount = (message.content.split(emoji).length - 1);
                if (starCount >= (config.starboard.threshold || 5)) {
                    const starChannel = message.guild.channels.cache.get(config.starboard.channel);
                    if (starChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(0xffd700)
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
