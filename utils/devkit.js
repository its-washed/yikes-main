
const fs = require('fs');
const path = require('path');
const util = require('util');
const { exec, spawn } = require('child_process');
const { PermissionsBitField, Routes } = require('discord.js');

const { isDeveloper } = require('./developer');
const { permissionDenied, errorEmbed } = require('./embeds');
const { query, first, run, closeDatabase } = require('./database');

const ROOT = path.join(__dirname, '..');

const OWN = Symbol('devkit: command already replied');

function loadState() {
    const state = {};
    for (const row of query('SELECT name, value FROM devkit_state')) {
        try {
            state[row.name] = JSON.parse(row.value);
        } catch (err) {
            state[row.name] = null;
        }
    }
    return state;
}

function saveState(patch) {
    const state = { ...loadState(), ...patch };
    for (const key of Object.keys(patch)) {
        const value = patch[key] === undefined ? null : patch[key];
        run('INSERT OR REPLACE INTO devkit_state (name, value) VALUES (?, ?)', key, JSON.stringify(value));
    }
    return state;
}

function isHidden() {
    return Boolean(loadState().hidden);
}

function setHidden(hidden) {
    saveState({ hidden: Boolean(hidden) });
    return hidden;
}

const tasks = new Map();
let taskSeq = 1;

function track(label, handle) {
    const id = taskSeq++;
    tasks.set(id, { label, handle });
    return id;
}

function untrack(id) {
    const task = tasks.get(id);
    if (!task) return false;
    if (task.handle && typeof task.handle.clearInterval === 'function') task.handle.clearInterval();
    if (task.handle && typeof task.handle.kill === 'function') task.handle.kill();
    tasks.delete(id);
    return true;
}

function sanitize(text) {
    return String(text).replace(/```/g, "'\"'").replace(/\u0000/g, '');
}

function sendOutput(message, text) {
    let content = sanitize(text);
    if (content.length > 1800) content = content.slice(0, 1800) + `\n… truncated, ${text.length} chars total`;
    if (!content.length) content = '(empty)';
    return message.reply({ content: `\`\`\`\n${content}\n\`\`\`` });
}

async function gate(message) {
    if (isDeveloper(message.author.id)) return true;
    await message.reply({ embeds: [permissionDenied(message, 'bot_developer')] }).catch(() => {});
    return false;
}

async function wrap(spec, message, args, client) {
    if (!(await gate(message))) return;
    let result;
    try {
        result = await spec.run(message, args, client);
    } catch (err) {
        return message.reply({
            embeds: [errorEmbed('Devkit', `${err.name || 'Error'}: ${err.message}`)]
        }).catch(() => {});
    }
    if (result === OWN || result === undefined || result === null) return;
    if (typeof result === 'object') return message.reply(result);
    return sendOutput(message, result);
}

function runShell(command, { timeout = 20000 } = {}) {
    return new Promise(resolve => {
        exec(command, { cwd: ROOT, timeout, maxBuffer: 4 * 1024 * 1024, windowsHide: true }, (err, stdout, stderr) => {
            const out = [stdout, stderr].filter(Boolean).join('\n').trim();
            resolve({ code: err && typeof err.code === 'number' ? err.code : 0, out: out || (err ? String(err.message) : '') });
        });
    });
}

const RETAINED = {};

function evalNamespace(message, client, rich) {
    const retained = loadState().retain ? RETAINED : {};
    const ns = {
        client,
        message,
        guild: message.guild,
        channel: message.channel,
        author: message.author,
        db: { query, first, run },
        devkit: { retained },
        $: retained,
        require,
        process,
        console
    };
    if (rich) {
        Object.assign(ns, {
            discord: require('discord.js'),
            fs,
            path,
            util,
            config: require('./config'),
            styles: require('./styles'),
            embeds: require('./embeds'),
            helpers: require('./helpers'),
            database: require('./database'),
            context: require('./context'),
            moderation: require('./moderation'),
            developer: require('./developer'),
            premium: require('./premium'),
            variables: require('./variables')
        });
    }
    return ns;
}

async function evaluate(code, ns) {
    const keys = Object.keys(ns);
    const values = keys.map(k => ns[k]);
    const trimmed = code.trim();
    const statement = /\b(const|let|var|function|if|for|while|switch|class|throw|return)\b/.test(trimmed) || trimmed.includes('\n');
    const body = statement ? trimmed : `return (${trimmed})`;
    const fn = new Function(...keys, `"use strict"; return (async () => {\n${body}\n})();`);
    const value = await fn(...values);
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    return util.inspect(value, { depth: 2, maxArrayLength: 50, breakLength: 100 });
}

function walkFiles(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git') continue;
            walkFiles(full, out);
        } else if (entry.name.endsWith('.js')) {
            out.push(full);
        }
    }
    return out;
}

function findCommandFile(name) {
    const wanted = String(name).toLowerCase();
    for (const file of walkFiles(path.join(ROOT, 'commands'))) {
        let cmd;
        try {
            cmd = require(file);
        } catch (err) {
            continue;
        }
        if (!cmd || !cmd.data) continue;
        if (cmd.data.name === wanted || (cmd.aliases || []).includes(wanted)) return file;
    }
    return null;
}

function resolveFile(arg) {
    if (!arg) return null;
    const asCommand = findCommandFile(arg);
    if (asCommand) return asCommand;
    const target = path.resolve(ROOT, arg);
    if (!target.startsWith(ROOT)) return null;
    if (fs.existsSync(target) && fs.statSync(target).isFile()) return target;
    if (fs.existsSync(target + '.js')) return target + '.js';
    return null;
}

function readSpan(text, span) {
    const lines = text.split(/\r?\n/);
    const match = /#L(\d+)(?:-(\d+))?/.exec(span || '');
    if (!match) return lines;
    const start = Math.max(1, parseInt(match[1], 10));
    const end = Math.min(lines.length, parseInt(match[2] || match[1], 10));
    return lines.slice(start - 1, end).map((line, i) => `${String(start + i).padStart(4)} | ${line}`);
}

const voice = new Map();
let voiceIdleTimer = null;

async function buildStream(url, volume) {
    const ytdl = require('@distube/ytdl-core');
    const ffmpegStatic = require('ffmpeg-static');
    const { Readable } = require('stream');
    const { StreamType } = require('@discordjs/voice');

    let source;
    let inputType;
    if (ytdl.validateURL(url)) {
        source = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
        inputType = volume < 100 ? StreamType.OggOpus : StreamType.WebmOpus;
    } else {
        const res = await fetch(url, { headers: { 'user-agent': 'washeds-devkit/1.0' } });
        if (!res.ok) throw new Error(`upstream responded ${res.status}`);
        source = Readable.fromWeb(res.body);
        inputType = StreamType.Arbitrary;
    }

    if (volume < 100 && ffmpegStatic) {
        const ff = spawn(ffmpegStatic, ['-i', 'pipe:0', '-af', `volume=${(volume / 100).toFixed(2)}`, '-f', 'ogg', '-ac', '2', '-ar', '48000', 'pipe:1']);
        source.pipe(ff.stdin);
        ff.stderr.on('data', () => {});
        return { stream: ff.stdout, inputType: StreamType.OggOpus };
    }
    return { stream: source, inputType };
}

const COMMANDS = {
    status: {
        description: 'Show devkit status and bot vitals',
        usage: ',washeds_status',
        run: async (message, args, client) => {
            const mem = process.memoryUsage().heapUsed / 1024 / 1024;
            const uptime = Math.floor(process.uptime());
            return [
                `bot        ${client.user ? client.user.tag : 'starting'} (shard ${client.shard ? client.shard.ids.join(',') : 0})`,
                `guilds     ${client.guilds.cache.size}`,
                `users      ${client.users.cache.size}`,
                `commands   ${client.commands.size} loaded`,
                `ws ping    ${client.ws.ping}ms`,
                `rest ping  ${client.rest ? client.rest.latency : 'n/a'}ms`,
                `heap       ${mem.toFixed(1)} MB`,
                `uptime     ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
                `tasks      ${tasks.size} tracked, ${process.getActiveResourcesInfo().length} active resources`,
                `help       ${isHidden() ? 'washeds_* hidden from ,help' : 'washeds_* visible in ,help'}`
            ].join('\n');
        }
    },

    shell: {
        description: 'Execute a shell command in the project directory',
        usage: ',washeds_shell <command>',
        aliases: ['sh'],
        run: async (message, args) => {
            if (!args.length) return 'usage: washeds_shell <command>';
            const { code, out } = await runShell(args.join(' '));
            return `${out}\n[exit ${code}]`;
        }
    },

    node: {
        description: "Run an npm script (jishaku's node shortcut)",
        usage: ',washeds_node <script>',
        run: async (message, args) => {
            if (!args.length) {
                const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
                return 'scripts:\n' + Object.entries(pkg.scripts || {}).map(([k, v]) => `  ${k.padEnd(16)}${v}`).join('\n');
            }
            const { code, out } = await runShell(`npm run ${args[0]}`, { timeout: 60000 });
            return `${out}\n[exit ${code}]`;
        }
    },

    pip: {
        description: 'Install npm packages',
        usage: ',washeds_pip [package...]',
        run: async (message, args) => {
            const cmd = args.length ? `npm install --no-audit --no-fund ${args.join(' ')}` : 'npm install --no-audit --no-fund';
            const { code, out } = await runShell(cmd, { timeout: 120000 });
            return `${out}\n[exit ${code}]`;
        }
    },

    git: {
        description: 'Run git in the project directory',
        usage: ',washeds_git <args>',
        run: async (message, args) => {
            if (!args.length) return 'usage: washeds_git <args>';
            const { code, out } = await runShell(`git ${args.join(' ')}`);
            return `${out}\n[exit ${code}]`;
        }
    },

    py: {
        description: 'Evaluate JavaScript (state persists in $ when retained)',
        usage: ',washeds_py <code>',
        aliases: ['js', 'eval'],
        run: async (message, args, client) => {
            if (!args.length) return 'usage: washeds_py <code>';
            return evaluate(args.join(' '), evalNamespace(message, client, false));
        }
    },

    specialist: {
        description: 'Evaluate JavaScript with the full bot namespace injected',
        usage: ',washeds_specialist <code>',
        run: async (message, args, client) => {
            if (!args.length) return 'usage: washeds_specialist <code>';
            return evaluate(args.join(' '), evalNamespace(message, client, true));
        }
    },

    py_inspect: {
        description: 'Inspect a command module or utility module',
        usage: ',washeds_py_inspect <command|module>',
        aliases: ['inspect'],
        run: async (message, args, client) => {
            const target = args[0];
            if (!target) return 'usage: washeds_py_inspect <command|module>';
            const cmd = client.commands.get(target) || client.commands.find(c => (c.aliases || []).includes(target));
            if (cmd) {
                return [
                    `command  ${cmd.data.name}`,
                    `file     ${cmd.file || findCommandFile(cmd.data.name) || 'unknown'}`,
                    `category ${cmd.category || 'unknown'}`,
                    `aliases  ${(cmd.aliases || []).join(', ') || '-'}`,
                    `cooldown ${cmd.cooldown ?? '-'}`,
                    `subs     ${cmd.subcommands ? cmd.subcommands.join(', ') : '-'}`,
                    `exports  ${Object.keys(cmd).join(', ')}`
                ].join('\n');
            }
            const file = resolveFile(target) || resolveFile(`utils/${target}`);
            if (!file) return `nothing matched '${target}'`;
            const mod = require(file);
            const keys = Object.keys(mod);
            return `module   ${path.relative(ROOT, file)}\nexports  ${keys.join(', ')}` +
                (keys.length ? '\n' + keys.map(k => {
                    const v = mod[k];
                    return `  ${k}: ${typeof v}${typeof v === 'function' ? `(${v.length} args)` : ''}`;
                }).join('\n') : '');
        }
    },

    source: {
        description: 'Show the source of a command or file',
        usage: ',washeds_source <command|file>',
        aliases: ['src'],
        run: async (message, args, client) => {
            const target = args[0];
            if (!target) return 'usage: washeds_source <command|file>';
            const cmd = client.commands.get(target) || client.commands.find(c => (c.aliases || []).includes(target));
            const file = cmd ? (findCommandFile(cmd.data.name) || resolveFile(target)) : resolveFile(target);
            if (!file) return `nothing matched '${target}'`;
            return readSpan(fs.readFileSync(file, 'utf8'), args[1]).join('\n');
        }
    },

    dis: {
        description: 'Disassemble a command registration (structure dump)',
        usage: ',washeds_dis <command>',
        aliases: ['ast'],
        run: async (message, args, client) => {
            const target = args[0];
            if (!target) return 'usage: washeds_dis <command>';
            const cmd = client.commands.get(target) || client.commands.find(c => (c.aliases || []).includes(target));
            if (!cmd) return `no command '${target}'`;
            const dump = { data: cmd.data, aliases: cmd.aliases || [], cooldown: cmd.cooldown, category: cmd.category };
            if (cmd.subs) {
                dump.subs = {};
                for (const [name, sub] of Object.entries(cmd.subs)) {
                    dump.subs[name] = { data: sub.data, aliases: sub.aliases || [] };
                }
            }
            return util.inspect(dump, { depth: 4, breakLength: 100 });
        }
    },

    cat: {
        description: 'Read a file (supports #L10-20 spans)',
        usage: ',washeds_cat <file>[#L10-20]',
        run: async (message, args) => {
            const target = args[0];
            if (!target) return 'usage: washeds_cat <file>[#L10-20]';
            const hash = target.indexOf('#');
            const file = resolveFile(hash === -1 ? target : target.slice(0, hash));
            if (!file) return `no such file: ${target}`;
            const span = hash === -1 ? args[1] : target.slice(hash);
            return readSpan(fs.readFileSync(file, 'utf8'), span).join('\n');
        }
    },

    curl: {
        description: 'Fetch a URL and print the response',
        usage: ',washeds_curl <url>',
        run: async (message, args) => {
            const url = args[0];
            if (!url || !/^https?:\/\//.test(url)) return 'usage: washeds_curl <url>';
            const started = Date.now();
            const res = await fetch(url, { headers: { 'user-agent': 'washeds-devkit/1.0' } });
            const body = await res.text();
            const head = [
                `< HTTP ${res.status} ${res.statusText}`,
                `< content-type: ${res.headers.get('content-type') || '-'}`,
                `< time: ${Date.now() - started}ms`,
                `< size: ${body.length} bytes`,
                ''
            ].join('\n');
            return head + body;
        }
    },

    sql: {
        description: 'Run SQL against the bot database',
        usage: ',washeds_sql <select|fetch|fetchrow|execute|schema> <sql>',
        run: async () => [
            'washeds_sql select   <sql>   rows as json',
            'washeds_sql fetch    <sql>   alias of select',
            'washeds_sql fetchrow <sql>   first row',
            'washeds_sql execute  <sql>   run a statement',
            'washeds_sql schema   [like]  sqlite_master'
        ].join('\n'),
        subs: {
            select: {
                aliases: ['fetch'],
                description: 'Run a SELECT and print every row',
                usage: ',washeds_sql select <sql>',
                run: async (message, args) => {
                    if (!args.length) return 'usage: washeds_sql select <sql>';
                    const rows = query(args.join(' '));
                    if (!rows.length) return '(no rows)';
                    return util.inspect(rows, { depth: 3, maxArrayLength: 100, breakLength: 120 });
                }
            },
            fetchrow: {
                aliases: ['one'],
                description: 'Run a SELECT and print the first row',
                usage: ',washeds_sql fetchrow <sql>',
                run: async (message, args) => {
                    if (!args.length) return 'usage: washeds_sql fetchrow <sql>';
                    const row = first(args.join(' '));
                    return row ? util.inspect(row, { depth: 3, breakLength: 120 }) : '(no row)';
                }
            },
            execute: {
                aliases: ['run'],
                description: 'Execute a statement',
                usage: ',washeds_sql execute <sql>',
                run: async (message, args) => {
                    if (!args.length) return 'usage: washeds_sql execute <sql>';
                    const result = run(args.join(' '));
                    return `ok — ${result.changes} row(s) changed, lastInsertRowid=${result.lastInsertRowid}`;
                }
            },
            schema: {
                aliases: [],
                description: 'Show tables (optionally filtered)',
                usage: ',washeds_sql schema [like]',
                run: async (message, args) => {
                    const like = args[0] ? ` WHERE name LIKE '%${args[0]}%'` : '';
                    const rows = query(`SELECT name, sql FROM sqlite_master${like} ORDER BY name`);
                    if (!rows.length) return '(no tables)';
                    return rows.map(row => `${row.name}\n    ${(row.sql || '').replace(/\s+/g, ' ').slice(0, 200)}`).join('\n');
                }
            }
        }
    },

    permtrace: {
        description: 'Trace the permissions a member/role has in a channel',
        usage: ',washeds_permtrace <user|role> [channel]',
        run: async (message, args) => {
            const id = String(args[0] || '').replace(/[<@!&>]/g, '');
            if (!/^\d{17,20}$/.test(id)) return 'usage: washeds_permtrace <user|role> [channel]';
            const channelMention = String(args[1] || '').replace(/[<#>]/g, '');
            const channel = /^\d{17,20}$/.test(channelMention)
                ? message.guild.channels.cache.get(channelMention)
                : message.channel;

            const lines = [];
            const member = message.guild.members.cache.get(id) || await message.guild.members.fetch(id).catch(() => null);
            if (member) {
                const perms = channel.permissionsFor(member);
                lines.push(`member ${member} in #${channel.name}`);
                lines.push(`granted: ${perms.toArray().join(', ') || 'none'}`);
                const rolePerms = new PermissionsBitField(member.roles.cache.reduce((acc, role) => acc | BigInt(role.permissions.bitfield), 0n));
                const missing = rolePerms.toArray().filter(p => !perms.toArray().includes(p));
                if (missing.length) lines.push(`revoked here: ${missing.join(', ')}`);
                return lines.join('\n');
            }

            const role = message.guild.roles.cache.get(id);
            if (role) {
                lines.push(`role ${role.name} (${role.id})`);
                lines.push(`raw: ${new PermissionsBitField(role.permissions).toArray().join(', ') || 'none'}`);
                const overwrite = channel.permissionOverwrites && channel.permissionOverwrites.cache.get(role.id);
                if (overwrite) {
                    lines.push(`channel allow: ${new PermissionsBitField(overwrite.allow).toArray().join(', ') || 'none'}`);
                    lines.push(`channel deny:  ${new PermissionsBitField(overwrite.deny).toArray().join(', ') || 'none'}`);
                } else {
                    lines.push('no channel-specific overwrite');
                }
                return lines.join('\n');
            }
            return `no member or role with id ${id}`;
        }
    },

    invite: {
        description: 'Get the bot invite link',
        usage: ',washeds_invite',
        run: async (message, args, client) => {
            return `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        }
    },

    shutdown: {
        description: 'Shut the bot down gracefully',
        usage: ',washeds_shutdown',
        run: async (message, args, client) => {
            await message.reply('Shutting down…').catch(() => {});
            try {
                client.destroy();
            } catch (err) {}
            try {
                closeDatabase();
            } catch (err) {}
            setTimeout(() => process.exit(0), 500);
            return OWN;
        }
    },

    rtt: {
        description: 'Measure REST and gateway round-trip time',
        usage: ',washeds_rtt',
        run: async (message, args, client) => {
            const started = Date.now();
            await client.rest.get(Routes.gateway());
            const rest = Date.now() - started;
            return `rest ${rest}ms\ngateway ${client.ws.ping}ms`;
        }
    },

    debug: {
        description: 'Run a command and report how long it took',
        usage: ',washeds_debug <command> [args...]',
        run: async (message, args, client) => {
            const name = args[0];
            if (!name) return 'usage: washeds_debug <command> [args]';
            const cmd = client.commands.get(name) || client.commands.get(client.aliases.get(name));
            if (!cmd) return `no command '${name}'`;
            const started = Date.now();
            await cmd.execute(message, args.slice(1), client, require('./config').getGuildConfig(message.guild.id));
            return `ran ${cmd.data.name} in ${Date.now() - started}ms`;
        }
    },

    override: {
        description: 'Run a command as another user',
        usage: ',washeds_override <user> <command> [args...]',
        run: async (message, args, client) => {
            const id = String(args[0] || '').replace(/[<@!>]/g, '');
            if (!/^\d{17,20}$/.test(id) || args.length < 2) return 'usage: washeds_override <user> <command> [args]';
            const user = await client.users.fetch(id).catch(() => null);
            if (!user) return `no user ${id}`;
            const member = message.guild.members.cache.get(id) || await message.guild.members.fetch(id).catch(() => null);
            const name = args[1];
            const cmd = client.commands.get(name) || client.commands.get(client.aliases.get(name));
            if (!cmd) return `no command '${name}'`;

            const fake = new Proxy(message, {
                get(target, prop) {
                    if (prop === 'author') return user;
                    if (prop === 'member') return member || target.member;
                    if (prop === 'user') return user;
                    const value = Reflect.get(target, prop);
                    return typeof value === 'function' ? value.bind(target) : value;
                }
            });
            const { getGuildConfig } = require('./config');
            await cmd.execute(fake, args.slice(2), client, getGuildConfig(message.guild.id));
            return OWN;
        }
    },

    repeat: {
        description: 'Run a command N times (cooldowns skipped for developers)',
        usage: ',washeds_repeat <n> <command> [args...]',
        run: async (message, args, client) => {
            const count = parseInt(args[0], 10);
            if (!count || count < 1 || args.length < 2) return 'usage: washeds_repeat <n> <command> [args]';
            const times = Math.min(count, 25);
            const name = args[1];
            const cmd = client.commands.get(name) || client.commands.get(client.aliases.get(name));
            if (!cmd) return `no command '${name}'`;
            const { getGuildConfig } = require('./config');
            const cfg = getGuildConfig(message.guild.id);
            const errors = [];
            for (let i = 0; i < times; i++) {
                try {
                    await cmd.execute(message, args.slice(2), client, cfg);
                } catch (err) {
                    errors.push(`${i + 1}: ${err.message}`);
                }
            }
            return errors.length ? `ran ${times} times with errors:\n${errors.join('\n')}` : `ran ${cmd.data.name} ${times} times`;
        }
    },

    load: {
        description: '(Re)load a command file from disk',
        usage: ',washeds_load <command|file>',
        run: async (message, args, client) => {
            const target = args[0];
            if (!target) return 'usage: washeds_load <command|file>';
            const file = resolveFile(target) || findCommandFile(target);
            if (!file) return `nothing matched '${target}'`;
            delete require.cache[require.resolve(file)];
            let cmd;
            try {
                cmd = require(file);
            } catch (err) {
                return `failed loading ${path.relative(ROOT, file)}: ${err.message}`;
            }
            if (!cmd || !cmd.data || typeof cmd.execute !== 'function') {
                return `${path.relative(ROOT, file)} has no data/execute`;
            }
            cmd.category = path.basename(path.dirname(file));
            client.commands.set(cmd.data.name, cmd);
            for (const alias of cmd.aliases || []) client.aliases.set(alias, cmd.data.name);
            return `loaded ${cmd.data.name} from ${path.relative(ROOT, file)}`;
        }
    },

    unload: {
        description: 'Remove a command until the next restart',
        usage: ',washeds_unload <command>',
        run: async (message, args, client) => {
            const name = args[0];
            if (!name) return 'usage: washeds_unload <command>';
            const cmd = client.commands.get(name) || client.commands.get(client.aliases.get(name));
            if (!cmd) return `no command '${name}'`;
            client.commands.delete(cmd.data.name);
            for (const [alias, target] of [...client.aliases]) {
                if (target === cmd.data.name) client.aliases.delete(alias);
            }
            return `unloaded ${cmd.data.name} ( ,washeds_load ${cmd.data.name} to bring it back )`;
        }
    },

    sync: {
        description: 'Prune registered slash commands that no longer exist',
        usage: ',washeds_sync [guildId]',
        run: async (message, args, client) => {
            const guildId = args[0];
            const route = guildId
                ? Routes.applicationGuildCommands(client.user.id, guildId)
                : Routes.applicationCommands(client.user.id);
            const registered = await client.rest.get(route);
            const known = new Set([...client.commands.keys()]);
            const removed = [];
            const kept = [];
            for (const entry of registered) {
                if (known.has(entry.name)) {
                    kept.push(entry.name);
                    continue;
                }
                const entryRoute = guildId
                    ? Routes.applicationGuildCommand(client.user.id, guildId, entry.id)
                    : Routes.applicationCommand(client.user.id, entry.id);
                await client.rest.delete(entryRoute).catch(() => null);
                removed.push(entry.name);
            }
            return `scope: ${guildId ? `guild ${guildId}` : 'global'}\nkept ${kept.length}, pruned ${removed.length}` +
                (removed.length ? `\nremoved: ${removed.join(', ')}` : '');
        }
    },

    retain: {
        description: 'Toggle the retained eval state ($)',
        usage: ',washeds_retain <on|off>',
        run: async (message, args) => {
            const arg = (args[0] || '').toLowerCase();
            if (arg !== 'on' && arg !== 'off') {
                return `retain is **${loadState().retain ? 'on' : 'off'}** — usage: washeds_retain <on|off>`;
            }
            saveState({ retain: arg === 'on' });
            if (arg === 'off') {
                for (const key of Object.keys(RETAINED)) delete RETAINED[key];
            }
            return `retain ${arg}${arg === 'on' ? ' — persist state in $ between washeds_py calls' : ' — cleared $'}`;
        }
    },

    tasks: {
        description: 'List tracked devkit tasks',
        usage: ',washeds_tasks',
        run: async () => {
            const lines = [`tracked tasks: ${tasks.size}`];
            for (const [id, task] of tasks) lines.push(`  #${id}  ${task.label}`);
            const resources = {};
            for (const r of process.getActiveResourcesInfo()) resources[r] = (resources[r] || 0) + 1;
            lines.push('active resources: ' + Object.entries(resources).map(([k, v]) => `${k}=${v}`).join(' '));
            return lines.join('\n');
        }
    },

    cancel: {
        description: 'Cancel a tracked task',
        usage: ',washeds_cancel <id>',
        run: async (message, args) => {
            const id = parseInt(args[0], 10);
            if (!id) return 'usage: washeds_cancel <task id> (see washeds_tasks)';
            return untrack(id) ? `cancelled task #${id}` : `no task #${id}`;
        }
    },

    show: {
        description: 'Show washeds_* commands in ,help',
        usage: ',washeds_show',
        run: async () => {
            setHidden(false);
            return 'washeds_* commands are visible in ,help';
        }
    },

    hide: {
        description: 'Hide washeds_* commands from ,help',
        usage: ',washeds_hide',
        run: async () => {
            setHidden(true);
            return 'washeds_* commands are hidden from ,help (still runnable)';
        }
    },

    voice: {
        description: 'Minimal voice player',
        usage: ',washeds_voice <join|play|pause|resume|stop|volume|disconnect>',
        run: async (message, args, client) => {
            const state = voice.get(message.guild.id);
            if (!state || !state.connection) return 'not connected — use washeds_voice join';
            const { VoiceConnectionStatus } = require('@discordjs/voice');
            const channel = message.guild.channels.cache.get(state.channelId);
            return [
                `channel  ${channel ? channel.toString() : state.channelId}`,
                `state    ${state.connection.state.status}`,
                `player   ${state.player ? state.player.state.status : 'idle'}`,
                `track    ${state.url || 'none'}`,
                `volume   ${state.volume}%`
            ].join('\n');
        },
        subs: {
            join: {
                aliases: [],
                description: 'Join your voice channel',
                usage: ',washeds_voice join',
                run: async (message) => {
                    const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
                    const channel = message.member && message.member.voice.channel;
                    if (!channel) return 'join a voice channel first';
                    const connection = joinVoiceChannel({
                        channelId: channel.id,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator,
                        selfDeaf: true
                    });
                    try {
                        await entersState(connection, VoiceConnectionStatus.Ready, 15000);
                    } catch (err) {
                        connection.destroy();
                        return `couldn't connect: ${err.message}`;
                    }
                    const state = voice.get(message.guild.id) || {};
                    state.connection = connection;
                    state.channelId = channel.id;
                    state.taskId = track(`voice: connected in guild ${message.guild.id}`, connection);
                    voice.set(message.guild.id, state);
                    return `joined ${channel.toString()}`;
                }
            },
            play: {
                aliases: ['youtube_dl'],
                description: 'Play an audio URL in your voice channel',
                usage: ',washeds_voice play <url>',
                run: async (message, args) => {
                    const { createAudioPlayer, createAudioResource, AudioPlayerStatus, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
                    const url = args[0];
                    if (!url || !/^https?:\/\//.test(url)) return 'usage: washeds_voice play <url>';
                    const state = voice.get(message.guild.id);
                    if (!state || !state.connection) {
                        const joined = await COMMANDS.voice.subs.join.run(message, args);
                        if (typeof joined === 'string' && !joined.startsWith('joined')) return joined;
                    }
                    const guildState = voice.get(message.guild.id);
                    if (!guildState.player) {
                        guildState.player = createAudioPlayer();
                        guildState.connection.subscribe(guildState.player);
                        guildState.player.on('error', err => console.error('voice player error:', err.message));
                    }
                    const volume = guildState.volume || 100;
                    let built;
                    try {
                        built = await buildStream(url, volume);
                    } catch (err) {
                        return `couldn't open stream: ${err.message}`;
                    }
                    const resource = createAudioResource(built.stream, { inputType: built.inputType });
                    guildState.player.play(resource);
                    guildState.url = url;

                    if (voiceIdleTimer) clearTimeout(voiceIdleTimer);
                    guildState.player.once(AudioPlayerStatus.Idle, () => {
                        voiceIdleTimer = setTimeout(() => {
                            const current = voice.get(message.guild.id);
                            if (current && current.player && current.player.state.status === AudioPlayerStatus.Idle) {
                                if (current.taskId) untrack(current.taskId);
                                current.connection.destroy();
                                voice.delete(message.guild.id);
                            }
                        }, 300000);
                    });
                    return `▶ playing ${url}`;
                }
            },
            pause: {
                aliases: [],
                description: 'Pause playback',
                usage: ',washeds_voice pause',
                run: async message => {
                    const state = voice.get(message.guild.id);
                    if (!state || !state.player) return 'nothing is playing';
                    state.player.pause();
                    return 'paused';
                }
            },
            resume: {
                aliases: [],
                description: 'Resume playback',
                usage: ',washeds_voice resume',
                run: async message => {
                    const state = voice.get(message.guild.id);
                    if (!state || !state.player) return 'nothing is playing';
                    state.player.unpause();
                    return 'resumed';
                }
            },
            stop: {
                aliases: [],
                description: 'Stop playback',
                usage: ',washeds_voice stop',
                run: async message => {
                    const state = voice.get(message.guild.id);
                    if (!state || !state.player) return 'nothing is playing';
                    state.player.stop();
                    state.url = null;
                    return 'stopped';
                }
            },
            volume: {
                aliases: [],
                description: 'Set volume 1-100 (restarts the current track)',
                usage: ',washeds_voice volume <1-100>',
                run: async (message, args) => {
                    const value = parseInt(args[0], 10);
                    if (!value || value < 1 || value > 100) return 'usage: washeds_voice volume <1-100>';
                    const state = voice.get(message.guild.id);
                    if (!state) return 'not connected';
                    state.volume = value;
                    if (state.url) return COMMANDS.voice.subs.play.run(message, [state.url]);
                    return `volume set to ${value}%`;
                }
            },
            disconnect: {
                aliases: ['leave'],
                description: 'Leave the voice channel',
                usage: ',washeds_voice disconnect',
                run: async message => {
                    const state = voice.get(message.guild.id);
                    if (!state || !state.connection) return 'not connected';
                    if (state.taskId) untrack(state.taskId);
                    state.connection.destroy();
                    voice.delete(message.guild.id);
                    return 'disconnected';
                }
            }
        }
    }
};

function make(name) {
    const spec = COMMANDS[name];
    if (!spec) throw new Error(`devkit: unknown command '${name}'`);

    const cmd = {
        data: {
            name: `washeds_${name}`,
            description: spec.description,
            usage: spec.usage || `,washeds_${name}`
        },
        aliases: spec.aliases || [],
        cooldown: 0,
        async execute(message, args, client) {
            return wrap(spec, message, args, client);
        }
    };

    if (spec.subs) {
        cmd.subcommands = Object.keys(spec.subs);
        cmd.subUsages = {};
        cmd.subs = {};
        for (const [subName, sub] of Object.entries(spec.subs)) {
            cmd.subUsages[subName] = sub.usage || `washeds_${name} ${subName}`;
            cmd.subs[subName] = {
                aliases: sub.aliases || [],
                data: {
                    name: `washeds_${name} ${subName}`,
                    description: sub.description,
                    usage: sub.usage || `washeds_${name} ${subName}`
                },
                async execute(message, args, client) {
                    return wrap(sub, message, args, client);
                }
            };
        }
    }

    return cmd;
}

module.exports = {
    make,
    isHidden,
    setHidden,
    track,
    untrack,
    runShell,
    evaluate,
    COMMANDS
};
