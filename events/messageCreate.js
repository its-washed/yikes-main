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

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

        trackMessage(message.guild.id, message.author.id);

        const config = getGuildConfig(message.guild.id);

        const afkData = loadJSON(AFK_FILE);
        const guildAfk = afkData[message.guild.id];
        if (guildAfk && guildAfk[message.author.id]) {
            const afkEntry = guildAfk[message.author.id];
            const duration = Math.floor((Date.now() - afkEntry.timestamp) / 60000);
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
                    .setColor(0x22c55e)
                    .setTitle('Welcome Back!')
                    .setDescription(`Welcome back ${message.author}! You were AFK for **${duration}** minute(s).`)
                ]
            }).catch(() => {}).then(msg => {
                if (msg) setTimeout(() => msg.delete().catch(() => {}), 5000);
            });
        }

        if (message.mentions.users.size > 0) {
            for (const [, user] of message.mentions.users) {
                if (guildAfk && guildAfk[user.id]) {
                    const afkEntry = guildAfk[user.id];
                    const duration = Math.floor((Date.now() - afkEntry.timestamp) / 60000);
                    message.reply({
                        embeds: [new EmbedBuilder()
                            .setColor(0xfbbf24)
                            .setTitle('User is AFK')
                            .setDescription(`**${user.tag}** is AFK.\n**Reason:** ${afkEntry.reason}\n**For:** ${duration} minute(s)`)
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

        const prefix = config.prefix || ',';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = message.client.commands.get(commandName) ||
            message.client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        if (!command) return;

        try {
            await command.execute(message, args, message.client);
        } catch (error) {
            console.error(`Error executing ${commandName}:`, error);
            message.reply({ embeds: [new EmbedBuilder().setColor(0xff4757).setDescription('An error occurred while executing that command.')] }).catch(() => {});
        }
    }
};
