const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, Events, ActivityType } = require('discord.js');
const { loadConfig, getGuildConfig } = require('./utils/config');
const { initDatabase, closeDatabase } = require('./utils/database');
const { logger } = require('./utils/logger');
const { isBlacklisted, isDeveloper, isServerBlacklisted, isCommandDisabled } = require('./utils/developer');
const { isPremium, isPremiumCommand } = require('./utils/premium');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ],
    presence: {
        activities: [{
            name: ',help | Protecting servers',
            type: ActivityType.Watching
        }],
        status: 'online'
    }
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.snipes = new Map();
client.editSnipes = new Map();
client.aliases = new Collection();

function loadCommands() {
    const categories = ['moderation', 'server', 'utility', 'fun', 'developer', 'economy'];
    let totalCommands = 0;

    for (const category of categories) {
        const commandsPath = path.join(__dirname, 'commands', category);
        if (!fs.existsSync(commandsPath)) continue;

        const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            try {
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    if (command.aliases) {
                        for (const alias of command.aliases) {
                            client.aliases.set(alias, command.data.name);
                        }
                    }
                    totalCommands++;
                    logger.success(`Loaded command: ${command.data.name}`);
                } else {
                    logger.warn(`Command at ${filePath} is missing required properties`);
                }
            } catch (error) {
                logger.error(`Error loading command ${file}: ${error.message}`);
            }
        }
    }

    logger.info(`Loaded ${totalCommands} commands across ${categories.length} categories`);
}

function loadEvents() {
    const eventsPath = path.join(__dirname, 'events');
    if (!fs.existsSync(eventsPath)) return;

    const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const eventModule = require(filePath);
            const events = Array.isArray(eventModule) ? eventModule : [eventModule];
            for (const event of events) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args));
                } else {
                    client.on(event.name, (...args) => event.execute(...args));
                }
                logger.success(`Loaded event: ${event.name}`);
            }
        } catch (error) {
            logger.error(`Error loading event ${file}: ${error.message}`);
        }
    }
}

client.on(Events.ClientReady, async () => {
    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);

    initDatabase();

    for (const [, guild] of client.guilds.cache) {
        if (isServerBlacklisted(guild.id)) {
            logger.warn(`Leaving blacklisted server: ${guild.name} (${guild.id})`);
            await guild.leave().catch(() => {});
        }
    }

    try {
        const rest = client.rest;
        logger.info('Registering slash commands...');
    } catch (error) {
        logger.error(`Failed to register commands: ${error.message}`);
    }
});

client.on(Events.GuildCreate, async (guild) => {
    if (isServerBlacklisted(guild.id)) {
        logger.warn(`Leaving blacklisted server: ${guild.name} (${guild.id})`);
        await guild.leave().catch(() => {});
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (isBlacklisted(message.author.id)) return;
    if (isServerBlacklisted(message.guild.id)) return;

    const config = getGuildConfig(message.guild.id);
    const prefix = config.prefix || ',';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    if (!command) return;

    if (isCommandDisabled(command.data.name, message.guild.id)) {
        return message.reply({
            embeds: [{
                color: 0xff6b6b,
                description: `The command \`${command.data.name}\` is disabled.`
            }]
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    if (isPremiumCommand(command.data.name) && !isPremium(message.author.id) && !isDeveloper(message.author.id)) {
        return message.reply({
            embeds: [{
                color: 0xffd700,
                description: `The command \`${command.data.name}\` is **premium only**. Purchase premium to access it.`
            }]
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
    }

    const dev = isDeveloper(message.author.id);

    if (!dev) {
        const { cooldowns } = client;
        if (!cooldowns.has(command.data.name)) {
            cooldowns.set(command.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(command.data.name);
        const cooldownAmount = (command.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return message.reply({
                    embeds: [{
                        color: 0xff6b6b,
                        description: `Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.data.name}\`.`
                    }]
                }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 5000));
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
    }

    try {
        await command.execute(message, args, client, config);
        logger.command(`${message.author.tag} used ${prefix}${command.data.name} in ${message.guild.name}`);
    } catch (error) {
        logger.error(`Error executing ${command.data.name}: ${error.message}`);
        await message.reply({
            embeds: [{
                color: 0xff4757,
                description: 'An error occurred while executing this command.'
            }]
        }).catch(() => {});
    }
});

client.on(Events.MessageDelete, (message) => {
    if (message.author?.bot || !message.guild) return;
    client.snipes.set(message.channel.id, {
        content: message.content,
        author: message.author,
        image: message.attachments.first()?.url || null,
        timestamp: Date.now()
    });
});

client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    if (oldMessage.author?.bot || !oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return;
    client.editSnipes.set(oldMessage.channel.id, {
        oldContent: oldMessage.content,
        newContent: newMessage.content,
        author: oldMessage.author,
        timestamp: Date.now()
    });
});

process.on('unhandledRejection', (error) => {
    logger.error(`Unhandled rejection: ${error.message}`);
});

process.on('SIGINT', () => {
    logger.info('Shutting down...');
    closeDatabase();
    client.destroy();
    process.exit(0);
});

loadCommands();
loadEvents();

const token = process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('DISCORD_TOKEN is not set in environment variables');
    process.exit(1);
}

client.login(token);
