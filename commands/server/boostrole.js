const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data/boosters.json');

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

const GRADIENTS = {
    sunset: ['#ff6b6b', '#ffa502', '#ff4757'],
    ocean: ['#0984e3', '#74b9ff', '#00cec9'],
    forest: ['#00b894', '#55efc4', '#00cec9'],
    purple: ['#a855f7', '#6c5ce7', '#d946ef'],
    pink: ['#ec4899', '#f472b6', '#fb7185'],
    gold: ['#fbbf24', '#f59e0b', '#d97706'],
    dark: ['#1f2937', '#374151', '#4b5563'],
    ice: ['#06b6d4', '#22d3ee', '#67e8f9'],
    fire: ['#ef4444', '#f97316', '#fbbf24'],
    neon: ['#22c55e', '#06b6d4', '#a855f7']
};

module.exports = {
    data: {
        name: 'boostrole',
        description: 'Customize your booster role',
        usage: ',boostrole [name/icon/color]'
    },
    aliases: ['brole', 'myrole'],
    cooldown: 30,

    async execute(message, args) {
        if (!message.member.permissions.has('ManageGuild')) {
            const data = loadData();
            const guildId = message.guild.id;
            if (!data[guildId] || !data[guildId].allowCustomization) {
                return message.reply({ embeds: [errorEmbed('Not Available', 'Booster role customization is not enabled.')] });
            }
        }

        const data = loadData();
        const guildId = message.guild.id;

        if (!data[guildId] || !data[guildId].boostRole) {
            return message.reply({ embeds: [errorEmbed('Not Setup', 'Server booster roles are not configured.')] });
        }

        const action = (args[0] || '').toLowerCase();
        const value = args.slice(1).join(' ');

        if (!action) {
            const gradientList = Object.keys(GRADIENTS).map(g => `\`${g}\``).join(', ');
            return message.reply({
                embeds: [createEmbed({
                    color: 0xec4899,
                    title: 'Boost Role Customization',
                    description: 'Use these commands to customize your booster role:\n\n' +
                        '`,boostrole name [name]` — Change role name\n' +
                        '`,boostrole color [hex]` — Set solid color\n' +
                        '`,boostrole gradient [name]` — Set gradient theme\n' +
                        '`,boostrole icon [emoji/url]` — Set role icon (boost level 2+)\n' +
                        '`,boostrole reset` — Reset to default\n\n' +
                        `**Available Gradients:** ${gradientList}`
                })]
            });
        }

        const memberBoosted = message.member.premiumSince;
        if (!memberBoosted) {
            return message.reply({ embeds: [errorEmbed('Not a Booster', 'You need to be a server booster to customize your role.')] });
        }

        const boostRoleId = data[guildId].boostRole;
        const customRoleId = data[guildId].customRoles?.[message.author.id];
        let role;

        if (customRoleId) {
            role = message.guild.roles.cache.get(customRoleId);
        }

        if (!role) {
            try {
                role = await message.guild.roles.create({
                    name: `${message.author.username}'s role`,
                    color: '#ec4899',
                    reason: 'Booster custom role'
                });

                if (!data[guildId].customRoles) data[guildId].customRoles = {};
                data[guildId].customRoles[message.author.id] = role.id;
                saveData(data);

                const boostRole = message.guild.roles.cache.get(boostRoleId);
                const pos = boostRole ? boostRole.position + 1 : message.guild.roles.cache.size - 1;
                await role.setPosition(pos);
            } catch (e) {
                return message.reply({ embeds: [errorEmbed('Error', 'Could not create role. Make sure the bot role is above the boost role.')] });
            }
        }

        if (action === 'name') {
            if (!value) return message.reply({ embeds: [errorEmbed('Missing Name', 'Provide a role name.')] });
            if (value.length > 32) return message.reply({ embeds: [errorEmbed('Too Long', 'Role name must be 32 characters or less.')] });
            await role.setName(value);
            return message.reply({ embeds: [successEmbed('Role Updated', `Name changed to **${value}**`)] });
        }

        if (action === 'color' || action === 'colour') {
            if (!value) return message.reply({ embeds: [errorEmbed('Missing Color', 'Provide a hex color like `#ff0000`.')] });
            const hex = value.startsWith('#') ? value : `#${value}`;
            if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return message.reply({ embeds: [errorEmbed('Invalid Color', 'Provide a valid hex code.')] });
            await role.setColor(hex);
            return message.reply({ embeds: [successEmbed('Role Updated', `Color changed to **${hex}**`)] });
        }

        if (action === 'gradient') {
            const gradient = GRADIENTS[value.toLowerCase()];
            if (!gradient) {
                const gradientList = Object.keys(GRADIENTS).map(g => `\`${g}\``).join(', ');
                return message.reply({ embeds: [errorEmbed('Invalid Gradient', `Available: ${gradientList}`)] });
            }
            await role.setColor(gradient[0]);
            await role.setName(`${message.author.username}'s role`);
            return message.reply({ embeds: [successEmbed('Role Updated', `Gradient **${value}** applied!\nPrimary color: **${gradient[0]}**`)] });
        }

        if (action === 'icon') {
            if (!value) return message.reply({ embeds: [errorEmbed('Missing Icon', 'Provide an emoji or image URL.')] });

            try {
                if (value.startsWith('http')) {
                    await role.setIcon(value);
                } else {
                    await role.setIcon(value);
                }
                return message.reply({ embeds: [successEmbed('Role Updated', 'Role icon updated!')] });
            } catch {
                return message.reply({ embeds: [errorEmbed('Error', 'Could not set icon. You need boost level 2+ for role icons.')] });
            }
        }

        if (action === 'reset') {
            await role.setName(`${message.author.username}'s role`);
            await role.setColor('#ec4899');
            await role.setIcon(null);
            return message.reply({ embeds: [successEmbed('Role Reset', 'Role has been reset to default.')]} );
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `name`, `color`, `gradient`, `icon`, or `reset`.')] });
    }
};
