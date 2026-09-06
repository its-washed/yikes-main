const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BOOST_FILE = path.join(__dirname, '../data/boosters.json');

function loadJSON(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,

    async execute(oldMember, newMember) {
        if (oldMember.user.bot) return;

        const wasBoosting = oldMember.premiumSince;
        const isBoosting = newMember.premiumSince;

        // Detect new booster
        if (!wasBoosting && isBoosting) {
            const data = loadJSON(BOOST_FILE);
            const guildId = newMember.guild.id;

            if (data[guildId] && data[guildId].boostRole) {
                const boostRole = newMember.guild.roles.cache.get(data[guildId].boostRole);
                if (boostRole) {
                    try {
                        await newMember.roles.add(boostRole);
                    } catch {}
                }
            }

            // Send boost message
            const boostChannel = newMember.guild.systemChannel;
            if (boostChannel) {
                boostChannel.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0xec4899)
                        .setTitle('Server Boost!')
                        .setDescription(`${newMember.user} just boosted the server! 🎉\n\nThank you for the support!`)
                        .setThumbnail(newMember.user.displayAvatarURL({ size: 1024 }))
                        .setTimestamp()
                    ]
                }).catch(() => {});
            }
        }

        // Detect boost removed
        if (wasBoosting && !isBoosting) {
            const data = loadJSON(BOOST_FILE);
            const guildId = newMember.guild.id;

            if (data[guildId] && data[guildId].boostRole) {
                const boostRole = newMember.guild.roles.cache.get(data[guildId].boostRole);
                if (boostRole && newMember.roles.cache.has(boostRole.id)) {
                    try {
                        await newMember.roles.remove(boostRole);
                    } catch {}
                }
            }

            // Remove custom role if they had one
            if (data[guildId] && data[guildId].customRoles && data[guildId].customRoles[newMember.id]) {
                const customRole = newMember.guild.roles.cache.get(data[guildId].customRoles[newMember.id]);
                if (customRole) {
                    try {
                        await customRole.delete();
                    } catch {}
                }
                delete data[guildId].customRoles[newMember.id];

                try {
                    const dir = path.dirname(BOOST_FILE);
                    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                    fs.writeFileSync(BOOST_FILE, JSON.stringify(data, null, 2));
                } catch {}
            }
        }
    }
};
