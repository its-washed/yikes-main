const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

module.exports = {
    data: { name: 'reload', description: 'Reload all commands (Developer only)', usage: ',reload' },
    aliases: [],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });

        const msg = await message.reply({ embeds: [createEmbed({ color: 0xfbbf24, description: 'Reloading commands...' })] });

        client.commands.clear();
        client.aliases.clear();

        const fs = require('fs');
        const path = require('path');
        const categories = ['moderation', 'server', 'utility', 'fun', 'developer', 'economy'];
        let loaded = 0;

        for (const category of categories) {
            const commandsPath = path.join(__dirname, '..', category);
            if (!fs.existsSync(commandsPath)) continue;
            const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(commandsPath, file);
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);
                    if ('data' in command && 'execute' in command) {
                        client.commands.set(command.data.name, command);
                        if (command.aliases) {
                            for (const alias of command.aliases) {
                                client.aliases.set(alias, command.data.name);
                            }
                        }
                        loaded++;
                    }
                } catch {}
            }
        }

        return msg.edit({ embeds: [successEmbed(`Reloaded **${loaded}** commands.`)] });
    }
};
