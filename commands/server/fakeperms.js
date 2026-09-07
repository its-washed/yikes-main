const { PermissionFlagsBits, PermissionsBitField, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin, isOwner } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');

const FAKE_PERMS = {
    moderator: [
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageNicknames,
        PermissionFlagsBits.KickMembers
    ],
    administrator: [
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageNicknames,
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.KickMembers
    ],
    coowner: [
        PermissionFlagsBits.Administrator
    ]
};

const PERM_NAMES = {
    Administrator: 'Full admin access',
    ManageRoles: 'Manage roles',
    ManageChannels: 'Manage channels',
    BanMembers: 'Ban members',
    KickMembers: 'Kick members',
    ManageMessages: 'Delete messages',
    ModerateMembers: 'Timeout members',
    ManageNicknames: 'Change nicknames',
    ManageWebhooks: 'Manage webhooks',
    MentionEveryone: 'Mention everyone',
    ManageThreads: 'Manage threads',
    MoveMembers: 'Move members',
    DeafenMembers: 'Deafen members',
    MuteMembers: 'Mute members',
    ViewAuditLog: 'View audit log'
};

module.exports = {
    data: {
        name: 'fakeperms',
        description: 'Manage fake permissions for roles',
        usage: ',fakeperms <add|remove|list|preset|scan|clear> [args]'
    },
    aliases: ['fperms', 'fakepermissions'],
    cooldown: 10,

    async execute(message, args, client, config) {
        if (!isOwner(message.member)) {
            return message.reply({ embeds: [errorEmbed('Owner Only', 'Only the server owner can manage fake permissions.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`, `preset`, `scan`, `clear`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);
        if (sub === 'preset') return this.handlePreset(message, args.slice(1), config);
        if (sub === 'scan') return this.handleScan(message);
        if (sub === 'clear') return this.handleClear(message, args.slice(1), config);

        return message.reply({ embeds: [errorEmbed('Invalid Subcommand', 'Valid: `add`, `remove`, `list`, `preset`, `scan`, `clear`')] });
    },

    async handleAdd(message, args, config) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a role to add fake perms to.')] });

        const permArg = args.slice(1).join(' ').toLowerCase();
        if (!permArg) return message.reply({ embeds: [errorEmbed('No Permission', 'Specify a permission or `all`.')] });

        const fakePerms = config.fakePermissions || {};
        if (!fakePerms[role.id]) fakePerms[role.id] = [];

        if (permArg === 'all') {
            const stripped = [];
            for (const [name, bit] of Object.entries(PermissionFlagsBits)) {
                if (role.permissions.has(bit) && bit !== PermissionFlagsBits.Administrator) {
                    stripped.push(name);
                }
            }
            if (stripped.length === 0) {
                return message.reply({ embeds: [errorEmbed('Nothing to Strip', 'Role has no dangerous permissions.')] });
            }
            const newPerms = new PermissionsBitField(role.permissions);
            stripped.forEach(p => newPerms.remove(PermissionFlagsBits[p]));
            try {
                await role.setPermissions(newPerms, `FakePerms by ${message.author.tag}`);
                fakePerms[role.id] = [...new Set([...fakePerms[role.id], ...stripped])];
                updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
                return message.reply({ embeds: [successEmbed('Stripped', `Removed ${stripped.length} permission(s) from **${role.name}**.`)] });
            } catch (e) {
                return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
            }
        }

        const permBit = PermissionFlagsBits[permArg] || Object.entries(PermissionFlagsBits).find(([k]) => k.toLowerCase() === permArg)?.[1];
        if (!permBit) {
            const valid = Object.keys(PERM_NAMES).join(', ');
            return message.reply({ embeds: [errorEmbed('Invalid Permission', `Valid: ${valid}`)] });
        }

        if (!role.permissions.has(permBit)) {
            return message.reply({ embeds: [errorEmbed('Not Set', `**${role.name}** doesn't have that permission.`)] });
        }

        const newPerms = new PermissionsBitField(role.permissions);
        newPerms.remove(permBit);
        try {
            await role.setPermissions(newPerms, `FakePerms by ${message.author.tag}`);
            fakePerms[role.id] = [...new Set([...fakePerms[role.id], permArg])];
            updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
            return message.reply({ embeds: [successEmbed('Stripped', `Stripped \`${permArg}\` from **${role.name}**.`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    },

    async handleRemove(message, args, config) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a role.')] });

        const permArg = args.slice(1).join(' ');
        const fakePerms = config.fakePermissions || {};
        if (!fakePerms[role.id]) {
            return message.reply({ embeds: [errorEmbed('No Protection', 'This role has no fake perms set.')] });
        }

        if (!permArg || permArg.toLowerCase() === 'all') {
            delete fakePerms[role.id];
            updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
            return message.reply({ embeds: [successEmbed('Cleared', `Removed all fake perm protection from **${role.name}**.`)] });
        }

        const idx = fakePerms[role.id].indexOf(permArg);
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'That permission is not stripped for this role.')] });

        fakePerms[role.id].splice(idx, 1);
        if (fakePerms[role.id].length === 0) delete fakePerms[role.id];
        updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
        return message.reply({ embeds: [successEmbed('Removed', `Removed \`${permArg}\` from **${role.name}**.`)] });
    },

    async handleList(message, config) {
        const fakePerms = config.fakePermissions || {};
        const roles = Object.entries(fakePerms).filter(([k]) => !k.startsWith('_'));

        if (roles.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Fake Permissions', description: 'No roles protected yet.\nUse `,fakeperms add @role <permission>` or `,fakeperms preset moderator @role`' })] });
        }

        const pages = [];
        for (let i = 0; i < roles.length; i += 3) {
            const chunk = roles.slice(i, i + 3);
            pages.push({
                color: 0x6c5ce7,
                title: 'Fake Permissions',
                description: chunk.map(([roleId, perms]) => {
                    const role = message.guild.roles.cache.get(roleId);
                    const name = role ? `@${role.name}` : roleId;
                    return `**${name}**\n${perms.map(p => `\`${p}\``).join(', ')}`;
                }).join('\n\n'),
                footer: { text: `${roles.length} role(s) protected` }
            });
        }

        const paginator = new Paginator(pages, { userId: message.author.id });
        return paginator.start(message.channel);
    },

    async handlePreset(message, args, config) {
        const presetName = args[0]?.toLowerCase();
        const role = message.mentions.roles.first();
        if (!presetName || !role) {
            return message.reply({ embeds: [errorEmbed('Usage', ',fakeperms preset <moderator|administrator|coowner> @role')] });
        }

        const preset = FAKE_PERMS[presetName];
        if (!preset) {
            return message.reply({ embeds: [errorEmbed('Invalid Preset', 'Valid: `moderator`, `administrator`, `coowner`')] });
        }

        const fakePerms = config.fakePermissions || {};
        if (!fakePerms[role.id]) fakePerms[role.id] = [];

        const stripped = [];
        for (const perm of preset) {
            if (role.permissions.has(perm)) {
                const name = Object.entries(PermissionFlagsBits).find(([k, v]) => v === perm)?.[0];
                if (name) stripped.push(name);
            }
        }

        if (stripped.length === 0) {
            return message.reply({ embeds: [errorEmbed('Nothing to Strip', 'Role already has none of these permissions.')] });
        }

        const newPerms = new PermissionsBitField(role.permissions);
        stripped.forEach(p => newPerms.remove(PermissionFlagsBits[p]));

        try {
            await role.setPermissions(newPerms, `FakePerms ${presetName} preset by ${message.author.tag}`);
            fakePerms[role.id] = [...new Set([...fakePerms[role.id], ...stripped])];
            updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
            return message.reply({ embeds: [successEmbed('Preset Applied', `Applied **${presetName}** preset to **${role.name}**.\nStripped: ${stripped.map(p => `\`${p}\``).join(', ')}`)] });
        } catch (e) {
            return message.reply({ embeds: [errorEmbed('Failed', e.message)] });
        }
    },

    async handleScan(message) {
        const dangerous = [];
        message.guild.roles.cache.forEach(role => {
            if (role.position === 0 || role.position >= message.guild.members.me.roles.highest.position) return;
            if (role.managed) return;

            const perms = role.permissions.toArray();
            const found = perms.filter(p => p !== 'Administrator' && PERM_NAMES[p]);
            if (found.length > 0) dangerous.push({ role, perms: found });
        });

        if (dangerous.length === 0) {
            return message.reply({ embeds: [successEmbed('Scan Complete', 'No roles with dangerous permissions found.')] });
        }

        const pages = [];
        for (let i = 0; i < dangerous.length; i += 5) {
            const chunk = dangerous.slice(i, i + 5);
            pages.push({
                color: 0xffa502,
                title: `Roles with Dangerous Permissions (${dangerous.length})`,
                description: chunk.map(d => `**${d.role.name}**\n${d.perms.map(p => `\`${p}\``).join(', ')}`).join('\n\n')
            });
        }

        const paginator = new Paginator(pages, { userId: message.author.id });
        return paginator.start(message.channel);
    },

    async handleClear(message, args, config) {
        const role = message.mentions.roles.first();
        if (!role) return message.reply({ embeds: [errorEmbed('No Role', 'Mention a role.')] });

        const fakePerms = config.fakePermissions || {};
        if (!fakePerms[role.id]) {
            return message.reply({ embeds: [errorEmbed('Nothing to Clear', 'This role has no fake perms.')] });
        }

        delete fakePerms[role.id];
        updateGuildConfig(message.guild.id, { fakePermissions: fakePerms });
        return message.reply({ embeds: [successEmbed('Cleared', `Removed all fake perms from **${role.name}**.`)] });
    }
};
