(function ensureDependenciesInstalled() {
    const fs = require('fs');
    const path = require('path');
    const Module = require('module');
    const { spawnSync } = require('child_process');
    const root = __dirname;
    const builtins = new Set(Module.builtinModules);

    let pkg;
    try {
        pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    } catch {
        return;
    }

    const declared = Object.keys(pkg.dependencies || {});
    const pkgName = spec => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
    const isExternal = spec => Boolean(spec) && !spec.startsWith('.') && !spec.startsWith('node:') &&
        !path.isAbsolute(spec) && !spec.endsWith('.json') && !builtins.has(spec.split('/')[0]);

    const walk = dir => {
        const found = [];
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return found; }
        for (const entry of entries) {
            const fp = path.join(dir, entry.name);
            if (entry.isDirectory()) found.push(...walk(fp));
            else if (entry.isFile() && entry.name.endsWith('.js')) found.push(fp);
        }
        return found;
    };

    const sources = ['index.js', 'sharded.js', 'commands', 'events', 'utils']
        .map(name => path.join(root, name))
        .filter(fp => fs.existsSync(fp));

    const needed = new Set(declared);
    const REQUIRE_RE = /require\(\s*["']([^"']+)["']\s*\)/g;
    for (const source of sources) {
        const files = fs.statSync(source).isDirectory() ? walk(source) : [source];
        for (const file of files) {
            let text;
            try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
            let match;
            while ((match = REQUIRE_RE.exec(text)) !== null) {
                if (isExternal(match[1])) needed.add(pkgName(match[1]));
            }
        }
    }
    if (!needed.size) return;

    const isLocal = name => fs.existsSync(path.join(root, 'node_modules', ...name.split('/'), 'package.json'));
    const probe = names => {
        const broken = [];
        for (const name of names) {
            if (!isLocal(name)) {
                broken.push({ name, missing: null, absent: true });
                continue;
            }
            try { require(name); } catch (err) {
                const missing = /Cannot find module '([^']+)'/.exec(err.message);
                broken.push({ name, missing: missing ? missing[1] : null });
            }
        }
        return broken;
    };
    const describe = b => {
        if (b.absent) return `${b.name} (not installed here)`;
        return b.missing && pkgName(b.missing) !== b.name ? `${b.name} (missing ${b.missing})` : b.name;
    };

    let broken = probe([...needed]);
    if (!broken.length) return;

    console.log(`[setup] Missing or broken dependencies: ${broken.map(describe).join(', ')}`);

    const extras = [...new Set(broken.map(b => b.name))].filter(name => !declared.includes(name));
    const result = spawnSync('npm', ['install', '--no-audit', '--no-fund', ...extras], {
        cwd: root,
        stdio: 'inherit',
        shell: process.platform === 'win32'
    });

    if (result.status !== 0) {
        console.error('[setup] npm install failed. Delete node_modules and run `npm install` manually, then start the bot again.');
        process.exit(1);
    }

    broken = probe([...needed]);
    if (broken.length) {
        console.error(`[setup] Still missing or broken after install: ${broken.map(describe).join(', ')}. Delete node_modules and run \`npm install\` manually.`);
        process.exit(1);
    }
})();

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Partials, Events, ActivityType } = require('discord.js');
const { getGuildConfig } = require('./utils/config');
const { resolveSubcommand } = require('./utils/helpers');
const { initDatabase, closeDatabase, run, first } = require('./utils/database');
const { logger } = require('./utils/logger');
const { isBlacklisted, isDeveloper, isServerBlacklisted, isCommandDisabled } = require('./utils/developer');
const { isPremium, isPremiumCommand } = require('./utils/premium');
const { sendCard, extractMetadata, paramList } = require('./utils/helpCard');
const { normalizePayload, wrapReply, ALERT } = require('./utils/embeds');
const { COLORS, EMOJIS } = require('./utils/styles');

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
            name: 'hi uwu',
            type: ActivityType.Watching
        }],
        status: 'idle'
    }
});

client.commands = new Collection();
client.cooldowns = new Collection();
client.snipes = new Map();
client.reactionSnipes = new Map();
client.editSnipes = new Map();
client.aliases = new Collection();

function loadCommands() {
    const root = path.join(__dirname, 'commands');
    const categories = fs.readdirSync(root, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    let total = 0;

    for (const cat of categories) {
        const dir = path.join(root, cat);
        if (!fs.existsSync(dir)) continue;

        const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));

        for (const file of files) {
            const fp = path.join(dir, file);
            try {
                const cmd = require(fp);
                if ('data' in cmd && 'execute' in cmd) {
                    cmd.category = cat;
                    Object.assign(cmd, extractMetadata(fs.readFileSync(fp, 'utf8'), cat, file));
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
            continue;
        }
        const botMember = guild.members.me;
        if (!botMember.permissions.has('Administrator')) {
            logger.warn(`${guild.name} - missing Administrator permission`);
            try {
                const owner = await guild.fetchOwner();
                await owner.send(`Hey! I need **Administrator** permissions in **${guild.name}** to function properly. Please grant me the permission or some commands won't work.`).catch(() => {});
            } catch {}
        }
    }

    try {
        logger.info('Bot ready, slash commands can be deployed via ,deploy');
    } catch (err) {
        logger.error(`Startup check failed: ${err.message}`);
    }
});

client.on(Events.GuildCreate, async (guild) => {
    if (isServerBlacklisted(guild.id)) {
        logger.warn(`Kicking blacklisted server: ${guild.name}`);
        await guild.leave().catch(() => {});
        return;
    }
    const botMember = guild.members.me;
    if (!botMember.permissions.has('Administrator')) {
        logger.warn(`${guild.name} - missing Administrator permission`);
        try {
            const owner = await guild.fetchOwner();
            await owner.send(`Hey! I need **Administrator** permissions in **${guild.name}** to function properly. Please grant me the permission or some commands won't work.`).catch(() => {});
        } catch {}
    }
});

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot || !message.guild) return;
    if (isBlacklisted(message.author.id)) return;
    if (isServerBlacklisted(message.guild.id)) return;
    if (client.maintenanceMode && !isDeveloper(message.author.id)) return;

    const cfg = getGuildConfig(message.guild.id);
    let prefix = cfg.prefix || ',';
    try {
        const selfPrefixRow = first('SELECT prefix FROM selfprefix WHERE user_id = ?', message.author.id);
        if (selfPrefixRow && selfPrefixRow.prefix) prefix = selfPrefixRow.prefix;
    } catch {
    }

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const cmd = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
    if (!cmd) {
        let selfAlias = null;
        try {
            selfAlias = first('SELECT command, args FROM selfaliases WHERE user_id = ? AND alias = ?', message.author.id, cmdName);
        } catch {
        }
        if (selfAlias) {
            const userArgs = [cmdName, ...args];
            const substitute = text => {
                if (!text) return text || '';
                let out = text;
                for (let i = 0; i < userArgs.length; i++) {
                    out = out.replace(new RegExp(`\\{${i}\\}`, 'g'), userArgs[i] || '');
                }
                return out;
            };
            const finalArgs = `${substitute(selfAlias.command)} ${substitute(selfAlias.args)}`.trim().split(/ +/).filter(Boolean);
            const selfCmdName = finalArgs.shift();
            const resolvedSelf = client.commands.get(selfCmdName) || client.commands.get(client.aliases.get(selfCmdName));
            if (resolvedSelf) {
                const unwrapSelf = wrapReply(message);
                try {
                    await resolvedSelf.execute(message, finalArgs, client, cfg);
                    logger.command(`${message.author.tag} > ${prefix}${cmdName} (selfalias) in ${message.guild.name}`);
                } catch (err) {
                    logger.error(`selfalias ${cmdName} error: ${err.message}`);
                } finally {
                    unwrapSelf();
                }
                return;
            }
        }
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
        const unwrapAliasReply = wrapReply(message);
        try {
            await resolvedCmd.execute(message, finalArgs, client, cfg);
            logger.command(`${message.author.tag} > ${prefix}${alias.name} (alias) in ${message.guild.name}`);
        } catch (err) {
            logger.error(`alias ${alias.name} error: ${err.message}`);
        } finally {
            unwrapAliasReply();
        }
        return;
    }

    if (isCommandDisabled(cmd.data.name, message.guild.id, cmd.category)) {
        const msg = await message.reply(normalizePayload({
            embeds: [{
                [ALERT]: true,
                color: COLORS.WARNING,
                description: `${EMOJIS.WARNING} ${message.author}: \`${cmd.data.name}\` is disabled in this server.`
            }]
        }));
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        return;
    }

    if (isPremiumCommand(cmd.data.name) && !isPremium(message.author.id) && !isDeveloper(message.author.id)) {
        const msg = await message.reply({                embeds: [{
                    color: COLORS.WARNING,
                    description: `${EMOJIS.WARNING} ${message.author}: \`${cmd.data.name}\` is premium only.`
                }]
        });
        setTimeout(() => msg.delete().catch(() => {}), 5000);
        return;
    }

    let handler = cmd;
    let rest = args;
    if (cmd.subs && Object.keys(cmd.subs).length > 0) {
        const resolved = resolveSubcommand(cmd, args);
        if (!resolved.handler || typeof resolved.handler.execute !== 'function') {
            const focus = args[0] && cmd.subcommands.includes(args[0]) ? { sub: args[0] } : {};
            await sendCard(message, cmd, focus).catch(err => logger.error(`card ${cmd.data.name} error: ${err.message}`));
            return;
        }
        handler = resolved.handler;
        rest = resolved.rest;
    }

    const focus = args[0] && cmd.subcommands && cmd.subcommands.includes(args[0]) ? { sub: args[0] } : {};
    const handlerUsage = (handler !== cmd && handler.data && handler.data.usage) || cmd.data.usage || '';
    const requiredParams = paramList(handler, handlerUsage, focus.sub || null).filter(p => p.required && p.name !== 'flags');
    if (rest.length < requiredParams.length) {
        await sendCard(message, cmd, focus).catch(err => logger.error(`card ${cmd.data.name} error: ${err.message}`));
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
                        color: COLORS.COOLDOWN,
                        description: `${EMOJIS.COOLDOWN_WARN} ${message.author}: Wait **${left.toFixed(1)}s** before using \`${cmd.data.name}\` again`
                    }]
                });
                setTimeout(() => msg.delete().catch(() => {}), 5000);
                return;
            }
        }

        timestamps.set(message.author.id, now);
        setTimeout(() => timestamps.delete(message.author.id), cd);
    }

    const unwrapReply = wrapReply(message);

    try {
        run('INSERT INTO command_history (command, arguments, server_id, user_id, channel_id, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            handler.data.name, rest.join(' '), message.guild.id, message.author.id, message.channel.id, Date.now() / 1000);
    } catch (err) {
        logger.error(`history ${cmd.data.name} error: ${err.message}`);
    }

    const commandStartedAt = Date.now();
    try {
        await handler.execute(message, rest, client, cfg);
        logger.command(`${message.author.tag} > ${prefix}${cmd.data.name} in ${message.guild.name}`);
    } catch (err) {
        logger.error(`cmd ${cmd.data.name} error: ${err.message}`);
        await message.reply({
            embeds: [{
                color: 0xff3939,
                description: 'Something went wrong running that command.'
            }]
        }).catch(() => {});
    } finally {
        try {
            run('INSERT INTO command_stats (command, user_id, guild_id, channel_id, execution_time, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
                handler.data.name, message.author.id, message.guild.id, message.channel.id,
                Date.now() - commandStartedAt, Date.now() / 1000);
        } catch (err) {}
        unwrapReply();
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
    console.error(err);
});

process.on('SIGINT', () => {
    logger.info('Shutting down...');
    closeDatabase();
    client.destroy();
    process.exit(0);
});

initDatabase();
loadCommands();
loadEvents();

const token = process.env.DISCORD_TOKEN;
if (!token) {
    logger.error('No DISCORD_TOKEN found in .env');
    process.exit(1);
}

client.on('error', console.error);
client.on('shardError', console.error);

client.login(token).catch(console.error);