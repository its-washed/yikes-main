const { PermissionFlagsBits, ChannelType } = require('discord.js');
const { warn, approve } = require('../../utils/context');
const { needPerm, needBotPerm, confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { COLORS, EMOJIS } = require('../../utils/styles');

function resolveCategory(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && mentioned.type === ChannelType.GuildCategory) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const byId = message.guild.channels.cache.get(id);
        if (byId && byId.type === ChannelType.GuildCategory) return byId;
    }
    return message.guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === raw.toLowerCase()) || null;
}

async function needCategoryPerm(message) {
    if (!await needPerm(message, PermissionFlagsBits.ManageChannels)) return false;
    if (!await needBotPerm(message, PermissionFlagsBits.ManageChannels)) return false;
    return true;
}

module.exports = {
    permission: "manage channels",
    data: { name: 'category', description: 'Manage categories in your server', usage: ',category <create|delete|rename|duplicate>' },
    aliases: [],
    cooldown: 3,
    subcommands: ['create', 'delete', 'rename', 'duplicate'],
    subUsages: {
        create: ',category create home',
        delete: ',category delete home',
        rename: ',category rename home privat',
        duplicate: ',category duplicate home'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs: {
        create: {
            aliases: [],
            data: { name: 'category create', description: 'Create a category in your server', usage: ',category create home' },
            async execute(message, args, client, config) {
                if (!await needCategoryPerm(message)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'You must provide a name for the category\n> Usage: `category create <name>`');
                const category = await message.guild.channels.create({ name, type: ChannelType.GuildCategory }).catch(err => {
                    warn(message, `I couldn't create the category\n\`\`\`\`${err.message}\`\`\`\``);
                    return null;
                });
                if (!category) return;
                return approve(message, `Created category ${category}`);
            }
        },

        delete: {
            aliases: ['del', 'remove'],
            data: { name: 'category delete', description: 'Delete a category in your server', usage: ',category delete home' },
            async execute(message, args, client, config) {
                if (!await needCategoryPerm(message)) return;
                const category = resolveCategory(message, args.join(' '));
                if (!category) return warn(message, `Category **${args.join(' ')}** couldn't be found`);

                await confirm(message,
                    `${EMOJIS.QUESTION} ${message.author}: Are you sure you want to **delete** the category \`#${category.name}\`?`,
                    async (interaction) => {
                        try {
                            await category.delete(`Deleted by ${message.author} ${message.author.id}`);
                        } catch (err) {
                            return interaction.update({
                                embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: Couldn't delete \`#${category.name}\`` }],
                                components: []
                            }).catch(() => {});
                        }
                        await interaction.update({
                            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Deleted category \`#${category.name}\`` }],
                            components: []
                        }).catch(() => {});
                    },
                    async (interaction) => {
                        await interaction.update({
                            embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: Category deletion got canceled` }],
                            components: []
                        }).catch(() => {});
                    });
            }
        },

        rename: {
            aliases: ['name'],
            data: { name: 'category rename', description: 'Rename a category in your server', usage: ',category rename home privat' },
            async execute(message, args, client, config) {
                if (!await needCategoryPerm(message)) return;
                const parts = [...args];
                const resolved = resolveCategory(message, parts[0]);
                const category = resolved || resolveCategory(message, parts.join(' '));
                if (!category) return warn(message, `Category **${args.join(' ')}** couldn't be found`);
                if (resolved) parts.shift();
                const name = parts.join(' ').trim();
                if (!name) return warn(message, 'You must provide a new name\n> Usage: `category rename <name> <newname>`');
                const oldName = category.name;
                try {
                    await category.edit({ name, reason: `Edited by ${message.author} (${message.author.id})` });
                } catch (err) {
                    return warn(message, `Couldn't rename **${oldName}**`);
                }
                return approve(message, `Renamed **${oldName}** to \`${name}\``);
            }
        },

        duplicate: {
            aliases: ['clone', 'remake'],
            data: { name: 'category duplicate', description: 'Clone an already existing category in your server', usage: ',category duplicate home' },
            async execute(message, args, client, config) {
                if (!await needCategoryPerm(message)) return;
                const category = resolveCategory(message, args.join(' '));
                if (!category) return warn(message, `Category **${args.join(' ')}** couldn't be found`);
                const clone = await category.clone({ name: category.name, reason: `Cloned by ${message.author} (${message.author.id})` }).catch(err => {
                    warn(message, `I couldn't clone the category\n\`\`\`\`${err.message}\`\`\`\``);
                    return null;
                });
                if (!clone) return;
                return approve(message, `Cloned ${category} to ${clone}`);
            }
        }
    }
};
