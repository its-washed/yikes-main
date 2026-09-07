const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuildConfig } = require('../utils/config');
const fs = require('fs');
const path = require('path');

const AFK_FILE = path.join(__dirname, '../data/afk.json');
const BOOST_FILE = path.join(__dirname, '../data/boosters.json');

function loadJSON(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = {
    name: Events.MessageCreate,
    once: false,

    async execute(message) {
        if (message.author.bot || !message.guild) return;

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

        if (config.starboard?.enabled && message.content.includes('⭐')) {
            const starCount = (message.content.match(/⭐/g) || []).length;
            if (starCount >= (config.starboard.threshold || 5)) {
                const starChannel = message.guild.channels.cache.get(config.starboard.channel);
                if (starChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0xffd700)
                        .setTitle('Starred Message')
                        .setDescription(message.content)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setFooter({ text: `⭐ ${starCount} | #${message.channel.name}` })
                        .setTimestamp();

                    starChannel.send({ embeds: [embed] }).catch(() => {});
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
