const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff, invokeDm, invokeMessage, insertCase, sendModLog, splitReason, prefix, confirm, resolveUser } = require('../../utils/moderation');
const { warn, approve } = require('../../utils/context');
const { sendPunishmentDm } = require('../../utils/appeals');
const { errorEmbed, successEmbed } = require('../../utils/embeds');
const { resolveMember } = require('../../utils/roleplay');

module.exports = {
    permission: "ban members",
    data: { name: 'ban', description: 'Ban a member from the server', usage: ',ban its_washed racist --days 7', params: ['member', '[reason]'], flags: { s: 'Punish a user silently', days: 'Delete messages from the user' } },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.BanMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.BanMembers)) return;
        if (!args.length) return warn(message, 'Usage: `ban <member> [reason] [--s] [--days <0-7>]`');

        let member = await resolveMember(message, args[0]);
        let target = member;
        if (member) {
            member = await noStaff(message, member.id, 'ban');
            if (!member) return;
            target = member;
        } else {
            target = await resolveUser(message, client, args[0]);
            if (!target) return warn(message, `Member **${args[0]}** couldn't be found`);
        }

        const parts = args.slice(1);
        const silent = parts.includes('--s');
        let rest = parts.filter(part => part !== '--s');
        let days = 0;
        const daysIndex = rest.indexOf('--days');
        if (daysIndex !== -1) {
            const value = parseInt(rest[daysIndex + 1], 10);
            if (!Number.isFinite(value)) {
                return warn(message, `Invalid \`--days\` value. Please provide a number between 0 and 7.\n> Example: \`${prefix(message)}ban user reason --days 1\``);
            }
            days = Math.max(0, Math.min(7, value));
            rest = [...rest.slice(0, daysIndex), ...rest.slice(daysIndex + 2)];
        }
        const reason = rest.join(' ').trim().slice(0, 128) || 'No reason provided';
        const discordReason = `${reason} | ${message.author.username} (${message.author.id})`;

        const bans = await message.guild.bans.fetch().catch(() => null);
        if (bans && bans.has(target.id)) return warn(message, `${target} is already banned.`);

        if (member && member.premiumSinceTimestamp) {
            const since = Math.floor(member.premiumSinceTimestamp / 1000);
            return confirm(message, `${message.author}: Are you sure you want to **ban** ${member}?\n> They're boosting this server since **<t:${since}:R>**`,
                async i => performBan(i, true),
                async i => {
                    await i.update({ embeds: [errorEmbed(null, `${i.user}: Booster ban/kick got canceled`)], components: [] }).catch(() => {});
                });
        }

        return performBan(null, false);

        async function performBan(interaction, booster) {
            let dmMessageId = null;
            if (!silent) {
                const invoked = await invokeDm(target, message.guild.id, 'ban', { reason }).catch(() => false);
                if (!invoked && member) {
                    try {
                        dmMessageId = await sendPunishmentDm(target, message.guild.id, `You have been banned from **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`);
                    } catch (err) {
                        dmMessageId = null;
                    }
                }
            }

            try {
                await message.guild.bans.create(target, { reason: discordReason, deleteMessageSeconds: days * 86400 });
            } catch (err) {
                const text = `I couldn't ban ${target}`;
                if (interaction) await interaction.update({ embeds: [errorEmbed(null, `${interaction.user}: ${text}`)], components: [] }).catch(() => {});
                else await warn(message, text);
                return;
            }

            const historyId = insertCase(message, target, booster ? 'Ban [Booster]' : 'Ban', 'None', reason, Date.now() / 1000, dmMessageId);
            if (booster) {
                const text = `Banned ${target} - ${reason}`;
                if (interaction) await interaction.update({ embeds: [successEmbed(null, `${interaction.user}: ${text}`)], components: [] }).catch(() => {});
                else await approve(message, text);
                return;
            }

            await sendModLog(message.guild, {
                user: target,
                moderator: message.author,
                reason,
                description: 'banned',
                punishment: 'Ban',
                historyId
            });

            const invoked = await invokeMessage(message, 'ban', target, { reason, historyId }).catch(() => false);
            if (invoked) return;
            const text = `Banned ${target} (\`#${historyId}\`) - **${reason}**`;
            if (interaction) await interaction.update({ embeds: [successEmbed(null, `${interaction.user}: ${text}`)], components: [] }).catch(() => {});
            else await approve(message, text);
        }
    }
};
