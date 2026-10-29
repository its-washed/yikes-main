const { PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { first, query, run } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { needPerm } = require('../../utils/moderation');
const { COLORS, EMOJIS } = require('../../utils/styles');
const { altConvert, scriptPayload } = require('../../utils/embedScript');
const T = require('../../utils/tickets');

const DEFAULT_PANEL_CODE = '{embed}{color: #729bb0}$v{title: Create a ticket}$v{description: Please select your inquiry below.\nDo **not** create a ticket and suddenly go offline.\n> Refer to [nohello.net](https://nohello.net)}$v{thumbnail: {guild.icon}}';


const channelCooldowns = new Map();

function onCooldown(message, key, seconds) {
    const now = Date.now();
    const until = channelCooldowns.get(key) || 0;
    if (now < until) {
        warn(message, `You are on cooldown, try again in **${Math.ceil((until - now) / 1000)}** seconds`);
        return true;
    }
    channelCooldowns.set(key, now + seconds * 1000);
    return false;
}



function findMember(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.members.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<@!>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.members.cache.get(id) || null;
    return message.guild.members.cache.find((m) =>
        m.user.username.toLowerCase() === raw.toLowerCase() || m.displayName.toLowerCase() === raw.toLowerCase()) || null;
}

function findUser(message, value) {
    const member = findMember(message, value);
    if (member) return member.user;
    const raw = String(value || '').trim();
    if (/^\d{17,20}$/.test(raw)) return message.client.users.cache.get(raw) || null;
    return null;
}

function findRole(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.roles.first();
    if (mentioned) return mentioned;
    const id = raw.replace(/[<@&>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.roles.cache.get(id) || null;
    return message.guild.roles.cache.find((r) => r.name.toLowerCase() === raw.toLowerCase()) || null;
}

function findCategory(message, value) {
    const raw = String(value || '').trim();
    if (!raw || raw === 'none') return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && mentioned.type === ChannelType.GuildCategory) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) {
        const channel = message.guild.channels.cache.get(id);
        if (channel && channel.type === ChannelType.GuildCategory) return channel;
    }
    return null;
}

function findChannel(message, value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const mentioned = message.mentions.channels.first();
    if (mentioned && raw.includes(mentioned.id)) return mentioned;
    const id = raw.replace(/[<#>]/g, '');
    if (/^\d{17,20}$/.test(id)) return message.guild.channels.cache.get(id) || null;
    return null;
}

function topicExists(guildId, name) {
    return Boolean(first('SELECT 1 AS ok FROM ticket_topics WHERE guild_id = ? AND name = ?', guildId, name));
}



async function needManageGuild(message) {
    T.ticketExists(message);
    return needPerm(message, PermissionFlagsBits.ManageGuild);
}

async function needAdministrator(message) {
    T.ticketExists(message);
    return needPerm(message, PermissionFlagsBits.Administrator);
}

async function needOpenTicket(message) {
    return T.needOpenTicket(message);
}

async function needManageTicket(message) {
    if (!await T.needOpenTicket(message)) return false;
    return T.canManageTicket(message, 'manage');
}

async function needCloseTicket(message) {
    if (!await T.needOpenTicket(message)) return false;
    return T.canManageTicket(message, 'close');
}



async function ask(message, prompt, check) {
    await message.channel.send(prompt);
    try {
        const collected = await message.channel.awaitMessages({
            filter: (m) => m.author.id === message.author.id && (!check || check(m)),
            max: 1,
            time: 300000
        });
        const reply = collected.first();
        return reply || null;
    } catch (err) {
        return null;
    }
}

async function setupFlow(message) {
    if (first('SELECT 1 AS ok FROM ticket WHERE guild_id = ?', message.guild.id)) {
        return warn(message, 'Ticket system is already setup');
    }
    run('INSERT INTO ticket (guild_id) VALUES (?)', message.guild.id);

    while (true) {
        const nameMsg = await ask(message, 'Please enter a topic name (or type `done` to finish):');
        if (!nameMsg) return warn(message, 'Setup timed out');
        if (nameMsg.content.toLowerCase() === 'done') break;

        const rolesMsg = await ask(message, 'Please mention the support roles for this topic (or type `none` if there are no specific roles):',
            (m) => m.mentions.roles.size > 0 || m.content.toLowerCase() === 'none');
        if (!rolesMsg) return warn(message, 'Setup timed out');
        const roles = rolesMsg.content.toLowerCase() === 'none' ? [] : rolesMsg.mentions.roles.map((r) => r.id);

        const embedMsg = await ask(message, 'Please enter the embed message for this topic (or type `default` to use the default embed):');
        if (!embedMsg) return warn(message, 'Setup timed out');
        const embedCode = embedMsg.content.toLowerCase() === 'default' ? null : embedMsg.content;

        const descMsg = await ask(message, 'Please enter the description for this topic (or type `none` to skip):');
        if (!descMsg) return warn(message, 'Setup timed out');
        const description = descMsg.content.toLowerCase() === 'none' ? null : descMsg.content;

        const emojiMsg = await ask(message, 'Please enter the emoji for this topic (or type `none` to skip):');
        if (!emojiMsg) return warn(message, 'Setup timed out');
        const emoji = emojiMsg.content.toLowerCase() === 'none' ? null : emojiMsg.content;

        const catMsg = await ask(message, 'Please mention the category for this topic (or type `none` to skip):',
            (m) => m.mentions.channels.size > 0 || m.content.toLowerCase() === 'none');
        if (!catMsg) return warn(message, 'Setup timed out');
        const categoryId = catMsg.content.toLowerCase() === 'none' ? null : catMsg.mentions.channels.first().id;

        if (topicExists(message.guild.id, nameMsg.content)) {
            return warn(message, `Topic \`${nameMsg.content}\` already exists`);
        }
        run('INSERT INTO ticket_topics (guild_id, name, support_roles, embed, description, emoji, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            message.guild.id, nameMsg.content, JSON.stringify(roles), embedCode, description, emoji, categoryId);
        await approve(message, `Added topic: ${nameMsg.content} with roles: ${roles.map((id) => `<@&${id}>`).join(', ') || 'none'}`);
    }

    const panelMsg = await ask(message, 'Please enter the embed message for the ticket panel (or type `default` to use the default embed):');
    if (!panelMsg) return warn(message, 'Setup timed out');
    const openEmbed = panelMsg.content.toLowerCase() === 'default' ? null : panelMsg.content;
    run('UPDATE ticket SET open_embed = ? WHERE guild_id = ?', openEmbed, message.guild.id);

    const defaultCatMsg = await ask(message, 'Please mention the default category for tickets (or type `none` to skip):',
        (m) => m.mentions.channels.size > 0 || m.content.toLowerCase() === 'none');
    if (!defaultCatMsg) return warn(message, 'Setup timed out');
    const defaultCategory = defaultCatMsg.content.toLowerCase() === 'none' ? null : defaultCatMsg.mentions.channels.first().id;
    run('UPDATE ticket SET category_id = ? WHERE guild_id = ?', defaultCategory, message.guild.id);

    const logsMsg = await ask(message, 'Please mention the logs channel for tickets (or type `none` to skip):',
        (m) => m.mentions.channels.size > 0 || m.content.toLowerCase() === 'none');
    if (!logsMsg) return warn(message, 'Setup timed out');
    const logs = logsMsg.content.toLowerCase() === 'none' ? null : logsMsg.mentions.channels.first().id;
    run('UPDATE ticket SET logs = ? WHERE guild_id = ?', logs, message.guild.id);

    const supportMsg = await ask(message, 'Please mention the support roles for tickets (or type `none` if there are no specific roles):',
        (m) => m.mentions.roles.size > 0 || m.content.toLowerCase() === 'none');
    if (!supportMsg) return warn(message, 'Setup timed out');
    const supportRoles = supportMsg.content.toLowerCase() === 'none' ? [] : supportMsg.mentions.roles.map((r) => r.id);
    run('UPDATE ticket SET support_roles = ? WHERE guild_id = ?', JSON.stringify(supportRoles), message.guild.id);

    const channelMsg = await ask(message, 'Please mention the channel where you want to send the ticket panel:',
        (m) => m.mentions.channels.size > 0);
    if (!channelMsg) return warn(message, 'Setup timed out');
    const channel = channelMsg.mentions.channels.first();

    const code = panelMsg.content.toLowerCase() === 'default' ? DEFAULT_PANEL_CODE : panelMsg.content;
    const payload = scriptPayload(altConvert(message.member, code));
    payload.components = [T.ticketRow('create')];
    try {
        await channel.send(payload);
        return approve(message, `Sent the ticket panel to ${channel}`);
    } catch (err) {
        return warn(message, `An error occurred while trying to send the ticket panel:\n \`\`\`${err.message}\`\`\``);
    }
}



async function ticketSupportForClaim(guild, ticket) {
    let raw;
    if (ticket.topic === 'default') {
        raw = (first('SELECT support_roles FROM ticket WHERE guild_id = ?', guild.id) || {}).support_roles;
    } else {
        raw = (first('SELECT support_roles FROM ticket_topics WHERE guild_id = ? AND name = ?', guild.id, ticket.topic) || {}).support_roles;
        const parsed = T.parseRoleIds(raw, 'topic support roles');
        if (!parsed.ids || !parsed.ids.length) {
            raw = (first('SELECT support_roles FROM ticket WHERE guild_id = ?', guild.id) || {}).support_roles;
        }
    }
    const parsed = T.parseRoleIds(raw, 'support roles');
    return parsed.ids || [];
}

async function applyClaim(message, ticket, claimer) {
    const supportRoles = await ticketSupportForClaim(message.guild, ticket);
    const privat = Boolean((first('SELECT claiming_privat FROM ticket WHERE guild_id = ?', message.guild.id) || {}).claiming_privat);
    for (const roleId of supportRoles) {
        const role = message.guild.roles.cache.get(String(roleId));
        if (!role) continue;
        try {
            const overwrite = message.channel.permissionOverwrites.cache.get(role.id);
            const current = overwrite ? overwrite.allow : 0n, denied = overwrite ? overwrite.deny : 0n;
            const allow = { ViewChannel: !privat, SendMessages: false, AttachFiles: !privat, EmbedLinks: !privat };
            await message.channel.permissionOverwrites.edit(role.id, allow, { reason: 'Ticket claimed by a staff member' });
            void current; void denied;
        } catch (err) {}
    }
    try {
        await message.channel.permissionOverwrites.edit(claimer.id, { ViewChannel: true, SendMessages: true }, { reason: 'Claimed the ticket' });
    } catch (err) {}

    const claimRow = first('SELECT channel_id FROM ticket_claims WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);
    if (!claimRow) {
        run('INSERT INTO ticket_claims (guild_id, user_id, channel_id) VALUES (?, ?, ?)', message.guild.id, claimer.id, message.channel.id);
    } else {
        run('UPDATE ticket_claims SET user_id = ? WHERE guild_id = ? AND channel_id = ?', claimer.id, message.guild.id, message.channel.id);
    }
    run('UPDATE ticket_opened SET claimed_by = ? WHERE guild_id = ? AND channel_id = ?', claimer.id, message.guild.id, message.channel.id);
}



async function closeFlow(message) {
    const opened = first('SELECT user_id, topic FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        message.guild.id, message.channel.id);
    const status = await message.channel.send({
        embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: Transcript generation in progress...` }]
    });
    await T.closeTicket(message.guild, message.channel, message.author.id);
    await status.edit({
        embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${message.author}: Ticket will be closed shortly...` }]
    }).catch(() => {});
    void opened;
    try {
        await message.channel.delete('ticket closed');
    } catch (err) {}
}



const modalSubs = {
    add: {
        aliases: [],
        data: { name: 'ticket modal add', description: 'Add modal to a ticket topic', usage: 'ticket modal add Support Question What is your Question?' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const [topic, name] = args;
            const description = args.slice(2).join(' ');
            if (!topic || !name || !description) return warn(message, 'You must provide a topic, name and description\n> Usage: `ticket modal add Support Question What is your Question?`');
            if (name.length > 50) return warn(message, 'Modal name must be less than 50 characters');
            if (description.length > 200) return warn(message, 'Modal description must be less than 200 characters');
            if (topic.toLowerCase() !== 'default' && !topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
            if (first('SELECT 1 AS ok FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, name)) {
                return warn(message, `Modal \`${name}\` already exists for topic \`${topic}\``);
            }
            const count = Number((first('SELECT COUNT(*) AS count FROM ticket_modals WHERE guild_id = ? AND topic = ?', message.guild.id, topic) || {}).count || 0);
            if (count >= 3) return warn(message, `Cannot add more than 3 modals to topic \`${topic}\``);
            const code = require('crypto').randomBytes(4).toString('hex');
            run('INSERT INTO ticket_modals (guild_id, topic, name, description, code) VALUES (?, ?, ?, ?, ?)',
                message.guild.id, topic, name, description, code);
            return approve(message, `Added **${name}** modal to **${topic}** topic as **${code}**`);
        }
    },
    remove: {
        aliases: [],
        data: { name: 'ticket modal remove', description: 'Remove modal from a ticket topic', usage: 'ticket modal remove Support Question' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const [topic, name] = args;
            if (!topic || !name) return warn(message, 'You must provide a topic and name\n> Usage: `ticket modal remove Support Question`');
            if (topic.toLowerCase() !== 'default' && !topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
            if (!first('SELECT 1 AS ok FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, name)) {
                return warn(message, `Modal \`${name}\` does not exist`);
            }
            run('DELETE FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, name);
            return approve(message, `Removed **${name}** modal from **${topic}** topic`);
        }
    },
    name: {
        aliases: [],
        data: { name: 'ticket modal name', description: 'Edit modal name for a ticket topic', usage: 'ticket modal name Support Question Product' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const [topic, old, next] = args;
            if (!topic || !old || !next) return warn(message, 'You must provide a topic, current name and new name\n> Usage: `ticket modal name Support Question Product`');
            if (next.length > 50) return warn(message, 'Modal name must be less than 50 characters');
            if (topic.toLowerCase() !== 'default' && !topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
            if (!first('SELECT 1 AS ok FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, old)) {
                return warn(message, `Modal \`${old}\` does not exist`);
            }
            run('UPDATE ticket_modals SET name = ? WHERE guild_id = ? AND topic = ? AND name = ?', next, message.guild.id, topic, old);
            return approve(message, `Updated **${old}** modal name to **${next}** for **${topic}** topic`);
        }
    },
    description: {
        aliases: [],
        data: { name: 'ticket modal description', description: 'Edit modal description for a ticket topic', usage: 'ticket modal description Support Question What is your Question?' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const [topic, name] = args;
            const description = args.slice(2).join(' ');
            if (!topic || !name || !description) return warn(message, 'You must provide a topic, name and description\n> Usage: `ticket modal description Support Question What is your Question?`');
            if (description.length > 200) return warn(message, 'Modal description must be less than 200 characters');
            if (topic.toLowerCase() !== 'default' && !topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
            if (!first('SELECT 1 AS ok FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, name)) {
                return warn(message, `Modal \`${name}\` does not exist`);
            }
            run('UPDATE ticket_modals SET description = ? WHERE guild_id = ? AND topic = ? AND name = ?', description, message.guild.id, topic, name);
            return approve(message, `Updated **${name}** modal description to\n\`\`\`${description}\`\`\` for **${topic}** topic`);
        }
    },
    toggle: {
        aliases: [],
        data: { name: 'ticket modal toggle', description: 'Toggle a modal for a ticket topic', usage: 'ticket modal toggle Support Question' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const [topic, name] = args;
            if (!topic || !name) return warn(message, 'You must provide a topic and name\n> Usage: `ticket modal toggle Support Question`');
            if (topic.toLowerCase() !== 'default' && !topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
            const row = first('SELECT required FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, name);
            if (!row) return warn(message, `Modal \`${name}\` does not exist`);
            const required = !Boolean(row.required);
            run('UPDATE ticket_modals SET required = ? WHERE guild_id = ? AND topic = ? AND name = ?', required ? 1 : 0, message.guild.id, topic, name);
            return approve(message, `Modal **${name}** is now **${required ? 'required' : 'optional'}** for **${topic}** topic`);
        }
    },
    style: {
        aliases: [],
        data: { name: 'ticket modal style', description: 'Change the style of a modal for a ticket topic', usage: 'ticket modal style Support Question long' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const [topic, name, style] = args;
            if (!topic || !name || !style) return warn(message, 'You must provide a topic, name and style\n> Usage: `ticket modal style Support Question long`');
            if (topic.toLowerCase() !== 'default' && !topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
            if (!first('SELECT 1 AS ok FROM ticket_modals WHERE guild_id = ? AND topic = ? AND name = ?', message.guild.id, topic, name)) {
                return warn(message, `Modal \`${name}\` does not exist`);
            }
            if (!['short', 'long'].includes(style.toLowerCase())) return warn(message, 'Invalid style. Valid styles are: `short` & `long`');
            run('UPDATE ticket_modals SET style = ? WHERE guild_id = ? AND topic = ? AND name = ?',
                style.toLowerCase() === 'long' ? 'long' : 'short', message.guild.id, topic, name);
            return approve(message, `Updated **${name}** modal style to **${style}** for **${topic}** topic`);
        }
    },
    list: {
        aliases: [],
        data: { name: 'ticket modal list', description: 'List all modals for all ticket topics' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const results = query('SELECT topic, name, code, description FROM ticket_modals WHERE guild_id = ? ORDER BY topic', message.guild.id);
            if (!results.length) return warn(message, 'No modals found for this server');
            const byTopic = new Map();
            for (const row of results) {
                if (!byTopic.has(row.topic)) byTopic.set(row.topic, []);
                byTopic.get(row.topic).push(row);
            }
            const lines = [];
            for (const [topic, modals] of byTopic) {
                lines.push(`**Modals for ${topic}**`);
                for (const modal of modals) lines.push(`\`${modal.code}\` **${modal.name}**\n\`\`\`${modal.description}\`\`\``);
                lines.push('');
            }
            return paginate(message, lines.filter(Boolean), 'Ticket Modals', { name: message.guild.name, icon_url: message.guild.iconURL() || undefined });
        }
    }
};

const topicSubs = {
    add: {
        aliases: [],
        data: { name: 'ticket topic add', description: 'Create a ticket topic', usage: 'ticket topic add Support' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const name = args.join(' ');
            if (!name) return warn(message, 'You must provide a topic name\n> Usage: `ticket topic add Support`');
            if (topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` already exists`);
            const count = Number((first('SELECT COUNT(*) AS count FROM ticket_topics WHERE guild_id = ?', message.guild.id) || {}).count || 0);
            if (count >= 25) return warn(message, 'Cannot add more than 25 topics');
            run('INSERT INTO ticket_topics (guild_id, name) VALUES (?, ?)', message.guild.id, name);
            return approve(message, `Added **${name}** topic`);
        }
    },
    remove: {
        aliases: [],
        data: { name: 'ticket topic remove', description: 'Delete a ticket topic', usage: 'ticket topic remove Support' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const name = args.join(' ');
            if (!name) return warn(message, 'You must provide a topic name\n> Usage: `ticket topic remove Support`');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            run('DELETE FROM ticket_topics WHERE guild_id = ? AND name = ?', message.guild.id, name);
            return approve(message, `Removed **${name}** topic`);
        }
    },
    name: {
        aliases: [],
        data: { name: 'ticket topic name', description: 'Edit a ticket topic name', usage: 'ticket topic name Support General' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const [old, next] = args;
            if (!old || !next) return warn(message, 'You must provide the current and new name\n> Usage: `ticket topic name Support General`');
            if (!topicExists(message.guild.id, old)) return warn(message, `Topic \`${old}\` does not exist`);
            run('UPDATE ticket_topics SET name = ? WHERE guild_id = ? AND name = ?', next, message.guild.id, old);
            return approve(message, `Updated **${old}** topic name to **${next}**`);
        }
    },
    description: {
        aliases: [],
        data: { name: 'ticket topic description', description: 'Edit a ticket topic description', usage: 'ticket topic description Support Support related questions' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const name = args[0];
            const description = args.slice(1).length ? args.slice(1).join(' ') : null;
            if (!name) return warn(message, 'You must provide a topic name\n> Usage: `ticket topic description Support Support related questions`');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            run('UPDATE ticket_topics SET description = ? WHERE guild_id = ? AND name = ?', description, message.guild.id, name);
            if (description === null) return approve(message, `Removed **${name}** topic description`);
            return approve(message, `Updated **${name}** topic description to\n\`\`\`${description}\`\`\``);
        }
    },
    emoji: {
        aliases: [],
        data: { name: 'ticket topic emoji', description: 'Edit a ticket topic emoji', usage: 'ticket topic emoji Support 🛠️' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const name = args[0];
            const raw = args.slice(1).join(' ');
            if (!name || !raw) return warn(message, 'You must provide a topic name and emoji\n> Usage: `ticket topic emoji Support 🛠️`');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            const resolved = T.resolveEmoji(message.guild, raw);
            if (!resolved) return warn(message, `Emoji \`${raw}\` is not **available** on this server or it's not a valid emoji`);
            const value = typeof resolved === 'string' ? resolved : `<${resolved.animated ? 'a' : ''}:${resolved.name}:${resolved.id}>`;
            run('UPDATE ticket_topics SET emoji = ? WHERE guild_id = ? AND name = ?', value, message.guild.id, name);
            return approve(message, `Updated **${name}** topic emoji to **${value}**`);
        }
    },
    channelname: {
        aliases: ['cn', 'cname'],
        data: { name: 'ticket topic channelname', description: 'Edit a ticket topic channel name', usage: 'ticket topic channelname Support 💰-{user.name}' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const name = args[0];
            const value = args.slice(1).length ? args.slice(1).join(' ') : null;
            if (!name) return warn(message, 'You must provide a topic name\n> Usage: `ticket topic channelname Support 💰-{user.name}`');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            run('UPDATE ticket_topics SET channel_name = ? WHERE guild_id = ? AND name = ?', value, message.guild.id, name);
            if (value === null) return approve(message, `Removed **${name}** topic channel name`);
            return approve(message, `Updated **${name}** topic channel name to **${value}**`);
        }
    },
    channeltopic: {
        aliases: ['ct', 'ctopic'],
        data: { name: 'ticket topic channeltopic', description: 'Edit a ticket topic channel topic', usage: 'ticket topic channeltopic Support 💰-{user.name}' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const name = args[0];
            const value = args.slice(1).length ? args.slice(1).join(' ') : null;
            if (!name) return warn(message, 'You must provide a topic name\n> Usage: `ticket topic channeltopic Support 💰-{user.name}`');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            run('UPDATE ticket_topics SET channel_topic = ? WHERE guild_id = ? AND name = ?', value, message.guild.id, name);
            if (value === null) return approve(message, `Removed **${name}** topic channel topic`);
            return approve(message, `Updated **${name}** topic channel topic to **${value}**`);
        }
    },
    weight: {
        aliases: [],
        data: { name: 'ticket topic weight', description: 'Edit a ticket topic weight', usage: 'ticket topic weight Support 5' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const [name, raw] = args;
            const weight = parseInt(raw, 10);
            if (!name || !Number.isFinite(weight)) return warn(message, 'You must provide a topic name and weight\n> Usage: `ticket topic weight Support 5`');
            if (weight < 1) return warn(message, 'Topic weight must be greater than **0**');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            run('UPDATE ticket_topics SET weight = ? WHERE guild_id = ? AND name = ?', weight, message.guild.id, name);
            return approve(message, `Updated **${name}** topic weight to **${weight}**`);
        }
    },
    status: {
        aliases: [],
        data: { name: 'ticket topic status', description: 'Edit a ticket topic status', usage: 'ticket topic status Support on' },
        async execute(message, args, client, config) {
            if (!await needAdministrator(message)) return;
            const [name, option] = args;
            if (!name || !option) return warn(message, 'You must provide a topic name and option\n> Usage: `ticket topic status Support on`');
            if (!['on', 'off'].includes(option.toLowerCase())) return warn(message, 'Invalid option. Valid options are: `on` & `off`');
            if (!topicExists(message.guild.id, name)) return warn(message, `Topic \`${name}\` does not exist`);
            const enabled = option.toLowerCase() === 'on';
            run('UPDATE ticket_topics SET status = ? WHERE guild_id = ? AND name = ?', enabled ? 1 : 0, message.guild.id, name);
            return approve(message, `Updated **${name}** topic status to **${enabled ? 'enabled' : 'disabled'}**`);
        }
    }
};

const subs = {
    setup: {
        aliases: [],
        data: { name: 'ticket setup', description: 'Setup the ticket system' },
        async execute(message, args, client, config) {
            if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
            T.ticketExists(message);
            return setupFlow(message);
        }
    },

    allow: {
        aliases: ['add'],
        data: { name: 'ticket allow', description: 'Add a user or role to the ticket', usage: 'ticket allow its_washed' },
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            const target = args.join(' ');
            const member = findMember(message, target);
            const role = member ? null : findRole(message, target);
            const targetId = member ? member.id : role ? role.id : null;
            if (!targetId) return warn(message, `Couldn't find a member or role with the name **${target || ''}**`);
            await message.channel.permissionOverwrites.edit(targetId, {
                ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true
            }, { reason: 'Added to the ticket' });
            if (member) {
                try {
                    await member.send({
                        embeds: [{ color: COLORS.NEUTRAL, description: `You have been added to the ticket: ${message.channel}` }]
                    });
                } catch (err) {}
            }
            return approve(message, `Added ${member ? member : role} to the ticket`);
        }
    },

    unallow: {
        aliases: ['remove'],
        data: { name: 'ticket unallow', description: 'Remove a user or role from the ticket', usage: 'ticket unallow its_washed' },
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            const target = args.join(' ');
            const member = findMember(message, target);
            const role = member ? null : findRole(message, target);
            const targetId = member ? member.id : role ? role.id : null;
            if (!targetId) return warn(message, `Couldn't find a member or role with the name **${target || ''}**`);
            await message.channel.permissionOverwrites.edit(targetId, {
                ViewChannel: false, SendMessages: false, AttachFiles: false, EmbedLinks: false
            }, { reason: 'Removed from the ticket' }).catch(() => {});
            return approve(message, `Removed ${member ? member : role} from the ticket`);
        }
    },

    claiming: {
        aliases: [],
        data: { name: 'ticket claiming', description: 'Configure the ticket claiming system' },
        subcommands: ['enable', 'disable', 'privat', 'public'],
        subUsages: {
            enable: ',ticket claiming enable',
            disable: ',ticket claiming disable',
            privat: ',ticket claiming privat',
            public: ',ticket claiming public'
        },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            return sendCard(message, subs.claiming, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: {
            enable: {
                aliases: [],
                data: { name: 'ticket claiming enable', description: 'Enable the ticket claiming system' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    if (Boolean((first('SELECT claiming FROM ticket WHERE guild_id = ?', message.guild.id) || {}).claiming)) {
                        return warn(message, 'Ticket claiming system is **already** enabled');
                    }
                    run('UPDATE ticket SET claiming = ? WHERE guild_id = ?', 1, message.guild.id);
                    return approve(message, 'Enabled the ticket claiming system');
                }
            },
            disable: {
                aliases: [],
                data: { name: 'ticket claiming disable', description: 'Disable the ticket claiming system' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    if (Boolean((first('SELECT claiming FROM ticket WHERE guild_id = ?', message.guild.id) || {}).claiming) === false) {
                        return warn(message, 'Ticket claiming system is **already** disabled');
                    }
                    run('UPDATE ticket SET claiming = ? WHERE guild_id = ?', 0, message.guild.id);
                    return approve(message, 'Disabled the ticket claiming system');
                }
            },
            privat: {
                aliases: [],
                data: { name: 'ticket claiming privat', description: 'Set the ticket claiming system to private' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    if (Boolean((first('SELECT claiming_privat FROM ticket WHERE guild_id = ?', message.guild.id) || {}).claiming_privat)) {
                        return warn(message, 'Ticket claiming system is **already** privat');
                    }
                    run('UPDATE ticket SET claiming_privat = ? WHERE guild_id = ?', 1, message.guild.id);
                    return approve(message, 'Set the ticket claiming system to privat');
                }
            },
            public: {
                aliases: [],
                data: { name: 'ticket claiming public', description: 'Set the ticket claiming system to public' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    if (Boolean((first('SELECT claiming_privat FROM ticket WHERE guild_id = ?', message.guild.id) || {}).claiming_privat) === false) {
                        return warn(message, 'Ticket claiming system is **already** public');
                    }
                    run('UPDATE ticket SET claiming_privat = ? WHERE guild_id = ?', 0, message.guild.id);
                    return approve(message, 'Set the ticket claiming system to public');
                }
            }
        }
    },

    claim: {
        aliases: [],
        data: { name: 'ticket claim', description: 'Claim the current ticket' },
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            const claiming = Boolean((first('SELECT claiming FROM ticket WHERE guild_id = ?', message.guild.id) || {}).claiming);
            if (!claiming) return warn(message, 'Ticket claiming system is **disabled**');
            const ticket = first('SELECT user_id, topic, claimed_by FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
                message.guild.id, message.channel.id);
            if (!ticket) return warn(message, 'Command can only be used in a opened ticket');
            if (ticket.claimed_by !== null && ticket.claimed_by !== undefined) {
                return warn(message, `Ticket is already claimed by <@${ticket.claimed_by}>`);
            }
            await applyClaim(message, ticket, message.author);
            return approve(message, `Claimed the ticket from <@${ticket.user_id}>`);
        }
    },

    unclaim: {
        aliases: [],
        data: { name: 'ticket unclaim', description: 'Unclaim the current ticket' },
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            const ticket = first('SELECT user_id, topic, claimed_by FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
                message.guild.id, message.channel.id);
            if (!ticket) return warn(message, 'Command can only be used in a opened ticket');
            if (ticket.claimed_by === null || ticket.claimed_by === undefined) return warn(message, 'Ticket is not claimed by anyone');
            const supportRoles = await ticketSupportForClaim(message.guild, ticket);
            for (const roleId of supportRoles) {
                const role = message.guild.roles.cache.get(String(roleId));
                if (!role) continue;
                try {
                    await message.channel.permissionOverwrites.edit(role.id, {
                        ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true
                    }, { reason: 'Ticket unclaimed by a staff member' });
                } catch (err) {}
            }
            try {
                await message.channel.permissionOverwrites.edit(message.author.id, { SendMessages: null }, { reason: 'Unclaimed the ticket' });
            } catch (err) {}
            run('DELETE FROM ticket_claims WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);
            run('UPDATE ticket_opened SET claimed_by = NULL WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id);
            return approve(message, `Unclaimed the ticket from <@${ticket.user_id}>`);
        }
    },

    leaderboard: {
        aliases: ['lb'],
        data: { name: 'ticket leaderboard', description: 'View the ticket leaderboard' },
        async execute(message, args, client, config) {
            const results = query('SELECT user_id, COUNT(user_id) AS count FROM ticket_claims WHERE guild_id = ? GROUP BY user_id ORDER BY count DESC', message.guild.id);
            if (!results.length) return warn(message, 'There are no claims saved');
            const lines = [];
            for (const row of results) {
                const user = message.guild.members.cache.get(String(row.user_id));
                if (user) lines.push(`${user}: ${row.count}`);
            }
            if (!lines.length) return warn(message, 'There are no claims saved');
            return paginate(message, lines, 'Ticket Leaderboard', {
                name: message.guild.name, icon_url: message.guild.iconURL() || undefined
            });
        }
    },

    remind: {
        aliases: ['r'],
        data: { name: 'ticket remind', description: 'Remind the ticket owner' },
        cooldown: 5,
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            if (onCooldown(message, `ticket_remind:${message.channel.id}`, 300)) return;
            await message.delete().catch(() => {});
            const ownerId = (first('SELECT user_id FROM ticket_opened WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id) || {}).user_id;
            const owner = ownerId ? message.guild.members.cache.get(String(ownerId)) : null;
            if (!owner) return;
            const reason = args.join(' ') || null;
            try {
                await owner.send({
                    embeds: [{
                        color: COLORS.NEUTRAL,
                        description: `# ⏰ Friendly Reminder\nHi, if you see this message it probably means you forgot about your open ticket.\nMake sure to check it out: ${message.channel}${reason ? ` in reason of ${reason}` : ''}`
                    }]
                });
                return approve(message, `Reminder was successfully sent to ${owner}`);
            } catch (err) {
                return warn(message, `${owner} has disabled their Direct Messages for this server.`);
            }
        }
    },

    close: {
        aliases: [],
        data: { name: 'ticket close', description: 'Close the current ticket' },
        async execute(message, args, client, config) {
            if (!await needCloseTicket(message)) return;
            return closeFlow(message);
        }
    },

    closerequest: {
        aliases: ['cr'],
        data: { name: 'ticket closerequest', description: 'Request to close the current ticket' },
        cooldown: 5,
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            if (onCooldown(message, `ticket_cr:${message.channel.id}`, 300)) return;
            const ownerId = (first('SELECT user_id FROM ticket_opened WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id) || {}).user_id;
            const owner = ownerId ? message.guild.members.cache.get(String(ownerId)) : null;
            if (!owner) return warn(message, 'Ticket owner left the server');
            await message.channel.send({
                content: owner.toString(),
                embeds: [{
                    color: COLORS.WARNING,
                    description: `${EMOJIS.WARNING} ${owner}, ${message.author} has requested to close this ticket.\n> Click on the Button to confirm.`
                }],
                components: [T.ticketRow('request')]
            });
            return message.delete().catch(() => {});
        }
    },

    rename: {
        aliases: [],
        data: { name: 'ticket rename', description: 'Rename a ticket channel', usage: 'ticket rename nitro' },
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            if (!needBotPermChannels(message)) return;
            const name = args.join(' ');
            if (!name) return warn(message, 'You must provide a name\n> Usage: `ticket rename nitro`');
            const userId = (first('SELECT user_id FROM ticket_opened WHERE guild_id = ? AND channel_id = ?', message.guild.id, message.channel.id) || {}).user_id;
            const user = userId ? message.client.users.cache.get(String(userId)) : null;
            if (!user) return warn(message, 'User left the server');
            await message.channel.setName(`${name}-${user.username}`, `Ticket channel renamed by ${message.author.tag}`);
            return approve(message, `Renamed ticket channel to **${name}-${user.username}**`);
        }
    },

    info: {
        aliases: [],
        data: { name: 'ticket info', description: 'View all tickets from a given user', usage: 'ticket info its_washed' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const user = findUser(message, args.join(' '));
            if (!user) return warn(message, `Couldn't find a user with the name **${args.join(' ') || ''}**`);
            const results = query('SELECT id, topic, timestamp FROM ticket_transcripts WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC', message.guild.id, user.id);
            if (!results.length) return warn(message, `There are no transcripts saved for ${user}`);
            const base = process.env.TRANSCRIPT_URL ? String(process.env.TRANSCRIPT_URL).replace(/\/+$/, '') : null;
            const lines = results.map((row) => {
                const link = base ? `[\`${row.id}\`](${base}/${row.id})` : `\`${row.id}\``;
                return `**Topic:** ${row.topic}\n**Ticket Owner:** ${user} (\`${user.id}\`)\n**Transcript:** ${link}\n**Closed:** <t:${Math.floor(row.timestamp)}:R>`;
            });
            return paginate(message, lines, `Transcripts for ${user.tag}`, {
                name: message.guild.name, icon_url: message.guild.iconURL() || undefined
            });
        }
    },

    role: {
        aliases: [],
        data: { name: 'ticket role', description: 'Manage the ticket roles' },
        subcommands: ['set', 'remove'],
        subUsages: { set: ',ticket role set @role', remove: ',ticket role remove' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            return sendCard(message, subs.role, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: {
            set: {
                aliases: [],
                data: { name: 'ticket role set', description: 'Set a role as ticket owner role', usage: 'ticket role set Ticket Owner' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const role = findRole(message, args.join(' '));
                    if (!role) return warn(message, `Couldn't find a role with the name **${args.join(' ') || ''}**`);
                    const current = (first('SELECT owner_role FROM ticket WHERE guild_id = ?', message.guild.id) || {}).owner_role;
                    if (String(current) === String(role.id)) return warn(message, `${role} is already the ticket owner role`);
                    run('UPDATE ticket SET owner_role = ? WHERE guild_id = ?', role.id, message.guild.id);
                    return approve(message, `Updated the ticket owner role to ${role}`);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'ticket role remove', description: 'Remove the ticket owner role' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const current = (first('SELECT owner_role FROM ticket WHERE guild_id = ?', message.guild.id) || {}).owner_role;
                    if (current === null || current === undefined) return warn(message, 'No ticket owner role is set');
                    run('UPDATE ticket SET owner_role = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Removed the ticket owner role');
                }
            }
        }
    },

    support: {
        aliases: [],
        data: { name: 'ticket support', description: 'Manage the support roles for the ticket system' },
        subcommands: ['add', 'remove', 'list'],
        subUsages: { add: ',ticket support add <topic> @role', remove: ',ticket support remove <topic> @role', list: ',ticket support list' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            return sendCard(message, subs.support, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: {
            add: {
                aliases: [],
                data: { name: 'ticket support add', description: 'Add a support role to the ticket system', usage: 'ticket support add staff [topic]' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const topic = args[0];
                    const role = findRole(message, args.slice(1).join(' '));
                    if (!topic || !role) return warn(message, 'You must provide a topic and a role\n> Usage: `ticket support add default @staff`');
                    return supportRoleChange(message, topic, role, true);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'ticket support remove', description: 'Remove a support role from the ticket system', usage: 'ticket support remove staff [topic]' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const topic = args[0];
                    const role = findRole(message, args.slice(1).join(' '));
                    if (!topic || !role) return warn(message, 'You must provide a topic and a role\n> Usage: `ticket support remove default @staff`');
                    return supportRoleChange(message, topic, role, false);
                }
            },
            list: {
                aliases: [],
                data: { name: 'ticket support list', description: 'List all support roles for the ticket system' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const globalRaw = (first('SELECT support_roles FROM ticket WHERE guild_id = ?', message.guild.id) || {}).support_roles;
                    const globalParsed = T.parseRoleIds(globalRaw, '**default** roles');
                    const globalList = globalParsed.ids && globalParsed.ids.length
                        ? globalParsed.ids.map((id) => `<@&${id}>`).join(', ') : 'N/A';
                    const topics = query('SELECT name, support_roles FROM ticket_topics WHERE guild_id = ?', message.guild.id);
                    const fields = [{ name: 'Default', value: globalList, inline: false }];
                    for (const row of topics) {
                        const parsed = T.parseRoleIds(row.support_roles, 'topic roles');
                        const list = parsed.ids && parsed.ids.length ? parsed.ids.map((id) => `<@&${id}>`).join(', ') : 'N/A';
                        fields.push({ name: row.name, value: list, inline: false });
                    }
                    return message.reply({
                        embeds: [{
                            color: COLORS.NEUTRAL,
                            title: 'Support Roles',
                            author: { name: message.guild.name, icon_url: message.guild.iconURL() || undefined },
                            fields
                        }]
                    });
                }
            }
        }
    },

    settings: {
        aliases: [],
        data: { name: 'ticket settings', description: 'Configure the ticket system' },
        subcommands: ['reset', 'category', 'logs', 'closed', 'embed', 'counting'],
        subUsages: {
            reset: ',ticket settings reset',
            category: ',ticket settings category default #tickets',
            logs: ',ticket settings logs #transcripts',
            closed: ',ticket settings closed #transcripts',
            embed: ',ticket settings embed default {user.mention}, support will be with you shortly',
            counting: ',ticket settings counting on'
        },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            return sendCard(message, subs.settings, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: {
            reset: {
                aliases: ['disable'],
                data: { name: 'ticket settings reset', description: 'Disable the ticket module in the server' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    for (const table of ['ticket', 'ticket_blacklist', 'ticket_modals', 'ticket_opened', 'ticket_statuses', 'ticket_topics']) {
                        run(`DELETE FROM ${table} WHERE guild_id = ?`, message.guild.id);
                    }
                    return approve(message, 'Reseted all ticket settings in this server');
                }
            },
            category: {
                aliases: [],
                data: { name: 'ticket settings category', description: 'Configure the category where the tickets should open', usage: 'ticket settings category default #tickets' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const topic = args[0];
                    if (!topic) return warn(message, 'You must provide a topic\n> Usage: `ticket settings category default #tickets`');
                    const category = findCategory(message, args.slice(1).join(' '));
                    if (topic === 'default') {
                        run('UPDATE ticket SET category_id = ? WHERE guild_id = ?', category ? category.id : null, message.guild.id);
                        if (category) return approve(message, `Updated ticket category to ${category}`);
                        return approve(message, 'Removed the default category channel');
                    }
                    if (!topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
                    run('UPDATE ticket_topics SET category_id = ? WHERE guild_id = ? AND name = ?', category ? category.id : null, message.guild.id, topic);
                    if (category) return approve(message, `Updated category for topic \`${topic}\` to ${category}`);
                    return approve(message, `Removed the category for topic \`${topic}\``);
                }
            },
            logs: {
                aliases: [],
                data: { name: 'ticket settings logs', description: 'Configure a channel for logging ticket transcripts', usage: 'ticket settings logs #transcripts' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const channel = findChannel(message, args.join(' '));
                    if (channel) {
                        run('UPDATE ticket SET logs = ? WHERE guild_id = ?', channel.id, message.guild.id);
                        return approve(message, `Updated logs channel to ${channel}`);
                    }
                    run('UPDATE ticket SET logs = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Removed the logs channel');
                }
            },
            closed: {
                aliases: [],
                data: { name: 'ticket settings closed', description: 'Configure a category for closed tickets', usage: 'ticket settings closed #transcripts' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const category = findCategory(message, args.join(' '));
                    if (category) {
                        run('UPDATE ticket SET closed = ? WHERE guild_id = ?', category.id, message.guild.id);
                        return approve(message, `Updated closed category to ${category}`);
                    }
                    run('UPDATE ticket SET closed = NULL WHERE guild_id = ?', message.guild.id);
                    return approve(message, 'Removed the closed category');
                }
            },
            embed: {
                aliases: [],
                data: { name: 'ticket settings embed', description: 'Set a message to be sent when a member opens a ticket', usage: 'ticket settings embed default {user.mention}, support will be with you shortly' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const topic = args[0];
                    const code = args.slice(1).length ? args.slice(1).join(' ') : null;
                    if (!topic) return warn(message, 'You must provide a topic\n> Usage: `ticket settings embed default {user.mention}, support will be with you shortly`');
                    if (topic === 'default') {
                        run('UPDATE ticket SET open_embed = ? WHERE guild_id = ?', code, message.guild.id);
                        if (code) return approve(message, `Updated the default ticket opening message to\n\`\`\`${code}\`\`\``);
                        return approve(message, 'Removed the default ticket opening message');
                    }
                    if (!topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
                    run('UPDATE ticket_topics SET embed = ? WHERE guild_id = ? AND name = ?', code, message.guild.id, topic);
                    if (code) return approve(message, `Updated the ticket opening message for topic \`${topic}\` to\n\`\`\`${code}\`\`\``);
                    return approve(message, `Removed the custom ticket opening message for topic \`${topic}\``);
                }
            },
            counting: {
                aliases: [],
                data: { name: 'ticket settings counting', description: 'Enable or disable the ticket counting system', usage: 'ticket settings counting on' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const option = String(args[0] || '').toLowerCase();
                    if (option === 'on') {
                        run('UPDATE ticket SET counter_status = ? WHERE guild_id = ?', 1, message.guild.id);
                        return approve(message, 'Enabled the ticket counting system');
                    }
                    if (option === 'off') {
                        run('UPDATE ticket SET counter_status = ? WHERE guild_id = ?', 0, message.guild.id);
                        return approve(message, 'Disabled the ticket counting system');
                    }
                    return warn(message, 'Invalid option. Valid options are: `on` & `off`');
                }
            }
        }
    },

    status: {
        aliases: [],
        data: { name: 'ticket status', description: 'Configure the ticket status' },
        subcommands: ['add', 'remove', 'category', 'list'],
        subUsages: {
            add: ',ticket status add paid #paid',
            remove: ',ticket status remove paid',
            category: ',ticket status category paid #paid',
            list: ',ticket status list'
        },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            return sendCard(message, subs.status, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: {
            add: {
                aliases: [],
                data: { name: 'ticket status add', description: 'Add a ticket status', usage: 'ticket status add paid #paid' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const name = args[0];
                    const category = findCategory(message, args.slice(1).join(' '));
                    if (!name || !category) return warn(message, 'You must provide a name and a category\n> Usage: `ticket status add paid #paid`');
                    if (first('SELECT 1 AS ok FROM ticket_statuses WHERE guild_id = ? AND name = ?', message.guild.id, name)) {
                        return warn(message, `Status \`${name}\` already exists`);
                    }
                    run('INSERT INTO ticket_statuses (guild_id, name, category_id) VALUES (?, ?, ?)', message.guild.id, name, category.id);
                    return approve(message, `Added **${name}** status with category ${category}`);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'ticket status remove', description: 'Remove a ticket status', usage: 'ticket status remove paid' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const name = args.join(' ');
                    if (!name) return warn(message, 'You must provide a name\n> Usage: `ticket status remove paid`');
                    if (!first('SELECT 1 AS ok FROM ticket_statuses WHERE guild_id = ? AND name = ?', message.guild.id, name)) {
                        return warn(message, `Status \`${name}\` does not exist`);
                    }
                    run('DELETE FROM ticket_statuses WHERE guild_id = ? AND name = ?', message.guild.id, name);
                    return approve(message, `Removed **${name}** status`);
                }
            },
            category: {
                aliases: [],
                data: { name: 'ticket status category', description: 'Change the category for a ticket status', usage: 'ticket status category paid #paid' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const name = args[0];
                    const category = findCategory(message, args.slice(1).join(' '));
                    if (!name || !category) return warn(message, 'You must provide a name and a category\n> Usage: `ticket status category paid #paid`');
                    if (!first('SELECT 1 AS ok FROM ticket_statuses WHERE guild_id = ? AND name = ?', message.guild.id, name)) {
                        return warn(message, `Status \`${name}\` does not exist`);
                    }
                    run('UPDATE ticket_statuses SET category_id = ? WHERE guild_id = ? AND name = ?', category.id, message.guild.id, name);
                    return approve(message, `Updated **${name}** status category to ${category}`);
                }
            },
            list: {
                aliases: [],
                data: { name: 'ticket status list', description: 'List all ticket statuses' },
                async execute(message, args, client, config) {
                    if (!await needManageGuild(message)) return;
                    const results = query('SELECT name, category_id FROM ticket_statuses WHERE guild_id = ?', message.guild.id);
                    if (!results.length) return warn(message, 'No ticket statuses found');
                    const lines = results.map((row) => {
                        const category = message.guild.channels.cache.get(String(row.category_id));
                        return `**${row.name}** - ${category ? category : 'N/A'}`;
                    });
                    return paginate(message, lines, 'Ticket Statuses', {
                        name: message.guild.name, icon_url: message.guild.iconURL() || undefined
                    });
                }
            }
        }
    },

    move: {
        aliases: [],
        data: { name: 'ticket move', description: 'Move the ticket to another category', usage: 'ticket move #tickets' },
        async execute(message, args, client, config) {
            if (!await needManageTicket(message)) return;
            if (!needBotPermChannels(message)) return;
            const name = args.join(' ');
            if (!name) return warn(message, 'You must provide a status name\n> Usage: `ticket move paid`');
            if (!first('SELECT 1 AS ok FROM ticket_statuses WHERE guild_id = ? AND name = ?', message.guild.id, name)) {
                return warn(message, `Status \`${name}\` does not exist`);
            }
            const categoryId = (first('SELECT category_id FROM ticket_statuses WHERE guild_id = ? AND name = ?', message.guild.id, name) || {}).category_id;
            const category = message.guild.channels.cache.get(String(categoryId));
            if (!category) return warn(message, `Category for status \`${name}\` does not exist`);
            await message.channel.setParent(category.id, { reason: `Ticket moved to ${category.name}` });
            return approve(message, `Moved ticket to ${category}`);
        }
    },

    limit: {
        aliases: [],
        data: { name: 'ticket limit', description: 'Set the maximum amount of tickets a user can have open', usage: 'ticket limit 5' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const limit = parseInt(args[0], 10);
            if (!Number.isFinite(limit) || limit < 1 || limit > 10) return warn(message, 'Ticket limit must between **1** and **10**');
            run('UPDATE ticket SET "limit" = ? WHERE guild_id = ?', limit, message.guild.id);
            return approve(message, `Updated ticket limit to **${limit}**`);
        }
    },

    topics: {
        aliases: [],
        data: { name: 'ticket topics', description: 'Manage the ticket topics' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const results = query('SELECT name, description FROM ticket_topics WHERE guild_id = ?', message.guild.id);
            const row = new ActionRowBuilder();
            const count = Number((first('SELECT COUNT(*) AS count FROM ticket_topics WHERE guild_id = ?', message.guild.id) || {}).count || 0);
            if (count < 25) {
                row.addComponents(new ButtonBuilder().setCustomId(`ticket_topics_add:${message.author.id}`).setLabel('add topic').setStyle(ButtonStyle.Secondary));
            }
            row.addComponents(new ButtonBuilder().setCustomId(`ticket_topics_remove:${message.author.id}`).setLabel('remove topic')
                .setStyle(ButtonStyle.Danger).setDisabled(results.length === 0));
            return message.reply({
                embeds: [{ color: COLORS.NEUTRAL, description: '🔍 Choose a setting' }],
                components: [row]
            });
        }
    },

    modal: {
        aliases: [],
        data: { name: 'ticket modal', description: 'Modify modal for ticket topics' },
        subcommands: ['add', 'remove', 'name', 'description', 'toggle', 'style', 'list'],
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            return sendCard(message, subs.modal, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: modalSubs
    },

    topic: {
        aliases: [],
        data: { name: 'ticket topic', description: 'Manage the ticket topics' },
        subcommands: ['add', 'remove', 'name', 'description', 'emoji', 'channelname', 'channeltopic', 'weight', 'status'],
        async execute(message, args, client, config) {
            if (!await needPerm(message, PermissionFlagsBits.Administrator)) return;
            T.ticketExists(message);
            return sendCard(message, subs.topic, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: topicSubs
    },

    config: {
        aliases: [],
        data: { name: 'ticket config', description: "Check the server's ticket settings" },
        async execute(message, args, client, config) {
            const check = first('SELECT logs, category_id, support_roles, open_embed FROM ticket WHERE guild_id = ?', message.guild.id);
            if (!check) return warn(message, 'Ticket module is **not** enabled in this server');
            const parsed = T.parseRoleIds(check.support_roles, 'support roles');
            const support = parsed.ids && parsed.ids.length ? parsed.ids.map((id) => `<@&${id}>`).join(', ') : 'N/A';
            const lines = [
                `**Logs:** ${check.logs ? `<#${check.logs}>` : 'N/A'}`,
                `**Category:** ${check.category_id ? `<#${check.category_id}>` : 'N/A'}`,
                `**Support:** ${support}`,
                `**Open Embed:** \`\`\`\n${check.open_embed || 'N/A'}\`\`\``
            ];
            await message.reply({
                embeds: [{
                    color: COLORS.NEUTRAL,
                    title: 'Ticket Configuration',
                    author: { name: message.guild.name, icon_url: message.guild.iconURL() || undefined },
                    fields: [
                        { name: 'Logs', value: check.logs ? `<#${check.logs}>` : 'N/A', inline: true },
                        { name: 'Category', value: check.category_id ? `<#${check.category_id}>` : 'N/A', inline: true },
                        { name: 'Support', value: support },
                        { name: 'Open Embed', value: `\`\`\`\n${check.open_embed || 'N/A'}\`\`\`` }
                    ]
                }]
            });
            void lines;
            const results = query('SELECT name, emoji, category_id, embed FROM ticket_topics WHERE guild_id = ?', message.guild.id);
            if (!results.length) return;
            const topicLines = results.map((row) => {
                const category = row.category_id ? message.guild.channels.cache.get(String(row.category_id)) : null;
                return `**Name:** ${row.name}\n**Emoji:** ${row.emoji || 'N/A'}\n**Category:** ${category ? category : 'N/A'}\n**Open Embed:** \`\`\`${row.embed || 'N/A'}\`\`\``;
            });
            return paginate(message, topicLines, 'Ticket Topics', {
                name: message.guild.name, icon_url: message.guild.iconURL() || undefined
            });
        }
    },

    send: {
        aliases: [],
        data: { name: 'ticket send', description: 'Send the ticket panel to a channel', usage: 'ticket send #ticket {embed}$v{description: Create a Ticket}' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const channel = findChannel(message, args[0]);
            if (!channel) return warn(message, 'You must provide a channel\n> Usage: `ticket send #tickets`');
            const code = args.slice(1).length ? args.slice(1).join(' ') : DEFAULT_PANEL_CODE;
            const payload = scriptPayload(altConvert(message.member, code));
            payload.components = [T.ticketRow('create')];
            try {
                await channel.send(payload);
                return approve(message, `Sent the ticket panel to ${channel}`);
            } catch (err) {
                return warn(message, `An error occurred while trying to send the ticket panel:\n \`\`\`${err.message}\`\`\``);
            }
        }
    },

    blacklist: {
        aliases: [],
        data: { name: 'ticket blacklist', description: 'Blacklist a member from creating tickets', usage: 'ticket blacklist its_washed Spamming' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const user = findUser(message, args[0]);
            const reason = args.slice(1).join(' ');
            if (!user || !reason) return warn(message, 'You must provide a user and a reason\n> Usage: `ticket blacklist its_washed Spamming`');
            if ((client.owners || []).includes(user.id)) return warn(message, "Don't blacklist a bot owner, are you sure?");
            if (first('SELECT 1 AS ok FROM ticket_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id)) {
                return warn(message, `User ${user} is **already** blacklisted from creating tickets`);
            }
            run('INSERT INTO ticket_blacklist (guild_id, user_id, reason) VALUES (?, ?, ?)', message.guild.id, user.id, reason);
            return approve(message, `Blacklisted ${user} from creating tickets for reason: **${reason}**`);
        }
    },

    unblacklist: {
        aliases: [],
        data: { name: 'ticket unblacklist', description: 'Unblacklist a member from creating tickets', usage: 'ticket unblacklist its_washed' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const user = findUser(message, args.join(' '));
            if (!user) return warn(message, `Couldn't find a user with the name **${args.join(' ') || ''}**`);
            if (!first('SELECT 1 AS ok FROM ticket_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id)) {
                return warn(message, `${user} isn't blacklisted from creating tickets`);
            }
            run('DELETE FROM ticket_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, user.id);
            return approve(message, `Unblacklisted ${user} from creating tickets`);
        }
    },

    blacklisted: {
        aliases: [],
        data: { name: 'ticket blacklisted', description: 'List all blacklisted users from creating tickets' },
        async execute(message, args, client, config) {
            if (!await needManageGuild(message)) return;
            const results = query('SELECT user_id, reason FROM ticket_blacklist WHERE guild_id = ?', message.guild.id);
            if (!results.length) return warn(message, 'No ticket blacklisted user found');
            const lines = results.map((row) => {
                const user = message.client.users.cache.get(String(row.user_id)) || `<@${row.user_id}>`;
                return `**${user}** (\`${row.user_id}\`)\n${EMOJIS.REPLY} **Reason:** ${row.reason}`;
            });
            return paginate(message, lines, 'Ticket Blacklisted', {
                name: message.author.tag, icon_url: message.author.avatarURL() || undefined
            });
        }
    },

    admin: {
        aliases: [],
        data: { name: 'ticket admin', description: "Manage the members that can change the Antinuke settings" },
        subcommands: ['add', 'remove'],
        subUsages: { add: ',ticket admin add its_washed', remove: ',ticket admin remove its_washed' },
        async execute(message, args, client, config) {
            return sendCard(message, subs.admin, { sub: String(args[0] || '').toLowerCase() });
        },
        subs: {
            add: {
                aliases: [],
                data: { name: 'ticket admin add', description: 'Give a user permissions to view ticket transcripts', usage: 'ticket admin add its_washed' },
                async execute(message, args, client, config) {
                    if (!await needAdministrator(message)) return;
                    const member = findMember(message, args.join(' '));
                    if (!member) return warn(message, `Couldn't find a member with the name **${args.join(' ') || ''}**`);
                    if (member.user.bot) return message.channel.send('Why would a bot be a ticket admin? They can\'t manage the settings anyways -_-');
                    const row = first('SELECT users FROM ticket_transcripts_access WHERE guild_id = ?', message.guild.id);
                    const admins = row && row.users ? JSON.parse(row.users) : [];
                    if (admins.map(Number).includes(Number(member.id))) return warn(message, 'This member is **already** a ticket admin');
                    admins.push(member.id);
                    if (row) {
                        run('UPDATE ticket_transcripts_access SET users = ? WHERE guild_id = ?', JSON.stringify(admins), message.guild.id);
                    } else {
                        run('INSERT INTO ticket_transcripts_access (guild_id, users) VALUES (?, ?)', message.guild.id, JSON.stringify(admins));
                    }
                    return approve(message, `Added ${member} as a ticket admin`);
                }
            },
            remove: {
                aliases: [],
                data: { name: 'ticket admin remove', description: "Remove a user's permissions to view ticket transcripts", usage: 'ticket admin remove its_washed' },
                async execute(message, args, client, config) {
                    if (!await needAdministrator(message)) return;
                    const member = findMember(message, args.join(' '));
                    if (!member) return warn(message, `Couldn't find a member with the name **${args.join(' ') || ''}**`);
                    const row = first('SELECT users FROM ticket_transcripts_access WHERE guild_id = ?', message.guild.id);
                    if (!row || !row.users) return warn(message, 'There is **no** ticket admin');
                    const admins = JSON.parse(row.users).map(Number);
                    if (!admins.includes(Number(member.id))) return warn(message, "This member isn't a ticket admin");
                    const next = admins.filter((id) => String(id) !== String(member.id));
                    if (next.length) {
                        run('UPDATE ticket_transcripts_access SET users = ? WHERE guild_id = ?', JSON.stringify(next.map(String)), message.guild.id);
                    } else {
                        run('DELETE FROM ticket_transcripts_access WHERE guild_id = ?', message.guild.id);
                    }
                    return approve(message, `Removed ${member} from the ticket admins`);
                }
            }
        }
    },

    admins: {
        aliases: [],
        data: { name: 'ticket admins', description: 'View ticket admins on your server' },
        async execute(message, args, client, config) {
            const check = first('SELECT users FROM ticket_transcripts_access WHERE guild_id = ?', message.guild.id);
            if (!check || !check.users) return warn(message, 'There is **no** ticket admin');
            const admins = JSON.parse(check.users);
            if (!admins.length) return warn(message, 'There is **no** ticket admin');
            return paginate(message, admins.map((id) => `<@${id}>`), 'Ticket admins', {
                name: message.guild.name, icon_url: message.guild.iconURL() || undefined
            });
        }
    }
};

function needBotPermChannels(message) {
    if (message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
    warn(message, 'I need the **Manage Channels** permission to do that.');
    return false;
}

async function supportRoleChange(message, topic, role, add) {
    const roleId = String(role.id);
    if (topic === 'default') {
        const row = first('SELECT support_roles FROM ticket WHERE guild_id = ?', message.guild.id);
        const parsed = T.parseRoleIds(row ? row.support_roles : null, '**default** roles');
        if (parsed.error) return warn(message, parsed.error);
        const list = parsed.ids || [];
        if (add) {
            if (list.includes(roleId)) return warn(message, `${role} is already a **default** supporter role for the ticket system`);
            list.push(roleId);
            run('UPDATE ticket SET support_roles = ? WHERE guild_id = ?', JSON.stringify(list), message.guild.id);
            return approve(message, `Added ${role} as a **default** supporter role for the ticket system`);
        }
        if (!list.includes(roleId)) return warn(message, `${role} is not a **default** support role for the ticket system`);
        run('UPDATE ticket SET support_roles = ? WHERE guild_id = ?', JSON.stringify(list.filter((id) => id !== roleId)), message.guild.id);
        return approve(message, `Removed ${role} from the **default** support roles`);
    }

    if (!topicExists(message.guild.id, topic)) return warn(message, `Topic \`${topic}\` does not exist`);
    const row = first('SELECT support_roles FROM ticket_topics WHERE guild_id = ? AND name = ?', message.guild.id, topic);
    const parsed = T.parseRoleIds(row ? row.support_roles : null, `support roles for the topic \`${topic}\``);
    if (parsed.error) return warn(message, parsed.error);
    const list = parsed.ids || [];
    if (add) {
        if (list.includes(roleId)) return warn(message, `${role} is already a support role for the topic \`${topic}\``);
        list.push(roleId);
        run('UPDATE ticket_topics SET support_roles = ? WHERE guild_id = ? AND name = ?', JSON.stringify(list), message.guild.id, topic);
        return approve(message, `Added ${role} as a support role for the topic \`${topic}\``);
    }
    if (!list.includes(roleId)) return warn(message, `${role} is not a support role for the topic \`${topic}\``);
    run('UPDATE ticket_topics SET support_roles = ? WHERE guild_id = ? AND name = ?', JSON.stringify(list.filter((id) => id !== roleId)), message.guild.id, topic);
    return approve(message, `Removed ${role} from the support roles for the topic \`${topic}\``);
}

module.exports = {
    data: { name: 'ticket', description: 'Ticket commands', usage: ',ticket <setup|send|topics|settings|...>' },
    aliases: ['t', 'tickets'],
    cooldown: 3,
    subcommands: ['setup', 'allow', 'unallow', 'claiming', 'claim', 'unclaim', 'leaderboard', 'remind', 'close', 'closerequest', 'rename', 'info', 'role', 'support', 'settings', 'status', 'move', 'limit', 'topics', 'modal', 'topic', 'config', 'send', 'blacklist', 'unblacklist', 'blacklisted', 'admin', 'admins'],
    subUsages: {
        setup: ',ticket setup',
        allow: ',ticket allow <user|role>',
        unallow: ',ticket unallow <user|role>',
        claiming: ',ticket claiming <enable|disable|privat|public>',
        claim: ',ticket claim',
        unclaim: ',ticket unclaim',
        leaderboard: ',ticket leaderboard',
        remind: ',ticket remind [reason]',
        close: ',ticket close',
        closerequest: ',ticket closerequest',
        rename: ',ticket rename <name>',
        info: ',ticket info <user>',
        role: ',ticket role <set|remove>',
        support: ',ticket support <add|remove|list>',
        settings: ',ticket settings <reset|category|logs|closed|embed|counting>',
        status: ',ticket status <add|remove|category|list>',
        move: ',ticket move <status>',
        limit: ',ticket limit <1-10>',
        topics: ',ticket topics',
        modal: ',ticket modal <add|remove|name|description|toggle|style|list>',
        topic: ',ticket topic <add|remove|name|description|emoji|channelname|channeltopic|weight|status>',
        config: ',ticket config',
        send: ',ticket send #channel [embed code]',
        blacklist: ',ticket blacklist <user> <reason>',
        unblacklist: ',ticket unblacklist <user>',
        blacklisted: ',ticket blacklisted',
        admin: ',ticket admin <add|remove>',
        admins: ',ticket admins'
    },

    async execute(message, args, client, config) {
        return sendCard(message, module.exports);
    },

    subs
};
