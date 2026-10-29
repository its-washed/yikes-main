const { Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { first, run, query } = require('../utils/database');

const BOOST_FILE = path.join(__dirname, '../data/boosters.json');

function loadJSON(file) {
    if (!fs.existsSync(file)) return {};
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

async function handleBoostGain(member) {
    const guild = member.guild;
    const awards = query('SELECT role_id FROM booster_award WHERE guild_id = ?', guild.id) || [];
    const me = guild.members.me;
    for (const rec of awards) {
        const role = guild.roles.cache.get(String(rec.role_id));
        if (!role || role.managed || role.id === guild.id) continue;
        if (me && role.position >= me.roles.highest.position) continue;
        await member.roles.add(role, 'Booster role awarded given').catch(() => {});
    }
}

async function handleBoostLost(member) {
    const guild = member.guild;
    try {
        run('INSERT INTO booster_lost (guild_id, user_id, timestamp) VALUES (?, ?, ?)', guild.id, member.id, Date.now() / 1000);
    } catch (err) {}

    const row = first('SELECT role_id FROM booster_roles WHERE guild_id = ? AND user_id = ?', guild.id, member.id);
    if (row) {
        const role = guild.roles.cache.get(String(row.role_id));
        run('DELETE FROM booster_roles WHERE guild_id = ? AND user_id = ?', guild.id, member.id);
        if (role) await role.delete('booster transferred all their boosts').catch(() => {});
    }

    const awards = query('SELECT role_id FROM booster_award WHERE guild_id = ?', guild.id) || [];
    for (const rec of awards) {
        const role = guild.roles.cache.get(String(rec.role_id));
        if (role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role, 'Removing booster awards from this member').catch(() => {});
        }
    }
}

module.exports = {
    name: Events.GuildMemberUpdate,
    once: false,

    async execute(oldMember, newMember) {
        if (oldMember.user.bot) return;

        const wasBoosting = oldMember.premiumSince;
        const isBoosting = newMember.premiumSince;

        if (!wasBoosting && isBoosting) {
            const data = loadJSON(BOOST_FILE);
            const guildId = newMember.guild.id;

            await handleBoostGain(newMember);

            if (data[guildId] && data[guildId].boostRole) {
                const boostRole = newMember.guild.roles.cache.get(data[guildId].boostRole);
                if (boostRole) {
                    try {
                        await newMember.roles.add(boostRole);
                    } catch {}
                }
            }

            const boostChannel = newMember.guild.systemChannel;
            if (boostChannel) {
                boostChannel.send({
                    embeds: [new EmbedBuilder()
                        .setColor(0x729bb0)
                        .setTitle('Server Boost!')
                        .setDescription(`${newMember.user} just boosted the server! 🎉\n\nThank you for the support!`)
                        .setThumbnail(newMember.user.displayAvatarURL({ size: 1024 }))
                        .setTimestamp()
                    ]
                }).catch(() => {});
            }
        }

        if (wasBoosting && !isBoosting) {
            const data = loadJSON(BOOST_FILE);
            const guildId = newMember.guild.id;

            await handleBoostLost(newMember);

            if (data[guildId] && data[guildId].boostRole) {
                const boostRole = newMember.guild.roles.cache.get(data[guildId].boostRole);
                if (boostRole && newMember.roles.cache.has(boostRole.id)) {
                    try {
                        await newMember.roles.remove(boostRole);
                    } catch {}
                }
            }

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
