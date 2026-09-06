const { createEmbed, errorEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'eval', description: 'Evaluate JavaScript code (Developer only)', usage: ',eval [code]' },
    aliases: [],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });
        const code = args.join(' ');
        if (!code) return message.reply({ embeds: [errorEmbed('Missing Code', 'Usage: ,eval [code]')] });

        try {
            let result = eval(code);
            if (result instanceof Promise) result = await result;
            if (typeof result !== 'string') result = require('util').inspect(result, { depth: 2 });

            if (result.length > 1900) result = result.slice(0, 1900) + '...';

            return message.reply({
                embeds: [createEmbed({
                    color: 0x22c55e,
                    title: 'Eval Result',
                    fields: [
                        { name: 'Input', value: `\`\`\`js\n${code.slice(0, 1000)}\n\`\`\`` },
                        { name: 'Output', value: `\`\`\`js\n${result}\n\`\`\`` }
                    ]
                })]
            });
        } catch (error) {
            return message.reply({
                embeds: [createEmbed({
                    color: 0xff4757,
                    title: 'Eval Error',
                    fields: [
                        { name: 'Input', value: `\`\`\`js\n${code.slice(0, 1000)}\n\`\`\`` },
                        { name: 'Error', value: `\`\`\`js\n${error.message.slice(0, 1000)}\n\`\`\`` }
                    ]
                })]
            });
        }
    }
};
