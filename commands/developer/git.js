const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { execSync } = require('child_process');

module.exports = {
    data: { name: 'git', description: 'Git operations (Developer only)', usage: ',git <pull|push|status|log|diff> [args]' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const action = args[0]?.toLowerCase();
        if (!action) return message.reply({ embeds: [errorEmbed('Usage', ',git <pull|push|status|log|diff>')] });

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: `Running \`git ${action}\`...` })] });

        try {
            const cmd = `git ${action} ${args.slice(1).join(' ')}`;
            const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
            const result = output.length > 1800 ? output.slice(0, 1800) + '...' : output;

            return msg.edit({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: `Git ${action}`,
                    fields: [{ name: 'Output', value: `\`\`\`\n${result || '(no output)'}\n\`\`\`` }]
                })]
            });
        } catch (e) {
            return msg.edit({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: `Git ${action} Error`,
                    fields: [{ name: 'Error', value: `\`\`\`\n${e.message.slice(0, 1500)}\n\`\`\`` }]
                })]
            });
        }
    }
};
