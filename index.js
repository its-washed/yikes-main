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
    let total = 0;

    for (const cat of categories) {
        const dir = path.join(__dirname, 'commands', cat);
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

        for (const file of files) {
            const fp = path.join(dir, file);
            try {
                const cmd = require(fp);
                if ('data' in cmd && 'execute' in cmd) {
                    client.commands.set(cmd.data.name, cmd);
                    if (cmd.aliases) {
                        for (const alias of cmd.aliases) {
                            client.aliases.set(alias, cmd.data.name);
                        }
                    }
                    total++;
                    logger.success(`Loaded: ${cmd.data.name}`);
                } else {
                    logger.warn(`Skipping ${file} - missing data/execute`);
                }
            } catch (err) {
                logger.error(`Failed loading ${file}: ${err.message}`);
            }
        }
    }

    logger.info(`Loaded ${total} commands from ${categories.length} categories`);
}

function loadEvents() {
    const dir = path.join(__dirname, 'events');
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

    for (const file of files) {
        const fp = path.join(dir, file);
        try {
            const mod = require(fp);
            const evts = Array.isArray(mod) ? mod : [mod];
            for (const evt of evts) {
                if (evt.once) {
                    client.once(evt.name, (...args) => evt.execute(...args));
                } else {
                    client.on(evt.name, (...args) => evt.execute(...args));
                }
                logger.success(`Event: ${evt.name}`);
            }
        } catch (err) {
            logger.error(`Event ${file} broke: ${err.message}`);
        }
    }
}

client.on(Events.ClientReady, async () => {
    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds, ${client.users.cache.size} users`);

    initDatabase();

    for (const [, guild] of client.guilds.cache) {
        if (isServerBlacklisted(guild.id)) {
            logger.warn(`Leaving blacklisted: ${guild.name} (${guild.id})`);
            await guild.leave().catch(() => {});
        }
    }

    try {
        const rest = client.rest;
        logger.info('Registering slash commands...');
    } catch (err) {
        logger.error(`Command registration failed: ${err.message}`);
    }
});

client.on(Events.GuildCreate, async (guild) => {
    if (isServerBlacklisted(guild.id)) {
        logger.warn(`Kicking blacklisted server: ${guild.name}`);
        await guild.leave().catch(() => {});
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (isBlacklisted(message.author.id)) return;
    if (isServerBlacklisted(message.guild.id)) return;
    if (client.maintenanceMode && !isDeveloper(message.author.id)) return;

    const cfg = getGuildConfig(message.guild.id);
    const prefix = cfg.prefix || ',';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
    if (!cmd) {
        const customAliases = cfg.customAliases || [];
        const alias = customAliases.find(a => a.name === cmdName);
        if (!alias) return;
        const resolvedCmd = client.commands.get(alias.command) || client.commands.get(client.aliases.get(alias.command));
        if (!resolvedCmd) return;
        let aliasArgs = alias.args;
        const userArgs = [cmdName, ...args];
        for (let i = 0; i < userArgs.length; i++) {
            aliasArgs = aliasArgs.replace(new RegExp(`\\{${i}\\}`, 'g'), userArgs[i] || '');
        }
        const finalArgs = aliasArgs.trim().split(/ +/).filter(Boolean);
        try {
            await resolvedCmd.execute(message, finalArgs, client, cfg);
            logger.command(`${message.author.tag} > ${prefix}${alias.name} (alias) in ${message.guild.name}`);
        } catch (err) {
            logger.error(`alias ${alias.name} error: ${err.message}`);
        }
        return;
    }

    if (isCommandDisabled(cmd.data.name, message.guild.id)) {
        const msg = await message.reply({
            embeds: [{
                color: 0xff6b6b,
                description: `\`${cmd.data.name}\` is disabled in this server.`
            }]
        });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        return;
    }

    if (isPremiumCommand(cmd.data.name) && !isPremium(message.author.id) && !isDeveloper(message.author.id)) {
        const msg = await message.reply({
            embeds: [{
                color: 0xffd700,
                description: `\`${cmd.data.name}\` is premium only.`
            }]
        });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        return;
    }

    const dev = isDeveloper(message.author.id);
    if (!dev) {
        const { cooldowns } = client;
        if (!cooldowns.has(cmd.data.name)) {
            cooldowns.set(cmd.data.name, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(cmd.data.name);
        const cd = (cmd.cooldown || 3) * 1000;

        if (timestamps.has(message.author.id)) {
            const exp = timestamps.get(message.author.id) + cd;
            if (now < exp) {
                const left = (exp - now) / 1000;
                const msg = await message.reply({
                    embeds: [{
                        color: 0xff6b6b,
                        description: `Slow down! Wait ${left.toFixed(1)}s before using \`${cmd.data.name}\`.`
                    }]
                });
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cd);
    }

    try {
        await cmd.execute(message, args, client, cfg);
        logger.command(`${message.author.tag} > ${prefix}${cmd.data.name} in ${message.guild.name}`);
    } catch (err) {
        logger.error(`cmd ${cmd.data.name} error: ${err.message}`);
        await message.reply({
            embeds: [{
                color: 0xff4757,
                description: 'Something went wrong running that command.'
            }]
        }).catch(() => {});
    }
});

client.on(Events.MessageDelete, (msg) => {
    if (msg.author?.bot || !msg.guild) return;
    client.snipes.set(msg.channel.id, {
        content: msg.content,
        author: msg.author,
        image: msg.attachments.first()?.url || null,
        timestamp: Date.now()
    });
});

client.on(Events.MessageUpdate, (old, msg) => {
    if (old.author?.bot || !old.guild) return;
    if (old.content === msg.content) return;
    client.editSnipes.set(old.channel.id, {
        oldContent: old.content,
        newContent: msg.content,
        author: old.author,
        timestamp: Date.now()
    });
});

process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled: ${err.message}`);
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
    logger.error('No DISCORD_TOKEN found in .env');
    process.exit(1);
}

client.login(token);
