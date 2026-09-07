const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { execSync } = require('child_process');

module.exports = {
    data: { name: 'npm', description: 'NPM operations (Developer only)', usage: ',npm <install|update|list> [package]' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const action = args[0]?.toLowerCase();
        if (!action) return message.reply({ embeds: [errorEmbed('Usage', ',npm <install|update|list> [package]')] });

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: `Running \`npm ${action}\`...` })] });

        try {
            let cmd = `npm ${action}`;
            if (action === 'install' || action === 'i') cmd += ` ${args.slice(1).join(' ')}`;
            if (action === 'update') cmd += ' --latest';
            const output = execSync(cmd, { encoding: 'utf8', timeout: 60000 });
            const result = output.length > 1800 ? output.slice(0, 1800) + '...' : output;

            return msg.edit({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: `NPM ${action}`,
                    fields: [{ name: 'Output', value: `\`\`\`\n${result || '(no output)'}\n\`\`\`` }]
                })]
            });
        } catch (e) {
            return msg.edit({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: `NPM ${action} Error`,
                    fields: [{ name: 'Error', value: `\`\`\`\n${e.message.slice(0, 1500)}\n\`\`\`` }]
                })]
            });
        }
    }
};
