const { Events, EmbedBuilder } = require('discord.js');
const { first, run, query } = require('../utils/database');

function boostRoleOf(guildId) {
    const row = first('SELECT boost_role FROM booster_setting WHERE guild_id = ?', guildId);
    return row && row.boost_role ? String(row.boost_role) : null;
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
            const guildId = newMember.guild.id;
            const boostRole = boostRoleOf(guildId);

            await handleBoostGain(newMember);

            if (boostRole) {
                const role = newMember.guild.roles.cache.get(boostRole);
                if (role) {
                    try {
                        await newMember.roles.add(role);
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
            const guildId = newMember.guild.id;
            const boostRole = boostRoleOf(guildId);

            await handleBoostLost(newMember);

            if (boostRole) {
                const role = newMember.guild.roles.cache.get(boostRole);
                if (role && newMember.roles.cache.has(role.id)) {
                    try {
                        await newMember.roles.remove(role);
                    } catch {}
                }
            }

            const custom = first('SELECT role_id FROM booster_custom_role WHERE guild_id = ? AND user_id = ?', guildId, newMember.id);
            if (custom) {
                const customRole = newMember.guild.roles.cache.get(String(custom.role_id));
                if (customRole) {
                    try {
                        await customRole.delete();
                    } catch {}
                }
                run('DELETE FROM booster_custom_role WHERE guild_id = ? AND user_id = ?', guildId, newMember.id);
            }
        }
    }
};
