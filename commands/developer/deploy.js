const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'deploy', description: 'Deploy slash commands (Developer only)', usage: ',deploy <guild|global> [guildId]' },
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const target = args[0]?.toLowerCase();
        if (!target || !['guild', 'global'].includes(target)) {
            return message.reply({ embeds: [errorEmbed('Usage', ',deploy <guild|global> [guildId]')] });
        }

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Deploying commands...' })] });

        try {
            const commands = [];
            client.commands.forEach(cmd => {
                commands.push({
                    name: cmd.data.name,
                    description: cmd.data.description || '',
                    options: cmd.data.options || []
                });
            });

            if (target === 'guild') {
                const guildId = args[1] || message.guild.id;
                const guild = client.guilds.cache.get(guildId);
                if (!guild) return msg.edit({ embeds: [errorEmbed('Not Found', 'Bot is not in that server.')] });
                await guild.commands.set(commands);
                return msg.edit({ embeds: [successEmbed('Deployed', `Deployed **${commands.length}** commands to **${guild.name}**.`)] });
            } else {
                await client.application.commands.set(commands);
                return msg.edit({ embeds: [successEmbed('Deployed', `Deployed **${commands.length}** commands globally.`)] });
            }
        } catch (e) {
            return msg.edit({ embeds: [errorEmbed('Failed', e.message)] });
        }
    }
};
