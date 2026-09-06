const { PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { hasPermission, isAdmin, isOwner } = require('../../utils/permissions');

const DANGEROUS_PERMISSIONS = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'BanMembers',
    'KickMembers',
    'ManageMessages',
    'MentionEveryone',
    'ManageWebhooks',
    'ManageNicknames',
    'ModerateMembers',
    'ManageThreads',
    'CreatePublicThreads',
    'CreatePrivateThreads',
    'SendMessagesInThreads',
    'MoveMembers',
    'DeafenMembers',
    'MuteMembers',
    'PrioritySpeaker',
    'GoLive',
    'ViewAuditLog'
];

module.exports = {
    data: {
        name: 'fakeperms',
        description: 'Manage fake permissions — strip dangerous perms from roles via API',
        usage: ',fakeperms [setup|add|remove|list|scan]'
    },
    aliases: ['fakepermissions', 'fperms'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need `Administrator` permission.')] });
        }

        const action = args[0]?.toLowerCase();

        if (!action || action === 'list') {
            const fakePerms = config.fakePermissions || {};
            const protectedRoles = Object.keys(fakePerms);
            const totalStrips = fakePerms._totalStrips || 0;

            const fields = protectedRoles.filter(k => !k.startsWith('_')).map(roleId => {
                const role = message.guild.roles.cache.get(roleId);
                const perms = fakePerms[roleId] || [];
                return {
                    name: role ? role.name : roleId,
                    value: `${perms.length} dangerous permission(s) stripped`,
                    inline: true
                };
            });

            if (fields.length === 0) fields.push({ name: 'None', value: 'No roles protected yet. Use `,fakeperms setup`.', inline: false });

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: 'Fake Permissions System',
                    description: 'Strips dangerous permissions from roles through the Discord API, preventing members from gaining them even if an admin accidentally grants them.',
                    fields: [
                        ...fields,
                        { name: 'Total Strips', value: `${totalStrips}`, inline: true }
                    ]
                })]
            });
        }

        if (action === 'scan') {
            const dangerous = [];
            message.guild.roles.cache.forEach(role => {
                if (role.position === 0 || role.position >= message.guild.members.me.roles.highest.position) return;

                const perms = role.permissions.toArray();
                const found = perms.filter(p => DANGEROUS_PERMISSIONS.includes(p));
                if (found.length > 0) {
                    dangerous.push({ role, perms: found });
                }
            });

            if (dangerous.length === 0) {
                return message.reply({ embeds: [successEmbed('Scan Complete', 'No roles with dangerous permissions found!')] });
            }

            const desc = dangerous.map(d => `**${d.role.name}** — ${d.perms.join(', ')}`).join('\n');
            return message.reply({
                embeds: [createEmbed({
                    color: 0xffa502,
                    title: `Found ${dangerous.length} Role(s) with Dangerous Permissions`,
                    description: desc.length > 4000 ? desc.slice(0, 4000) + '...' : desc
                })]
            });
        }

        if (action === 'setup') {
            const confirmMsg = await message.reply({
                embeds: [createEmbed({
                    color: 0xffa502,
                    title: 'Fake Perms Setup',
                    description: `This will scan all roles and strip dangerous permissions.\n\n**Dangerous permissions:**\n\`${DANGEROUS_PERMISSIONS.join('`, `')}\`\n\nReact with ✅ to confirm.`
                })]
            });

            await confirmMsg.react('✅');
            const filter = (reaction, user) => reaction.emoji.name === '✅' && user.id === message.author.id;
            const collector = confirmMsg.createReactionCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async () => {
                let stripped = 0;
                const fakePerms = config.fakePermissions || {};

                for (const [, role] of message.guild.roles.cache) {
                    if (role.position === 0 || role.position >= message.guild.members.me.roles.highest.position) continue;
                    if (role.managed) continue;

                    const currentPerms = role.permissions.toArray();
                    const dangerous = currentPerms.filter(p => DANGEROUS_PERMISSIONS.includes(p));

                    if (dangerous.length > 0) {
                        const newPerms = new PermissionsBitField(role.permissions);
                        dangerous.forEach(p => newPerms.remove(p));

                        try {
                            await role.setPermissions(newPerms, `FakePerms auto-strip by ${message.author.tag}`);
                            fakePerms[role.id] = dangerous;
                            stripped += dangerous.length;
                        } catch {}
                    }
                }

                fakePerms._totalStrips = (fakePerms._totalStrips || 0) + stripped;
                updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });

                await confirmMsg.edit({ embeds: [successEmbed('Setup Complete', `Stripped **${stripped}** dangerous permission(s) from roles.`)] });
                await confirmMsg.reactions.removeAll();
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    confirmMsg.edit({ embeds: [errorEmbed('Timed Out', 'Setup cancelled.')] });
                    confirmMsg.reactions.removeAll();
                }
            });
            return;
        }

        if (action === 'add' || action === 'remove') {
            const role = message.mentions.roles.first();
            if (!role) return message.reply({ embeds: [errorEmbed('Missing Role', 'Please mention a role.')] });

            const permArg = args[2];
            if (!permArg) return message.reply({ embeds: [errorEmbed('Missing Permission', 'Specify a permission like `Administrator` or `all`.')] });

            const fakePerms = config.fakePermissions || {};
            const rolePerms = fakePerms[role.id] || [];

            if (permArg.toLowerCase() === 'all') {
                if (action === 'add') {
                    const newPerms = new PermissionsBitField(role.permissions);
                    DANGEROUS_PERMISSIONS.forEach(p => {
                        if (newPerms.has(p)) {
                            newPerms.remove(p);
                            rolePerms.push(p);
                        }
                    });
                    try {
                        await role.setPermissions(newPerms, `FakePerms by ${message.author.tag}`);
                        fakePerms[role.id] = [...new Set(rolePerms)];
                        updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
                        return message.reply({ embeds: [successEmbed('Permissions Stripped', `Stripped all dangerous permissions from **${role.name}**.`)] });
                    } catch (e) {
                        return message.reply({ embeds: [errorEmbed('Error', e.message)] });
                    }
                } else {
                    fakePerms[role.id] = [];
                    updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
                    return message.reply({ embeds: [successEmbed('Protection Removed', `Removed fake perms protection from **${role.name}**.`)] });
                }
            }

            const permName = DANGEROUS_PERMISSIONS.find(p => p.toLowerCase() === permArg.toLowerCase());
            if (!permName) return message.reply({ embeds: [errorEmbed('Invalid Permission', `Valid: ${DANGEROUS_PERMISSIONS.join(', ')}`)] });

            if (action === 'add') {
                if (!role.permissions.has(permName)) {
                    return message.reply({ embeds: [errorEmbed('Not Set', `**${role.name}** doesn't have \`${permName}\`.`)] });
                }
                const newPerms = new PermissionsBitField(role.permissions);
                newPerms.remove(permName);
                try {
                    await role.setPermissions(newPerms, `FakePerms strip ${permName} by ${message.author.tag}`);
                    rolePerms.push(permName);
                    fakePerms[role.id] = [...new Set(rolePerms)];
                    updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
                    return message.reply({ embeds: [successEmbed('Permission Stripped', `Stripped \`${permName}\` from **${role.name}**.`)] });
                } catch (e) {
                    return message.reply({ embeds: [errorEmbed('Error', e.message)] });
                }
            } else {
                const idx = rolePerms.indexOf(permName);
                if (idx !== -1) rolePerms.splice(idx, 1);
                fakePerms[role.id] = rolePerms;
                updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
                return message.reply({ embeds: [successEmbed('Protection Removed', `Removed \`${permName}\` protection from **${role.name}**.`)] });
            }
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Valid actions: `setup`, `scan`, `add`, `remove`, `list`')] });
    }
};
