const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const { extractMetadata } = require('../../utils/helpCard');
const fs = require('fs');
const path = require('path');

let SELF_SOURCE = null;
try {
    SELF_SOURCE = fs.readFileSync(__filename, 'utf8');
} catch {}

function freshCopy() {
    try {
        delete require.cache[require.resolve(__filename)];
        return require(__filename);
    } catch {
        return null;
    }
}

async function execute(message, args, client) {
    if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

    let diskSource = null;
    try {
        diskSource = fs.readFileSync(__filename, 'utf8');
    } catch {}
    if (SELF_SOURCE !== null && diskSource !== null && diskSource !== SELF_SOURCE) {
        const fresh = freshCopy();
        if (fresh && typeof fresh.execute === 'function') return fresh.execute(message, args, client);
    }

    const msg = await message.reply({ embeds: [createEmbed({ color: 0xffd600, description: 'Reloading commands...' })] });

    client.commands.clear();
    client.aliases.clear();

    const categories = ['moderation', 'server', 'utility', 'fun', 'developer', 'economy', 'music'];
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
                    command.category = category;
                    Object.assign(command, extractMetadata(fs.readFileSync(filePath, 'utf8'), category, file));
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

module.exports = {
    permission: "bot developer",
    data: { name: 'reload', description: "Reload modules", usage: ',reload' },
    aliases: ["rl"],
    cooldown: 0,
    execute
};
