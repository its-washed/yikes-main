const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { isAdmin } = require('../../utils/permissions');
const { Paginator } = require('../../utils/pagination');
const { resolve } = require('../../utils/variables');

module.exports = {
    data: {
        name: 'autorespond',
        description: 'Manage auto-responders',
        usage: ',autorespond <add|remove|list> [trigger] [response]'
    },
    aliases: ['ar', 'autoresponder'],
    cooldown: 5,

    async execute(message, args, client, config) {
        if (!isAdmin(message.member)) {
            return message.reply({ embeds: [errorEmbed('Permission Denied', 'You need Administrator.')] });
        }

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`')] });
    },

    async handleAdd(message, args, config) {
        const trigger = args[0];
        const response = args.slice(1).join(' ');
        if (!trigger || !response) {
            return message.reply({ embeds: [errorEmbed('Usage', ',autorespond add <trigger> <response>')] });
        }

        const responders = config.autoResponders || [];
        const existing = responders.find(r => r.trigger.toLowerCase() === trigger.toLowerCase());
        if (existing) {
            return message.reply({ embeds: [errorEmbed('Exists', `Trigger \`${trigger}\` already exists. Remove it first.`)] });
        }

        responders.push({
            trigger: trigger.toLowerCase(),
            response,
            wildcard: trigger.includes('*'),
            exact: !trigger.includes('*'),
            createdBy: message.author.id,
            createdAt: Date.now()
        });

        updateGuildConfig(message.guild.id, { autoResponders: responders });
        return message.reply({ embeds: [successEmbed('Added', `Trigger: \`${trigger}\`\nResponse set.`)] });
    },

    async handleRemove(message, args, config) {
        const trigger = args.join(' ');
        if (!trigger) return message.reply({ embeds: [errorEmbed('Usage', ',autorespond remove <trigger>')] });

        const responders = config.autoResponders || [];
        const idx = responders.findIndex(r => r.trigger.toLowerCase() === trigger.toLowerCase());
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', 'No responder with that trigger.')] });

        responders.splice(idx, 1);
        updateGuildConfig(message.guild.id, { autoResponders: responders });
        return message.reply({ embeds: [successEmbed('Removed', `Trigger \`${trigger}\` deleted.`)] });
    },

    async handleList(message, config) {
        const responders = config.autoResponders || [];
        if (responders.length === 0) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Auto-Responders', description: 'No auto-responders configured.\nUse `,autorespond add <trigger> <response>` to create one.' })] });
        }

        const pages = [];
        for (let i = 0; i < responders.length; i += 8) {
            const chunk = responders.slice(i, i + 8);
            pages.push({
                color: 0x6c5ce7,
                title: `Auto-Responders (${responders.length})`,
                description: chunk.map((r, j) => `**${i + j + 1}.** \`${r.trigger}\` ${r.wildcard ? '(wildcard)' : ''}`).join('\n')
            });
        }

        const paginator = new Paginator(pages, { userId: message.author.id });
        return paginator.start(message.channel);
    }
};
