const util = require('util');
const devkit = require('../../utils/devkit');
const { isDeveloper } = require('../../utils/developer');
const { permissionDenied } = require('../../utils/embeds');
const { warn, paginate } = require('../../utils/context');

const made = {};
function spec(name) {
    if (!made[name]) made[name] = devkit.make(name);
    return made[name];
}

function delegate(name) {
    return async (message, args, client) => {
        if (!isDeveloper(message.author.id)) {
            return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
        }
        return spec(name).execute(message, args, client);
    };
}

function delegateSub(name, sub) {
    return async (message, args, client) => {
        if (!isDeveloper(message.author.id)) {
            return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
        }
        const cmd = spec(name);
        const handler = cmd.subs && cmd.subs[sub];
        if (!handler) return warn(message, `jishaku: unknown subcommand`);
        return handler.execute(message, args, client);
    };
}

function sub(data, aliases, exec) {
    return { aliases: aliases || [], data, execute: exec };
}

function astDump(code) {
    const lines = ['Program'];
    const re = /(async\s+function\s+\w+|function\s+\w+|class\s+\w+|(?:const|let|var)\s+\w+|if\s*\(|for\s*\(|while\s*\(|return\b|=>)/g;
    let match;
    let indent = 1;
    const seen = [];
    while ((match = re.exec(code))) {
        const token = match[0].replace(/\s*\(.*$/, '').trim();
        seen.push(`  '.repeat(0)`);
        lines.push('  '.repeat(indent) + token);
        if (seen.length > 60) {
            lines.push('  '.repeat(indent) + '...');
            break;
        }
    }
    if (lines.length === 1) lines.push('  (no recognisable constructs)');
    return lines.filter(l => !l.includes("'.repeat(0)")).join('\n');
}

const SQL_SUBS = {
    select: sub({ name: 'jishaku sql select', description: "Shortcut for 'jsk sql fetch select'.", usage: ',jishaku sql select <query>' }, [], delegateSub('sql', 'select')),
    fetch: sub({ name: 'jishaku sql fetch', description: 'Fetch multiple rows from the SQL database.', usage: ',jishaku sql fetch <query>' }, [], delegateSub('sql', 'select')),
    fetchrow: sub({ name: 'jishaku sql fetchrow', description: 'Fetch a single row from the SQL database.', usage: ',jishaku sql fetchrow <query>' }, ['fetchone'], delegateSub('sql', 'fetchrow')),
    execute: sub({ name: 'jishaku sql execute', description: 'Executes a statement against the SQL database.', usage: ',jishaku sql execute <query>' }, [], delegateSub('sql', 'execute')),
    schema: sub({ name: 'jishaku sql schema', description: 'Queries for the current schema and shows located table structures.', usage: ',jishaku sql schema [query]' }, [], delegateSub('sql', 'schema'))
};

const VOICE_SUBS = {
    volume: sub({ name: 'jishaku voice volume', description: 'Adjusts the volume of an audio source if it is supported.', usage: ',jishaku voice volume <percentage>' }, [], delegateSub('voice', 'volume')),
    disconnect: sub({ name: 'jishaku voice disconnect', description: 'Disconnects from the voice channel in this guild, if there is one.', usage: ',jishaku voice disconnect' }, ['dc'], delegateSub('voice', 'disconnect')),
    stop: sub({ name: 'jishaku voice stop', description: 'Stops running an audio source, if there is one.', usage: ',jishaku voice stop' }, [], delegateSub('voice', 'stop')),
    pause: sub({ name: 'jishaku voice pause', description: 'Pauses a running audio source, if there is one.', usage: ',jishaku voice pause' }, [], delegateSub('voice', 'pause')),
    play: sub({ name: 'jishaku voice play', description: 'Plays audio direct from a URI.\n\nCan be either a local file or an audio resource on the internet.', usage: ',jishaku voice play <uri>' }, ['play_local'], delegateSub('voice', 'play')),
    resume: sub({ name: 'jishaku voice resume', description: 'Resumes a running audio source, if there is one.', usage: ',jishaku voice resume' }, [], delegateSub('voice', 'resume')),
    join: sub({ name: 'jishaku voice join', description: "Joins a voice channel, or moves to it if already connected.\n\nPassing a voice channel uses that voice channel.\nPassing a member will use that member's current voice channel.\nPassing nothing will use the author's voice channel.", usage: ',jishaku voice join [destination]' }, ['connect'], delegateSub('voice', 'join')),
    youtube_dl: sub({ name: 'jishaku voice youtube_dl', description: 'Plays audio from youtube_dl-compatible sources.', usage: ',jishaku voice youtube_dl <url>' }, ['youtubedl', 'ytdl', 'yt'], delegateSub('voice', 'play'))
};

const SQL_PARENT = sub(
    { name: 'jishaku sql', description: 'Parent for SQL adapter related commands', usage: ',jishaku sql <select|fetch|fetchrow|execute|schema>' },
    [],
    delegate('sql')
);
SQL_PARENT.subcommands = Object.keys(SQL_SUBS);
SQL_PARENT.subUsages = {};
SQL_PARENT.subs = SQL_SUBS;

const VOICE_PARENT = sub(
    { name: 'jishaku voice', description: 'Voice-related commands.\n\nIf invoked without subcommand, relays current voice state.', usage: ',jishaku voice [subcommand]' },
    ['vc'],
    delegate('voice')
);
VOICE_PARENT.subcommands = Object.keys(VOICE_SUBS);
VOICE_PARENT.subUsages = {};
VOICE_PARENT.subs = VOICE_SUBS;

module.exports = {
    data: {
        name: 'jishaku',
        description: 'The Jishaku debug and diagnostic commands.\n\nThis command on its own gives a status brief.\nAll other functionality is within its subcommands.',
        usage: ',jishaku'
    },
    aliases: ['jsk'],
    cooldown: 0,
    subcommands: [
        'node', 'shutdown', 'override', 'sync', 'debug', 'rtt', 'shell', 'source', 'retain', 'cat',
        'py', 'curl', 'sql', 'py_inspect', 'permtrace', 'dis', 'show', 'ast', 'hide', 'specialist',
        'tasks', 'repeat', 'voice', 'cancel', 'invite', 'git', 'load', 'pip', 'unload'
    ],
    subUsages: {
        node: ',jishaku node <argument>',
        shutdown: ',jishaku shutdown',
        override: ',jishaku override <overrides> <command>',
        sync: ',jishaku sync [targets]',
        debug: ',jishaku debug <command>',
        rtt: ',jishaku rtt',
        shell: ',jishaku shell <argument>',
        source: ',jishaku source <command>',
        retain: ',jishaku retain [toggle]',
        cat: ',jishaku cat <file>',
        py: ',jishaku py <code>',
        curl: ',jishaku curl <url>',
        sql: ',jishaku sql <select|fetch|fetchrow|execute|schema>',
        py_inspect: ',jishaku py_inspect <code>',
        permtrace: ',jishaku permtrace <channel> <targets>',
        dis: ',jishaku dis <code>',
        show: ',jishaku show',
        ast: ',jishaku ast <code>',
        hide: ',jishaku hide',
        specialist: ',jishaku specialist <code>',
        tasks: ',jishaku tasks',
        repeat: ',jishaku repeat <times> <command>',
        voice: ',jishaku voice [subcommand]',
        cancel: ',jishaku cancel <index>',
        invite: ',jishaku invite [perms]',
        git: ',jishaku git <argument>',
        load: ',jishaku load <extensions>',
        pip: ',jishaku pip <argument>',
        unload: ',jishaku unload <extensions>'
    },

    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) {
            return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });
        }
        return spec('status').execute(message, args, client);
    },

    subs: {
        node: sub({ name: 'jishaku node', description: "Shortcut for scaffolding and executing 'npm run'. Only exists if the executables are detected.", usage: ',jishaku node <argument>' }, [], delegate('node')),
        shutdown: sub({ name: 'jishaku shutdown', description: 'Logs this bot out.', usage: ',jishaku shutdown' }, ['logout'], delegate('shutdown')),
        override: sub({ name: 'jishaku override', description: "Run a command with a different user, channel, or thread, optionally bypassing checks and cooldowns.\n\nUsers will try to resolve to a Member, but will use a User if it can't find one.", usage: ',jishaku override <overrides> <command>' }, ['execute', 'exec', 'override!', 'execute!', 'exec!'], delegate('override')),
        sync: sub({ name: 'jishaku sync', description: 'Sync global or guild application commands to Discord.', usage: ',jishaku sync [targets]' }, [], delegate('sync')),
        debug: sub({ name: 'jishaku debug', description: 'Run a command timing execution and catching exceptions.', usage: ',jishaku debug <command>' }, ['dbg'], delegate('debug')),
        rtt: sub({ name: 'jishaku rtt', description: 'Calculates Round-Trip Time to the API.', usage: ',jishaku rtt' }, ['ping'], delegate('rtt')),
        shell: sub({ name: 'jishaku shell', description: "Executes statements in the system shell.\n\nThis uses the system shell as defined in $SHELL, or `/bin/bash` otherwise.\nExecution can be cancelled by closing the paginator.", usage: ',jishaku shell <argument>' }, ['bash', 'sh', 'powershell', 'ps1', 'ps', 'cmd', 'terminal'], delegate('shell')),
        source: sub({ name: 'jishaku source', description: 'Displays the source code for a command.', usage: ',jishaku source <command>' }, ['src'], delegate('source')),
        retain: sub({ name: 'jishaku retain', description: 'Turn variable retention for REPL on or off.\n\nProvide no argument for current status.', usage: ',jishaku retain [toggle]' }, [], delegate('retain')),
        cat: sub({ name: 'jishaku cat', description: "Read out a file, using syntax highlighting if detected.\n\nLines and linespans are supported by adding '#L12' or '#L12-14' etc to the end of the filename.", usage: ',jishaku cat <file>' }, [], delegate('cat')),
        py: sub({ name: 'jishaku py', description: 'Direct evaluation of Python code.', usage: ',jishaku py <code>' }, ['python'], delegate('py')),
        curl: sub({ name: 'jishaku curl', description: "Download and display a text file from the internet.\n\nThis command is similar to jsk cat, but accepts a URL.", usage: ',jishaku curl <url>' }, [], delegate('curl')),
        sql: SQL_PARENT,
        py_inspect: sub({ name: 'jishaku py_inspect', description: 'Evaluation of Python code with inspect information.', usage: ',jishaku py_inspect <code>' }, ['pyi', 'python_inspect', 'pythoninspect'], delegate('py_inspect')),
        permtrace: sub({ name: 'jishaku permtrace', description: "Calculates the source of granted or rejected permissions.\n\nThis accepts a channel, and either a member or a list of roles.\nIt calculates permissions the same way Discord does, while keeping track of the source.", usage: ',jishaku permtrace <channel> <targets>' }, [], delegate('permtrace')),
        dis: sub({ name: 'jishaku dis', description: 'Disassemble Python code into bytecode.', usage: ',jishaku dis <code>' }, ['disassemble'], delegate('dis')),
        show: sub({ name: 'jishaku show', description: 'Shows Jishaku in the help command.', usage: ',jishaku show' }, [], delegate('show')),
        ast: sub({ name: 'jishaku ast', description: 'Disassemble Python code into AST.', usage: ',jishaku ast <code>' }, [], async (message, args) => {
            const code = args.join(' ');
            if (!code) return warn(message, 'Usage: `jishaku ast <code>`');
            return message.reply({ content: `\`\`\`js\n${astDump(code)}\n\`\`\`` });
        }),
        hide: sub({ name: 'jishaku hide', description: 'Hides Jishaku from the help command.', usage: ',jishaku hide' }, [], delegate('hide')),
        specialist: sub({ name: 'jishaku specialist', description: 'Direct evaluation of Python code.', usage: ',jishaku specialist <code>' }, [], delegate('specialist')),
        tasks: sub({ name: 'jishaku tasks', description: 'Shows the currently running jishaku tasks.', usage: ',jishaku tasks' }, [], delegate('tasks')),
        repeat: sub({ name: 'jishaku repeat', description: "Runs a command multiple times in a row.\n\nThis acts like the command was invoked several times manually, so it obeys cooldowns.\nYou can use this in conjunction with `jsk sudo` to bypass this.", usage: ',jishaku repeat <times> <command>' }, [], delegate('repeat')),
        voice: VOICE_PARENT,
        cancel: sub({ name: 'jishaku cancel', description: "Cancels a task with the given index.\n\nIf the index passed is -1, will cancel the last task instead.", usage: ',jishaku cancel <index>' }, [], delegate('cancel')),
        invite: sub({ name: 'jishaku invite', description: "Retrieve the invite URL for this bot.\n\nIf the names of permissions are provided, they are requested as part of the invite.", usage: ',jishaku invite [perms]' }, [], delegate('invite')),
        git: sub({ name: 'jishaku git', description: "Shortcut for 'jsk sh git'. Invokes the system shell.", usage: ',jishaku git <argument>' }, [], delegate('git')),
        load: sub({ name: 'jishaku load', description: "Loads or reloads the given extension names.\n\nReports any extensions that failed to load.", usage: ',jishaku load <extensions>' }, ['reload'], delegate('load')),
        pip: sub({ name: 'jishaku pip', description: "Shortcut for 'jsk sh pip'. Invokes the system shell.", usage: ',jishaku pip <argument>' }, [], delegate('pip')),
        unload: sub({ name: 'jishaku unload', description: "Unloads the given extension names.\n\nReports any extensions that failed to unload.", usage: ',jishaku unload <extensions>' }, [], delegate('unload'))
    }
};
