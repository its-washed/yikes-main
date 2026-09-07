const { updateGuildConfig } = require('../../utils/config');
const { errorEmbed, successEmbed, createEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');

module.exports = {
    data: {
        name: 'alias',
        description: 'Create custom command aliases with argument support',
        usage: ',alias <add|remove|list> [args]'
    },
    cooldown: 5,

    async execute(message, args, client, config) {
        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `add`, `remove`, `list`')] });

        if (sub === 'add') return this.handleAdd(message, args.slice(1), config);
        if (sub === 'remove') return this.handleRemove(message, args.slice(1), config);
        if (sub === 'list') return this.handleList(message, config);

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `add`, `remove`, `list`')] });
    },

    async handleAdd(message, args, config) {
        const aliasName = args[0]?.toLowerCase();
        const command = args[1]?.toLowerCase();
        const commandArgs = args.slice(2).join(' ');

        if (!aliasName || !command) {
            return message.reply({ embeds: [errorEmbed('Usage', ',alias add <alias> <command> [args]\n\nUse `{0}`, `{1}` etc. for user input.\nExample: `,alias add shh timeout {0} 10m`')] });
        }

        const cmd = message.client.commands.get(command) || message.client.commands.get(message.client.aliases.get(command));
        if (!cmd) return message.reply({ embeds: [errorEmbed('Invalid Command', `\`${command}\` is not a valid command.`)] });

        const aliases = config.customAliases || [];
        const existing = aliases.find(a => a.name === aliasName);
        if (existing) {
            return message.reply({ embeds: [errorEmbed('Exists', `Alias \`${aliasName}\` already exists. Remove it first.`)] });
        }

        aliases.push({
            name: aliasName,
            command,
            args: commandArgs || '',
            createdBy: message.author.id,
            createdAt: Date.now()
        });

        updateGuildConfig(message.guild.id, { customAliases: aliases });
        return message.reply({ embeds: [successEmbed('Alias Created', `\`,${aliasName}\` now runs \`,${command} ${commandArgs}\`\n\nUse \`{0}\`, \`{1}\` etc. for user input.`)] });
    },

    async handleRemove(message, args, config) {
        const aliasName = args[0]?.toLowerCase();
        if (!aliasName) return message.reply({ embeds: [errorEmbed('Usage', ',alias remove <alias>')] });

        const aliases = config.customAliases || [];
        const idx = aliases.findIndex(a => a.name === aliasName);
        if (idx === -1) return message.reply({ embeds: [errorEmbed('Not Found', `No alias named \`${aliasName}\`.`)] });

        aliases.splice(idx, 1);
        updateGuildConfig(message.guild.id, { customAliases: aliases });
        return message.reply({ embeds: [successEmbed('Removed', `Alias \`${aliasName}\` deleted.`)] });
    },

    async handleList(message, config) {
        const aliases = config.customAliases || [];
        if (!aliases.length) {
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Custom Aliases', description: 'No aliases configured.\nUse `,alias add <name> <command> [args]` to create one.' })] });
        }

        const pages = [];
        for (let i = 0; i < aliases.length; i += 10) {
            const chunk = aliases.slice(i, i + 10);
            pages.push({
                color: 0x6c5ce7,
                title: `Custom Aliases (${aliases.length})`,
                description: chunk.map((a, j) => `**${i + j + 1}.** \`,${a.name}\` → \`,${a.command} ${a.args}\``).join('\n')
            });
        }

        return new Paginator(pages, { userId: message.author.id }).start(message.channel);
    }
};
