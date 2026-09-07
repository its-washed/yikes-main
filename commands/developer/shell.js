const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { exec } = require('child_process');

module.exports = {
    data: { name: 'shell', description: 'Execute shell commands (Developer only)', usage: ',shell [command]' },
    aliases: ['exec', 'sh'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const cmd = args.join(' ');
        if (!cmd) return message.reply({ embeds: [errorEmbed('Missing Command', 'Usage: ,shell <command>')] });

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: `Executing: \`${cmd}\`` })] });

        exec(cmd, { timeout: 30000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
            let output = '';
            if (stdout) output += stdout;
            if (stderr) output += (output ? '\n' : '') + stderr;
            if (err) output += (output ? '\n' : '') + err.message;
            if (!output) output = '(no output)';
            if (output.length > 1800) output = output.slice(0, 1800) + '...';

            msg.edit({
                embeds: [createEmbed({
                    color: err ? 0xff4757 : 0x22c55e,
                    title: err ? 'Shell Error' : 'Shell Output',
                    fields: [
                        { name: 'Command', value: `\`\`\`\n${cmd}\n\`\`\`` },
                        { name: 'Output', value: `\`\`\`\n${output}\n\`\`\`` }
                    ]
                })]
            });
        });
    }
};
