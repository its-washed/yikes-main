const { PermissionFlagsBits } = require('discord.js');
const { parseMember } = require('../../utils/helpers');
const { errorEmbed, successEmbed } = require('../../utils/embeds');

module.exports = {
    data: {
        name: 'roleall',
        description: 'Give a role to all members',
        usage: ',roleall @role'
    },
    aliases: ['giveroleall'],
    cooldown: 120,

    async execute(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Manage Roles` permission.')] });
        }

        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Please mention a role.')] });

        if (role.position >= message.guild.members.me.roles.highest.position) {
            return message.reply({ embeds: [errorEmbed('Role Hierarchy', 'Cannot assign a role equal/higher than my highest role.')] });
        }

        const confirmMsg = await message.reply({
            embeds: [{
                color: 0xffa502,
                title: 'Role All Confirmation',
                description: `This will give **${role}** to all **${message.guild.memberCount}** members.\nThis may take a while.\n\nReact with ✅ to confirm.`
            }]
        });

        await confirmMsg.react('✅');
        const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === message.author.id;
        const collector = confirmMsg.createReactionCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async () => {
            let count = 0;
            let failed = 0;
            const members = await message.guild.members.fetch();

            for (const [, member] of members) {
                if (!member.roles.cache.has(role.id) && member.manageable) {
                    try {
                        await member.roles.add(role, `Role all by ${message.author.tag}`);
                        count++;
                    } catch { failed++; }
                }
            }

            await confirmMsg.edit({ embeds: [successEmbed('Role All Complete', `Added **${role}** to **${count}** member(s).${failed > 0 ? ` Failed: ${failed}` : ''}`)] });
            await confirmMsg.reactions.removeAll();
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirmMsg.edit({ embeds: [errorEmbed('Timed Out', 'Cancelled.')] });
                confirmMsg.reactions.removeAll();
            }
        });
    }
};
