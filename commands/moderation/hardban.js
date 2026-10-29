const { PermissionFlagsBits } = require('discord.js');
const { run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm, noStaff, confirm, splitReason, insertCase, sendModLog, resolveUser } = require('../../utils/moderation');
const { needAntinukeAdmin } = require('../../utils/predicates');
const { resolveMember } = require('../../utils/roleplay');
const { COLORS, EMOJIS } = require('../../utils/styles');

async function resolveTarget(message, client, value) {
    const member = await resolveMember(message, value);
    if (member) {
        const checked = await noStaff(message, value, 'hardban');
        if (!checked) return null;
        return { target: checked, isMember: true };
    }
    const user = await resolveUser(message, client, value);
    if (user) return { target: user, isMember: false };
    return null;
}

module.exports = {
    permission: "administrator & antinuke admin",
    data: { name: 'hardban', description: 'Keep a member banned from the server', usage: ',hardban its_washed rassist', params: ['member', '[reason]'] },
    aliases: [],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
        if (!await needBotPerm(message, PermissionFlagsBits.BanMembers)) return;
        if (!await needAntinukeAdmin(message, config)) return;
        if (!args[0]) return warn(message, 'You must provide a member\n> Usage: `hardban <member> [reason]`');

        const resolved = await resolveTarget(message, client, args[0]);
        if (!resolved) return;
        const { target } = resolved;

        const parsed = splitReason(args, 1);
        const reason = parsed.reason;

        await confirm(message,
            `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **hardban** ${target}?`,
            async (interaction) => {
                run('INSERT OR REPLACE INTO hardban (guild_id, user_id, reason, moderator_id) VALUES (?, ?, ?, ?)',
                    message.guild.id, target.id, reason, message.author.id);
                try {
                    await message.guild.bans.create(target, { reason: `Hardbanned by ${message.author} (${message.author.id}): ${reason}` });
                } catch (err) {}

                const historyId = insertCase(message, target, 'Hardban', 'None', reason, Date.now() / 1000);
                await sendModLog(message.guild, {
                    user: target,
                    moderator: message.author,
                    reason,
                    description: 'hardbanned',
                    punishment: 'Hardban',
                    historyId
                });
                await interaction.update({
                    embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Hardbanned ${target} (\`#${historyId}\`) - **${reason}**` }],
                    components: []
                }).catch(() => {});
            },
            async (interaction) => {
                await interaction.update({
                    embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: Hardban got canceled` }],
                    components: []
                }).catch(() => {});
            });
    }
};
