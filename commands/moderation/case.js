const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS } = require('../../utils/styles');

function fetchCase(message, caseId) {
    return first('SELECT * FROM history WHERE server_id = ? AND guild_id = ?', message.guild.id, caseId);
}

module.exports = {
    permission: "moderate members",
    data: { name: 'case', description: 'Manage cases', usage: ',case <reason|proof|info>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['reason', 'proof', 'info'],
    subUsages: {
        reason: ',case reason <id> <reason>',
        proof: ',case proof <id> [proof text|attachment]',
        info: ',case info <id>'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        reason: {
            aliases: [],
            data: { name: 'case reason', description: 'Change the reason of a case', usage: ',case reason <id> <reason>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
                const caseId = parseInt(args[0], 10);
                if (!Number.isFinite(caseId)) return warn(message, 'You must provide a case ID\n> Usage: `case reason <id> <reason>`');
                const reason = args.slice(1).join(' ').trim();
                if (!reason) return warn(message, 'You must provide a reason\n> Usage: `case reason <id> <reason>`');
                const check = fetchCase(message, caseId);
                if (!check) return warn(message, `Case with ID \`#${caseId}\` not found`);
                run('UPDATE history SET reason = ? WHERE server_id = ? AND guild_id = ?', reason, message.guild.id, caseId);
                return approve(message, `Changed reason of case \`#${caseId}\` to **${reason}**`);
            }
        },

        proof: {
            aliases: [],
            data: { name: 'case proof', description: 'Add proof to a case', usage: ',case proof <id> [attachment|proof text]' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
                const caseId = parseInt(args[0], 10);
                if (!Number.isFinite(caseId)) return warn(message, 'You must provide a case ID\n> Usage: `case proof <id> [attachment|proof text]`');
                const check = fetchCase(message, caseId);
                if (!check) return warn(message, `Case with ID \`#${caseId}\` not found`);

                const attachment = message.attachments.first();
                if (attachment) {
                    run('UPDATE history SET proof = ? WHERE server_id = ? AND guild_id = ?', attachment.url, message.guild.id, caseId);
                    return approve(message, `Attachment [\`${attachment.name}\`](${attachment.url}) saved to case \`#${caseId}\``);
                }
                const proof = args.slice(1).join(' ').trim();
                if (proof) {
                    run('UPDATE history SET proof = ? WHERE server_id = ? AND guild_id = ?', proof, message.guild.id, caseId);
                    return approve(message, `Proof saved to case \`#${caseId}\``);
                }
                return warn(message, 'You must provide either an attachment or a proof text');
            }
        },

        info: {
            aliases: [],
            data: { name: 'case info', description: 'Get information about a case', usage: ',case info <id>' },
            async execute(message, args, client, config) {
                if (!await needPerm(message, PermissionFlagsBits.ModerateMembers)) return;
                const caseId = parseInt(args[0], 10);
                if (!Number.isFinite(caseId)) return warn(message, 'You must provide a case ID\n> Usage: `case info <id>`');
                const check = fetchCase(message, caseId);
                if (!check) return warn(message, `Case with ID \`#${caseId}\` not found`);

                let user = null;
                try {
                    user = await message.client.users.fetch(String(check.user_id));
                } catch (err) {
                    user = null;
                }
                const duration = check.duration ? `**Duration:** ${check.duration}\n` : '';
                const proof = check.proof ? `**Proof:** ${check.proof}` : '';
                const embed = {
                    color: COLORS.NEUTRAL,
                    author: {
                        name: message.author.username,
                        icon_url: message.author.displayAvatarURL({ size: 256 })
                    },
                    fields: [{
                        name: `Case Log #${caseId} | ${check.punishment}`,
                        value: (
                            `**Punished:** <t:${Math.floor(Number(check.time) || 0)}:f>\n` +
                            `**User:** ${user ? user.toString() : `<@${check.user_id}>`} (\`${check.user_id}\`)\n` +
                            `**Moderator:** <@${check.moderator_id}>\n` +
                            `**Reason:** ${check.reason}\n` +
                            `${duration}${proof}`
                        ),
                        inline: false
                    }]
                };
                return message.reply({ embeds: [embed] });
            }
        }
    }
};
