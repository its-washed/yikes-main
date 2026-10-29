const { PermissionFlagsBits } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { prefix } = require('../../utils/moderation');
const { modalPrompt } = require('../../utils/modal');
const { sendCard } = require('../../utils/helpCard');
const { createEmbed } = require('../../utils/embeds');

const DOMAIN = 'https://storagevault.cloud';

async function verifyKey(domain, key) {
    const attempts = [
        { authorization: key },
        { authorization: `Bearer ${key}` },
        { 'x-api-key': key }
    ];
    for (const headers of attempts) {
        try {
            const res = await fetch(`${domain}/api/user`, { headers });
            if (res.ok) return true;
        } catch (err) {
        }
    }
    return false;
}

function needLogin(message) {
    const row = first('SELECT "key", value FROM storagevault WHERE user_id = ?', message.author.id);
    if (!row) {
        warn(message, 'You are not logged in!');
        return null;
    }
    return { key: row.key, domain: row.value || DOMAIN };
}

module.exports = {
    data: { name: 'storagevault', description: 'Manage your Storagevault account', usage: ',storagevault <login|logout|upload|users>' },
    aliases: ['sv'],
    cooldown: 5,
    subcommands: ['login', 'logout', 'upload', 'users'],
    subUsages: {
        login: ',storagevault login',
        logout: ',storagevault logout',
        upload: ',storagevault upload',
        users: ',storagevault users'
    },
    execute: async (message, args, client) => {
        return sendCard(message, module.exports);
    },
    subs: {
        login: {
            aliases: [],
            data: { name: 'storagevault login', description: 'Login to your Storagevault account', usage: ',storagevault login' },
            execute: async (message, args, client) => {
                if (first('SELECT 1 AS ok FROM storagevault WHERE user_id = ?', message.author.id)) {
                    return warn(message, 'You are already logged in!');
                }
                return modalPrompt(message, {
                    prompt: `${message.author}: Please enter your Storagevault API-Key to authorize access to your account.`,
                    buttonLabel: 'Enter API-Key',
                    title: 'Storagevault Authorization',
                    fields: [{ label: 'API-Key', placeholder: 'Enter your Storagevault API-Key!' }],
                    onSubmit: async (interaction, values) => {
                        const key = String(values[0] || '').trim();
                        if (!key || !await verifyKey(DOMAIN, key)) {
                            return interaction.update({
                                embeds: [createEmbed({ color: 0xffd600, description: 'Invalid API-Key! Please try again.' })],
                                components: []
                            }).catch(() => {});
                        }
                        run('INSERT OR REPLACE INTO storagevault (user_id, "key") VALUES (?, ?)', message.author.id, key);
                        message.delete().catch(() => {});
                        return interaction.update({
                            embeds: [createEmbed({ color: 0x39ffb8, description: `Successfully logged in! Check all commands with \`${prefix(message)}help storagevault\`` })],
                            components: []
                        }).catch(() => {});
                    }
                });
            }
        },
        logout: {
            aliases: [],
            data: { name: 'storagevault logout', description: 'Logout from your Storagevault account', usage: ',storagevault logout' },
            execute: async (message, args, client) => {
                if (!needLogin(message)) return;
                run('DELETE FROM storagevault WHERE user_id = ?', message.author.id);
                return approve(message, 'Successfully logged out!');
            }
        },
        upload: {
            aliases: [],
            data: { name: 'storagevault upload', description: 'Upload a file to your Storagevault account', usage: ',storagevault upload' },
            execute: async (message, args, client) => {
                const session = needLogin(message);
                if (!session) return;
                let attachment = message.attachments.first();
                if (!attachment && message.reference && message.reference.resolved && message.reference.resolved.attachments) {
                    attachment = message.reference.resolved.attachments.first();
                }
                if (!attachment) {
                    return warn(message, 'Please provide a file to upload or reply to a message with a file attachment');
                }
                if (!await verifyKey(session.domain, session.key)) {
                    return warn(message, 'Your API-Key is invalid! Please login again.');
                }
                try {
                    const bytes = Buffer.from(await (await fetch(attachment.url)).arrayBuffer());
                    const form = new FormData();
                    form.append('file', new Blob([bytes]), attachment.name || 'file.png');
                    const res = await fetch(`${session.domain}/api/upload`, {
                        method: 'POST',
                        headers: { authorization: session.key },
                        body: form
                    });
                    if (!res.ok) return warn(message, 'The upload failed, please try again later.');
                    const data = await res.json().catch(() => null);
                    const url = data && ((data.files && data.files[0] && (data.files[0].url || data.files[0].raw)) || data.url);
                    if (!url) return warn(message, 'The upload failed, please try again later.');
                    const parts = String(url).split('/');
                    const rawUrl = parts.length > 3 ? [...parts.slice(0, 3), 'raw', ...parts.slice(3)].join('/') : url;
                    return approve(message, `Uploaded file to [**Storagevault**](${DOMAIN})\n**File:** [\`Click Here\`](${url}) - **Raw:** [\`Click Here\`](${rawUrl})`);
                } catch (err) {
                    return warn(message, 'The upload failed, please try again later.');
                }
            }
        },
        users: {
            aliases: [],
            data: { name: 'storagevault users', description: 'View all Storagevault users', usage: ',storagevault users' },
            execute: async (message, args, client) => {
                const session = needLogin(message);
                if (!session) return;
                if (!await verifyKey(session.domain, session.key)) {
                    return warn(message, 'Your API-Key is invalid! Please login again.');
                }
                let users = null;
                try {
                    const res = await fetch(`${session.domain}/api/users`, { headers: { authorization: session.key } });
                    if (res.ok) {
                        const data = await res.json().catch(() => null);
                        users = Array.isArray(data) ? data : (data && data.users) || null;
                    }
                } catch (err) {
                    users = null;
                }
                if (!users) return warn(message, 'You don\'t have permission to view all users!');
                const lines = users.map(user => `**${user.username || user.id}** - \`${user.id}\``);
                if (!lines.length) lines.push('No users found');
                return paginate(message, lines, 'Storagevault Users', {
                    name: message.author.tag,
                    icon_url: message.author.displayAvatarURL({ size: 256 })
                });
            }
        }
    }
};
