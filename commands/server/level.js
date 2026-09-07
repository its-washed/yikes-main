const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');
const { resolve } = require('../../utils/variables');

module.exports = {
    data: {
        name: 'level',
        description: 'Configure level system and rewards',
        usage: ',level <enable|disable|message|channel|multiplier|rewards|ignore|set|leaderboard> [args]'
    },
    aliases: ['levels'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `enable`, `disable`, `message`, `channel`, `multiplier`, `rewards`, `ignore`, `set`, `leaderboard`')] });

        if (sub === 'enable') {
            updateGuildConfig(message.guild.id, { levels: { ...config.levels, enabled: true } });
            return message.reply({ embeds: [successEmbed('Levels Enabled', 'XP tracking is now active.')] });
        }

        if (sub === 'disable') {
            updateGuildConfig(message.guild.id, { levels: { ...config.levels, enabled: false } });
            return message.reply({ embeds: [successEmbed('Levels Disabled', 'XP tracking turned off.')] });
        }

        if (sub === 'message') {
            const msg = args.slice(1).join(' ');
            if (!msg) return message.reply({ embeds: [errorEmbed('Usage', ',level message <text>\nVariables: `{user}`, `{level}`, `{xp}`, `{target_xp}`')] });
            updateGuildConfig(message.guild.id, { levels: { ...config.levels, levelUpMessage: msg } });
            return message.reply({ embeds: [successEmbed('Message Set', 'Level-up message updated.')] });
        }

        if (sub === 'channel') {
            const channel = message.mentions.channels.first();
            if (!channel) return message.reply({ embeds: [errorEmbed('No Channel', 'Mention a channel for level-up messages.')] });
            updateGuildConfig(message.guild.id, { levels: { ...config.levels, levelUpChannel: channel.id } });
            return message.reply({ embeds: [successEmbed('Channel Set', `Level-up messages go to ${channel}`)] });
        }

        if (sub === 'multiplier') {
            const mult = parseFloat(args[1]);
            if (!mult || mult < 0.1 || mult > 10) return message.reply({ embeds: [errorEmbed('Invalid', 'Multiplier must be 0.1-10.')] });
            updateGuildConfig(message.guild.id, { levels: { ...config.levels, xpMultiplier: mult } });
            return message.reply({ embeds: [successEmbed('Multiplier Set', `XP multiplier: **${mult}x**`)] });
        }

        if (sub === 'rewards') {
            const action = args[1]?.toLowerCase();
            if (action === 'add') {
                const lvl = parseInt(args[2]);
                const role = message.mentions.roles.first();
                if (!lvl || !role) return message.reply({ embeds: [errorEmbed('Usage', ',level rewards add <level> @role')] });
                const rewards = config.levels?.rewards || [];
                rewards.push({ level: lvl, roleId: role.id });
                updateGuildConfig(message.guild.id, { levels: { ...config.levels, rewards } });
                return message.reply({ embeds: [successEmbed('Reward Added', `At level **${lvl}**, get ${role}`)] });
            }
            if (action === 'remove') {
                const role = message.mentions.roles.first();
                if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a role to remove.')] });
                const rewards = (config.levels?.rewards || []).filter(r => r.roleId !== role.id);
                updateGuildConfig(message.guild.id, { levels: { ...config.levels, rewards } });
                return message.reply({ embeds: [successEmbed('Removed', `Reward for ${role} removed.`)] });
            }
            if (action === 'list') {
                const rewards = config.levels?.rewards || [];
                if (!rewards.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Level Rewards', description: 'No rewards configured.' })] });
                const list = rewards.map(r => `Level **${r.level}** → <@&${r.roleId}>`).join('\n');
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Level Rewards', description: list })] });
            }
            if (action === 'stack') {
                const enabled = args[2]?.toLowerCase() === 'on';
                updateGuildConfig(message.guild.id, { levels: { ...config.levels, stackRewards: enabled } });
                return message.reply({ embeds: [successEmbed('Stack Roles', `Reward stacking ${enabled ? 'enabled' : 'disabled'}.`)] });
            }
            return message.reply({ embeds: [errorEmbed('Usage', ',level rewards <add|remove|list|stack> [args]')] });
        }

        if (sub === 'ignore') {
            const action = args[1]?.toLowerCase();
            const target = message.mentions.channels.first() || message.mentions.roles.first() || message.mentions.users.first();
            if (action === 'add') {
                if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',level ignore add <channel|role|user>')] });
                const ignoreList = config.levels?.ignore || { channels: [], roles: [], users: [] };
                if (message.mentions.channels.first()) ignoreList.channels.push(target.id);
                else if (message.mentions.roles.first()) ignoreList.roles.push(target.id);
                else ignoreList.users.push(target.id);
                updateGuildConfig(message.guild.id, { levels: { ...config.levels, ignore: ignoreList } });
                return message.reply({ embeds: [successEmbed('Ignored', `${target} will no longer gain XP.`)] });
            }
            if (action === 'remove') {
                if (!target) return message.reply({ embeds: [errorEmbed('Usage', ',level ignore remove <channel|role|user>')] });
                const ignoreList = config.levels?.ignore || { channels: [], roles: [], users: [] };
                ignoreList.channels = ignoreList.channels.filter(id => id !== target.id);
                ignoreList.roles = ignoreList.roles.filter(id => id !== target.id);
                ignoreList.users = ignoreList.users.filter(id => id !== target.id);
                updateGuildConfig(message.guild.id, { levels: { ...config.levels, ignore: ignoreList } });
                return message.reply({ embeds: [successEmbed('Unignored', `${target} can now gain XP.`)] });
            }
            if (action === 'list') {
                const ignoreList = config.levels?.ignore || { channels: [], roles: [], users: [] };
                const list = [
                    ...ignoreList.channels.map(id => `<#${id}>`),
                    ...ignoreList.roles.map(id => `<@&${id}>`),
                    ...ignoreList.users.map(id => `<@${id}>`)
                ].join('\n') || 'None';
                return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Ignored', description: list })] });
            }
            return message.reply({ embeds: [errorEmbed('Usage', ',level ignore <add|remove|list> [target]')] });
        }

        if (sub === 'set') {
            const target = message.mentions.members.first();
            const lvl = parseInt(args[2]);
            if (!target || !lvl) return message.reply({ embeds: [errorEmbed('Usage', ',level set @user <level>')] });
            const { setLevelData } = require('../../utils/levels');
            setLevelData(message.guild.id, target.id, lvl, 0);
            return message.reply({ embeds: [successEmbed('Level Set', `${target} is now level **${lvl}**.`)] });
        }

        if (sub === 'leaderboard') {
            const { getAllLevelData } = require('../../utils/levels');
            const data = getAllLevelData(message.guild.id);
            const entries = Object.entries(data)
                .map(([id, d]) => ({ id, level: d.level, xp: d.xp, totalXp: d.totalXp }))
                .sort((a, b) => b.totalXp - a.totalXp)
                .slice(0, 20);

            if (!entries.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Level Leaderboard', description: 'No data yet.' })] });

            const pages = [];
            for (let i = 0; i < entries.length; i += 10) {
                const chunk = entries.slice(i, i + 10);
                pages.push({
                    color: 0x6c5ce7,
                    title: 'Level Leaderboard',
                    description: chunk.map((e, j) => `**${i + j + 1}.** <@${e.id}> — Level **${e.level}** (${e.totalXp} XP)`).join('\n')
                });
            }
            return new Paginator(pages, { userId: message.author.id }).start(message.channel);
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid subcommands listed above.')] });
    }
};
