const { PermissionFlagsBits } = require('discord.js');
const { needPerm, needBotPerm, noStaff, invokeDm, invokeMessage, insertCase, sendModLog, splitReason, confirm } = require('../../utils/moderation');
const { warn, approve } = require('../../utils/context');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    permission: "kick members",
    data: { name: 'kick', description: 'Kick a member from the server', usage: ',kick its_washed rassist --s', params: ['member', '[reason]'], flags: { s: 'Punish a user silently' } },
    aliases: [],
    cooldown: 3,

    async execute(message, args, client) {
        if (!await needPerm(message, PermissionFlagsBits.KickMembers)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.KickMembers)) return;
        if (!args.length) return warn(message, 'Usage: `kick <member> [reason] [--s]`');

        const member = await noStaff(message, args[0], 'kick');
        if (!member) return;

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;
        const silent = parsed.silent;
        const discordReason = `${reason} | ${message.author.username} (${message.author.id})`;

        const premiumRole = message.guild.premiumSubscriberRole;
        if (premiumRole && member.roles.cache.has(premiumRole.id)) {
            const since = member.premiumSinceTimestamp ? Math.floor(member.premiumSinceTimestamp / 1000) : null;
            return confirm(message, `${message.author}: Are you sure you want to **kick** ${member}?${since ? ` They're boosting this server since **<t:${since}:R>**` : ''}`,
                async i => performKick(i, true),
                async i => {
                    await i.update({ embeds: [errorEmbed(null, `${i.user}: Booster ban/kick got canceled`)], components: [] }).catch(() => {});
                });
        }

        return performKick(null, false);

        async function performKick(interaction, booster) {
            let dmMessageId = null;
            if (!silent) {
                const invoked = await invokeDm(member, message.guild.id, 'kick', { reason }).catch(() => false);
                if (!invoked) {
                    try {
                        const dm = await member.send({
                            embeds: [{
                                color: 0xff3939,
                                description: `You have been kicked from **${message.guild.name}** by ${message.author} for the following reason: **${reason}**`
                            }]
                        });
                        dmMessageId = dm.id;
                    } catch (err) {
                        dmMessageId = null;
                    }
                }
            }

            try {
                await member.kick(discordReason);
            } catch (err) {
                const text = `I couldn't kick ${member}`;
                if (interaction) await interaction.update({ embeds: [errorEmbed(null, `${interaction.user}: ${text}`)], components: [] }).catch(() => {});
                else await warn(message, text);
                return;
            }

            const historyId = insertCase(message, member, booster ? 'Kick [Booster]' : 'Kick', 'None', reason, Date.now() / 1000, dmMessageId);
            if (booster) {
                const text = `Kicked ${member} - ${reason}`;
                if (interaction) await interaction.update({ embeds: [successEmbed(null, `${interaction.user}: ${text}`)], components: [] }).catch(() => {});
                else await approve(message, text);
                return;
            }

            await sendModLog(message.guild, {
                user: member,
                moderator: message.author,
                reason,
                description: 'kicked',
                punishment: 'Kick',
                historyId
            });

            const invoked = await invokeMessage(message, 'kick', member, { reason, historyId }).catch(() => false);
            if (invoked) return;
            const text = `Kicked ${member} (\`#${historyId}\`) - ${reason}`;
            if (interaction) await interaction.update({ embeds: [successEmbed(null, `${interaction.user}: ${text}`)], components: [] }).catch(() => {});
            else await approve(message, text);
        }
    }
};
