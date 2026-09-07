const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'invites',
        description: 'Manage invite tracking',
        usage: ',invites <enable|disable|logs|message|threshold|rewards|leaderboard|user> [args]'
    },
    aliases: ['invitetracker'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `enable`, `disable`, `logs`, `message`, `threshold`, `rewards`, `leaderboard`, `user`')] });

        if (sub === 'enable') {
            updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, enabled: true, invites: config.inviteTracker?.invites || {} } });
            return message.reply({ embeds: [successEmbed('Invite Tracker Enabled', 'Tracking is now active.')] });
        }

        if (sub === 'disable') {
            updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, enabled: false } });
            return message.reply({ embeds: [successEmbed('Invite Tracker Disabled', 'Tracking turned off.')] });
        }

        if (sub === 'logs') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel for invite logs.')] });
            updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, logChannel: channel.id } });
            return message.reply({ embeds: [successEmbed('Logs Channel', `Invite logs go to ${channel}`)] });
        }

        if (sub === 'message') {
            const msg = args.slice(1).join(' ');
            if (!msg) return message.reply({ embeds: [errorEmbed('No Message', 'Provide a log message using variables like `{inviter.mention}`, `{user.mention}`.')] });
            updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, message: msg } });
            return message.reply({ embeds: [successEmbed('Message Set', 'Invite log message updated.')] });
        }

        if (sub === 'threshold') {
            const days = parseInt(args[1]) || 3;
            updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, fakeThreshold: days } });
            return message.reply({ embeds: [successEmbed('Fake Threshold', `Accounts must be **${days}** days old to count as real.`)] });
        }

        if (sub === 'rewards') {
            const action = args[1]?.toLowerCase();
            if (action === 'add') {
                const threshold = parseInt(args[2]);
                const role = message.mentions.roles.first();
                if (!threshold || !role) return message.reply({ embeds: [errorEmbed('Usage', ',invites rewards add <threshold> @role')] });
                const rewards = config.inviteTracker?.rewards || [];
                rewards.push({ threshold, roleId: role.id });
                updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, rewards } });
                return message.reply({ embeds: [successEmbed('Reward Added', `At **${threshold}** invites, get ${role}`)] });
            }
            if (action === 'remove') {
                const idx = parseInt(args[2]) - 1;
                const rewards = config.inviteTracker?.rewards || [];
                if (idx < 0 || idx >= rewards.length) return message.reply({ embeds: [errorEmbed('Invalid Index', 'Use `,invites rewards list` to see indexes.')] });
                rewards.splice(idx, 1);
                updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, rewards } });
                return message.reply({ embeds: [successEmbed('Reward Removed', 'Reward deleted.')] });
            }
            if (action === 'list') {
                const rewards = config.inviteTracker?.rewards || [];
                if (!rewards.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Invite Rewards', description: 'No rewards configured.' })] });
                const list = rewards.map((r, i) => `**${i + 1}.** ${r.threshold} invites → <@&${r.roleId}>`).join('\n');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Invite Rewards', description: list })] });
            }
            if (action === 'stack') {
                const enabled = args[2]?.toLowerCase() === 'on';
                updateGuildConfig(message.guild.id, { inviteTracker: { ...config.inviteTracker, stackRoles: enabled } });
                return message.reply({ embeds: [successEmbed('Stack Roles', `Role stacking ${enabled ? 'enabled' : 'disabled'}.`)] });
            }
            return message.reply({ embeds: [errorEmbed('Usage', ',invites rewards <add|remove|list|stack> [args]')] });
        }

        if (sub === 'leaderboard') {
            const inviterData = config.inviteTracker?.invites || {};
            const entries = Object.entries(inviterData)
                .map(([id, data]) => ({ id, total: (data.regular || 0) + (data.bonus || 0) - (data.fake || 0), regular: data.regular || 0, fake: data.fake || 0 }))
                .filter(e => e.total > 0)
                .sort((a, b) => b.total - a.total)
                .slice(0, 20);

            if (!entries.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Invite Leaderboard', description: 'No invites tracked yet.' })] });

            const pages = [];
            for (let i = 0; i < entries.length; i += 10) {
                const chunk = entries.slice(i, i + 10);
                pages.push({
                    color: 0x6c5ce7,
                    title: 'Invite Leaderboard',
                    description: chunk.map((e, j) => `**${i + j + 1}.** <@${e.id}> — **${e.total}** invites (${e.regular} real, ${e.fake} fake)`).join('\n')
                });
            }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }

        if (sub === 'user') {
            const target = message.mentions.users.first() || message.author;
            const data = config.inviteTracker?.invites?.[target.id];
            if (!data) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'No Invites', description: `${target.tag} has no tracked invites.` })] });
            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: `${target.tag}'s Invites`,
                    fields: [
                        { name: 'Regular', value: `${data.regular || 0}`, inline: true },
                        { name: 'Fake', value: `${data.fake || 0}`, inline: true },
                        { name: 'Bonus', value: `${data.bonus || 0}`, inline: true },
                        { name: 'Total', value: `${(data.regular || 0) + (data.bonus || 0) - (data.fake || 0)}`, inline: true }
                    ]
                })]
            });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    }
};
