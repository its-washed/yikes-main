const {
    PermissionFlagsBits, ChannelType,
    ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
    ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const { first, run, query } = require('./database');
const { warn } = require('./context');
const { COLORS, EMOJIS } = require('./styles');
const { makeTranscript } = require('./transcript');
const { altConvert, scriptPayload } = require('./embedScript');

function ticketExists(message) {
    const row = first('SELECT 1 AS ok FROM ticket WHERE guild_id = ?', message.guild.id);
    if (!row) run('INSERT INTO ticket (guild_id) VALUES (?)', message.guild.id);
    return true;
}

async function needOpenTicket(message) {
    const row = first('SELECT channel_id FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        message.guild.id, message.channel.id);
    if (!row) {
        await warn(message, 'Command can only be used in a opened ticket');
        return false;
    }
    return true;
}

function parseRoleIds(raw, label) {
    if (!raw || raw === '[]') return { ids: null };
    let list;
    try {
        list = JSON.parse(raw);
    } catch (err) {
        return { error: `Invalid JSON format for ${label}.` };
    }
    if (!Array.isArray(list)) return { error: `Unexpected data format for ${label}.` };
    return { ids: list.map((entry) => String(entry)) };
}

async function supportRoleIds(message) {
    const opened = first('SELECT topic FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        message.guild.id, message.channel.id);
    const topic = opened ? opened.topic : null;
    if (topic) {
        const topicRow = first('SELECT support_roles FROM ticket_topics WHERE guild_id = ? AND name = ?',
            message.guild.id, topic);
        const topicParsed = parseRoleIds(topicRow ? topicRow.support_roles : null, 'topic support roles');
        if (topicParsed.error) return { error: topicParsed.error };
        if (topicParsed.ids) return { ids: topicParsed.ids };

        const globalRow = first('SELECT support_roles FROM ticket WHERE guild_id = ?', message.guild.id);
        const globalParsed = parseRoleIds(globalRow ? globalRow.support_roles : null, '**default** support roles');
        if (globalParsed.error) return { error: globalParsed.error };
        return { ids: globalParsed.ids || [] };
    }
    return { ids: [] };
}

async function canManageTicket(message, verb) {
    const roles = await supportRoleIds(message);
    if (roles.error) {
        await warn(message, roles.error);
        return false;
    }
    const member = message.member;
    if (roles.ids.some((id) => member.roles.cache.has(id))) return true;
    const warning = roles.ids.length
        ? `Only members with the support role (${roles.ids.map((id) => `<@&${id}>`).join(', ')}) or members with the \`manage_channels\` permission can ${verb} tickets.`
        : `Only members with the \`manage_channels\` permission can ${verb} tickets.`;
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await warn(message, warning);
        return false;
    }
    return true;
}

async function canActOnTicket(interaction, phrase) {
    const row = first('SELECT support_roles FROM ticket WHERE guild_id = ?', interaction.guild.id);
    const parsed = parseRoleIds(row ? row.support_roles : null, 'support roles');
    if (parsed.error) return { ok: false, reason: parsed.error };
    if (parsed.ids && parsed.ids.length) {
        const hasRole = parsed.ids.some((id) => interaction.member.roles.cache.has(id));
        if (!hasRole && !interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
            return {
                ok: false,
                reason: `${interaction.user}: Only members with one of the support roles or members with \`manage_channels\` permission can ${phrase}.`
            };
        }
    } else if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return { ok: false, reason: `${interaction.user}: Only members with \`manage_channels\` permission can ${phrase}.` };
    }
    return { ok: true };
}

async function supportRoleIdsForTicket(guild, ticket) {
    let raw;
    if (ticket.topic === 'default') {
        raw = (first('SELECT support_roles FROM ticket WHERE guild_id = ?', guild.id) || {}).support_roles;
    } else {
        raw = (first('SELECT support_roles FROM ticket_topics WHERE guild_id = ? AND name = ?', guild.id, ticket.topic) || {}).support_roles;
        const parsed = parseRoleIds(raw, 'topic support roles');
        if (!parsed.ids || !parsed.ids.length) {
            raw = (first('SELECT support_roles FROM ticket WHERE guild_id = ?', guild.id) || {}).support_roles;
        }
    }
    const parsed = parseRoleIds(raw, 'support roles');
    return parsed.ids || [];
}

const EMOJI = { create: '🎫', close: '🔒', open: '🔓', transcript: '📜', delete: '🗑️' };

function button(customId, label, style, emoji) {
    const builder = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
    if (emoji) builder.setEmoji(emoji);
    return builder;
}

function ticketRow(mode) {
    const row = new ActionRowBuilder();
    if (mode === 'create') {
        row.addComponents(button('ticket_open', 'Create Ticket', ButtonStyle.Primary, EMOJI.create));
    } else if (mode === 'open') {
        row.addComponents(
            button('ticket_close', 'Close', ButtonStyle.Danger, EMOJI.close),
            button('ticket_transcript', 'Transcript', ButtonStyle.Primary, EMOJI.transcript),
            button('ticket_delete', 'Delete', ButtonStyle.Secondary, EMOJI.delete)
        );
    } else if (mode === 'closed') {
        row.addComponents(
            button('ticket_reopen', 'Open', ButtonStyle.Success, EMOJI.open),
            button('ticket_transcript', 'Transcript', ButtonStyle.Primary, EMOJI.transcript),
            button('ticket_delete', 'Delete', ButtonStyle.Secondary, EMOJI.delete)
        );
    } else if (mode === 'claim') {
        row.addComponents(button('ticket_claim', 'Claim Ticket', ButtonStyle.Success));
    } else if (mode === 'request') {
        row.addComponents(button('ticket_delete_request', 'Close', ButtonStyle.Danger, EMOJI.close));
    }
    return row;
}

function ticketView(mode) {
    return { components: [ticketRow(mode)] };
}

function resolveEmoji(guild, raw) {
    if (!raw) return null;
    const value = String(raw).trim();
    const custom = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/.exec(value);
    if (custom) return { name: custom[1], id: custom[2] };
    const bare = value.replace(/^:|:$/g, '');
    const found = guild.emojis.cache.find((entry) => entry.name === bare);
    if (found) return { name: found.name, id: found.id, animated: found.animated };
    if (bare) return bare;
    return null;
}

function transcriptEmbed(guild, { id, url }, moderator, ownerId, category) {
    const icon = guild.iconURL() || undefined;
    const payload = {
        color: COLORS.NEUTRAL,
        author: { name: guild.name, icon_url: icon },
        footer: { text: guild.name, icon_url: icon },
        timestamp: new Date().toISOString(),
        fields: [
            { name: 'Ticket ID', value: url ? `[\`${id}\`](${url})` : `\`${id}\``, inline: false },
            { name: 'Moderator', value: `<@${moderator}>`, inline: true },
            { name: 'Member', value: `<@${ownerId}>`, inline: true },
            { name: 'Category', value: String(category || 'ticket').replace(/\b\w/g, (c) => c.toUpperCase()), inline: true }
        ]
    };
    return payload;
}

function transcriptComponents(url) {
    if (!url) return [];
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('View Transcript').setURL(url).setStyle(ButtonStyle.Link)
    )];
}

async function exportTranscript(guild, channel, moderatorId, ownerId, topic, opts = {}) {
    const result = await makeTranscript(channel);
    const category = topic === 'default' || !topic ? 'ticket' : topic;
    if (opts.record !== false) {
        run('INSERT INTO ticket_transcripts (guild_id, user_id, moderator_id, id, topic, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
            guild.id, ownerId || 0, moderatorId, result.id, String(category).replace(/\b\w/g, (c) => c.toUpperCase()), Date.now() / 1000);
    }

    const row = first('SELECT logs FROM ticket WHERE guild_id = ?', guild.id);
    const logs = row && row.logs ? guild.channels.cache.get(row.logs) : null;
    if (logs) {
        const embed = transcriptEmbed(guild, result, moderatorId, ownerId, category);
        await logs.send({ embeds: [embed], components: transcriptComponents(result.url), files: result.attachment ? [result.attachment] : [] }).catch(() => {});
    }
    if (ownerId) {
        try {
            const owner = await guild.members.fetch(ownerId);
            const components = transcriptComponents(result.url);
            components.unshift(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel(`Sent from server: ${guild.name}`).setStyle(ButtonStyle.Secondary).setDisabled(true)
            ));
            await owner.send({
                embeds: [transcriptEmbed(guild, result, moderatorId, ownerId, category)],
                components
            });
        } catch (err) {}
    }
    return result;
}

async function closeTicket(guild, channel, moderatorId) {
    const opened = first('SELECT user_id, topic FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        guild.id, channel.id);
    const ownerId = opened ? opened.user_id : null;
    const topic = opened ? opened.topic : null;
    const result = await exportTranscript(guild, channel, moderatorId, ownerId, topic);
    run('DELETE FROM ticket_opened WHERE guild_id = ? AND channel_id = ?', guild.id, channel.id);

    const row = first('SELECT owner_role FROM ticket WHERE guild_id = ?', guild.id);
    if (row && row.owner_role && ownerId) {
        try {
            const owner = guild.members.cache.get(String(ownerId)) || await guild.members.fetch(String(ownerId));
            const role = guild.roles.cache.get(String(row.owner_role));
            if (owner && role) await owner.roles.remove(role, 'ticket opened').catch(() => {});
        } catch (err) {}
    }
    return result;
}

const DEFAULT_OPEN_TEMPLATE = '{embed}{color: #729bb0}$v{title: {title}}$v{description: Support will be with you shortly To close the ticket please press 🗑️}$v{author: name: {user.name} ({user.id}) && icon: {user.avatar}}$v{content: {user.mention} | {support.role}}';

function fillTemplate(template, replacements) {
    let out = template;
    for (const [key, value] of Object.entries(replacements)) {
        if (value === null || value === undefined) continue;
        out = out.split(`{${key}}`).join(String(value));
    }
    return out;
}

async function fetchModuleData(guildId, topic) {
    const rows = query('SELECT name, description, code, required, style FROM ticket_modals WHERE guild_id = ? AND topic = ?', guildId, topic);
    return rows.length ? rows : null;
}

async function openTicketChannel(interaction, { title, topic, userInputs }) {
    const guild = interaction.guild;
    const user = interaction.user;
    topic = topic || 'default';

    const overwrites = [
        { id: user.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks'] },
        { id: guild.id, deny: ['ViewChannel'] }
    ];

    let category = interaction.category || null;
    if (category && (category.type !== ChannelType.GuildCategory || (category.children && category.children.size >= 50))) category = null;

    const topicRow = first('SELECT support_roles FROM ticket_topics WHERE guild_id = ? AND name = ?', guild.id, topic);
    let supportRoleIds = [];
    let supportRoleMentions = '';
    const topicParsed = parseRoleIds(topicRow ? topicRow.support_roles : null, 'topic support roles');
    if (topicParsed.error) return { error: `${interaction.user}: An unexpected data format for topic support roles.` };
    if (topicParsed.ids && topicParsed.ids.length) {
        supportRoleIds = topicParsed.ids;
    } else {
        const globalRow = first('SELECT support_roles FROM ticket WHERE guild_id = ?', guild.id);
        const globalParsed = parseRoleIds(globalRow ? globalRow.support_roles : null, 'default support roles');
        if (globalParsed.error) return { error: `${interaction.user}: An unexpected data format for default support roles.` };
        supportRoleIds = globalParsed.ids || [];
    }
    for (const roleId of supportRoleIds) {
        const role = guild.roles.cache.get(String(roleId));
        if (role) {
            overwrites.push({ id: role.id, allow: ['ViewChannel', 'SendMessages', 'AttachFiles', 'EmbedLinks', 'ManagePermissions', 'ManageMessages'] });
        }
    }
    supportRoleMentions = supportRoleIds.map((id) => `<@&${id}>`).join(' ');

    const topicRowFull = first('SELECT channel_name, channel_topic, embed FROM ticket_topics WHERE guild_id = ? AND name = ?', guild.id, topic);
    let channelName = topicRowFull ? topicRowFull.channel_name : null;
    if (channelName) {
        channelName = fillTemplate(channelName, { 'user.id': user.id, 'user.name': user.username, topic });
    } else {
        channelName = `${topic}-${user.username}`.replace(/default/g, 'ticket');
    }

    const configRow = first('SELECT counter, counter_status, owner_role, claiming, category_id, open_embed FROM ticket WHERE guild_id = ?', guild.id) || {};
    if (configRow.counter_status) {
        channelName = `ticket-${String(configRow.counter || 0).padStart(4, '0')}`;
        run('UPDATE ticket SET counter = counter + 1 WHERE guild_id = ?', guild.id);
    }

    let channelTopic = topicRowFull ? topicRowFull.channel_topic : null;
    if (channelTopic) {
        const replacements = { 'user.id': user.id, 'user.name': user.username, topic };
        if (userInputs && userInputs.formatted_code) {
            for (const [code, value] of Object.entries(userInputs.formatted_code)) replacements[code] = value;
        }
        if (userInputs && userInputs.user_inputs) {
            for (const [label, value] of Object.entries(userInputs.user_inputs)) replacements[label] = value;
        }
        channelTopic = fillTemplate(channelTopic, replacements);
    } else {
        channelTopic = `A ticket opened by ${user.username} (${user.id})`;
    }

    let channel;
    try {
        channel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: category ? category.id : null,
            topic: channelTopic,
            reason: `Ticket opened by ${user.username}`
        });
        await channel.edit({ syncPermissions: true });
        for (const overwrite of overwrites) {
            const allow = overwrite.allow || [];
            const deny = overwrite.deny || [];
            const perms = {};
            if (allow.includes('ViewChannel')) perms.ViewChannel = true;
            if (deny.includes('ViewChannel')) perms.ViewChannel = false;
            if (allow.includes('SendMessages')) perms.SendMessages = true;
            if (allow.includes('AttachFiles')) perms.AttachFiles = true;
            if (allow.includes('EmbedLinks')) perms.EmbedLinks = true;
            if (allow.includes('ManagePermissions')) perms.ManagePermissions = true;
            if (allow.includes('ManageMessages')) perms.ManageMessages = true;
            await channel.permissionOverwrites.edit(overwrite.id, perms);
        }
    } catch (err) {
        return { error: `${interaction.user}: An error occurred while creating the ticket channel\n\`\`\`${err.message}\`\`\`` };
    }

    run('INSERT INTO ticket_opened (guild_id, channel_id, user_id, topic) VALUES (?, ?, ?, ?)',
        guild.id, channel.id, user.id, topic);

    let template = topicRowFull ? topicRowFull.embed : null;
    if (!template) template = configRow.open_embed || DEFAULT_OPEN_TEMPLATE;
    const fill = { title: title || 'Ticket opened', topic: topic || 'none', 'support.role': supportRoleMentions };
    if (userInputs && userInputs.formatted_code) {
        for (const [code, value] of Object.entries(userInputs.formatted_code)) fill[code] = value;
    }
    if (userInputs && userInputs.user_inputs) {
        for (const [label, value] of Object.entries(userInputs.user_inputs)) fill[label] = value;
    }
    const payload = scriptPayload(altConvert(interaction.member || user, fillTemplate(template, fill)));
    payload.components = [ticketRow('open')];
    payload.allowedMentions = { parse: ['users', 'roles'] };

    let sent;
    try {
        sent = await channel.send(payload);
    } catch (err) {
        await channel.delete('ticket setup failed').catch(() => {});
        run('DELETE FROM ticket_opened WHERE guild_id = ? AND channel_id = ?', guild.id, channel.id);
        return { error: `${interaction.user}: An error occurred while sending the message\n\`\`\`${err.message}\`\`\`` };
    }
    await sent.pin('pinned the ticket message').catch(() => {});

    if (configRow.claiming) {
        await channel.send({
            embeds: [{ color: COLORS.NEUTRAL, description: `${EMOJIS.QUESTION} Do you want to claim this ticket from ${interaction.user}?` }],
            components: [ticketRow('claim')]
        }).catch(() => {});
    }
    return { channel, ownerRole: configRow.owner_role };
}

async function assignOwnerRole(guild, member, ownerRoleId) {
    if (!ownerRoleId) return;
    try {
        const role = guild.roles.cache.get(String(ownerRoleId));
        if (role) await member.roles.add(role, 'ticket opened').catch(() => {});
    } catch (err) {}
}

function respondError(interaction, text) {
    const payload = { embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${text}` }], ephemeral: true };
    return respond(interaction, payload);
}

async function respond(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) return await interaction.followup.send(payload);
        return await interaction.reply(payload);
    } catch (err) {}
}

async function editOriginal(interaction, payload) {
    try {
        if (interaction.deferred || interaction.replied) {
            return await interaction.followup.editMessage(interaction.message.id, payload);
        }
        return await interaction.update(payload);
    } catch (err) {
        try {
            if (interaction.deferred || interaction.replied) return await interaction.followup.editMessage(interaction.message.id, payload);
            return await interaction.response.edit(interaction.message.id, payload);
        } catch (err2) {}
    }
}

async function panelClick(interaction) {
    try {
        const configRow = first('SELECT owner_role, "limit", category_id FROM ticket WHERE guild_id = ?', interaction.guild.id);
        if (!configRow) return respondError(interaction, `${interaction.user}: Tickets module is disabled in this server.`);
        const blacklist = first('SELECT reason FROM ticket_blacklist WHERE guild_id = ? AND user_id = ?', interaction.guild.id, interaction.user.id);
        if (blacklist) return respondError(interaction, `${interaction.user}: You are blacklisted from creating tickets.\n> **Reason:** ${blacklist.reason}`);

        const topics = query('SELECT name, description, emoji FROM ticket_topics WHERE guild_id = ? AND status = ? ORDER BY weight ASC', interaction.guild.id, 1);
        const limit = Number(configRow['limit']) || 5;

        if (!topics.length) {
            const openCount = Number((first('SELECT COUNT(*) AS count FROM ticket_opened WHERE guild_id = ? AND topic = ? AND user_id = ?',
                interaction.guild.id, 'default', interaction.user.id) || {}).count || 0);
            if (openCount >= limit) return respondError(interaction, `${interaction.user}: You have reached the maximum number of open tickets`);
            const category = configRow.category_id ? interaction.guild.channels.cache.get(String(configRow.category_id)) : null;
            const moduleData = await fetchModuleData(interaction.guild.id, 'default');
            if (moduleData) return interaction.showModal(buildOpenModal('default', moduleData));
            interaction.category = category;
            const result = await openTicketChannel(interaction, { title: 'Ticket', topic: 'default' });
            if (result.error) return respondError(interaction, result.error);
            await assignOwnerRole(interaction.guild, interaction.user, configRow.owner_role);
            return respond(interaction, { embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Opened a ticket for you in ${result.channel}` }], ephemeral: true });
        }

        const options = topics.map((row) => {
            const option = { label: row.name, value: row.name };
            if (row.description) option.description = row.description.slice(0, 100);
            const emoji = resolveEmoji(interaction.guild, row.emoji);
            if (emoji) option.emoji = emoji;
            return option;
        });
        const select = new StringSelectMenuBuilder()
            .setCustomId('ticket_topic_select')
            .setPlaceholder('Choose a topic')
            .addOptions(options);
        const payload = {
            embeds: [{ color: COLORS.NEUTRAL, description: `${EMOJIS.QUESTION} ${interaction.user}: Please select a topic for your ticket` }],
            components: [new ActionRowBuilder().addComponents(select)],
            ephemeral: true
        };
        return respond(interaction, payload);
    } catch (err) {
        return respondError(interaction, `${interaction.user}: An error occurred while creating the ticket\n \`\`\`${err.message}\`\`\``);
    }
}

async function handleTopicSelect(interaction) {
    try {
        const selected = interaction.values[0];
        const openCount = Number((first('SELECT COUNT(*) AS count FROM ticket_opened WHERE guild_id = ? AND topic = ? AND user_id = ?',
            interaction.guild.id, selected, interaction.user.id) || {}).count || 0);
        const limit = Number((first('SELECT "limit" FROM ticket WHERE guild_id = ?', interaction.guild.id) || {})['limit']) || 5;
        if (openCount >= limit) {
            const payload = {
                embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: You have reached the maximum number of open tickets for the topic **${selected}**` }],
                components: [], ephemeral: true
            };
            return editOriginal(interaction, payload);
        }

        const moduleData = await fetchModuleData(interaction.guild.id, selected);
        if (moduleData) {
            try {
                return await interaction.showModal(buildOpenModal(selected, moduleData));
            } catch (err) {
                return;
            }
        }

        const topicRow = first('SELECT category_id FROM ticket_topics WHERE guild_id = ? AND name = ?', interaction.guild.id, selected);
        let category = topicRow && topicRow.category_id ? interaction.guild.channels.cache.get(String(topicRow.category_id)) : null;
        if (!category) {
            const globalCategory = (first('SELECT category_id FROM ticket WHERE guild_id = ?', interaction.guild.id) || {}).category_id;
            category = globalCategory ? interaction.guild.channels.cache.get(String(globalCategory)) : null;
        }

        const loading = {
            embeds: [{ color: COLORS.NEUTRAL, description: `${EMOJIS.LOADING} ${interaction.user}: Creating a ticket for you...` }],
            components: [], ephemeral: true
        };
        await editOriginal(interaction, loading);

        interaction.category = category;
        const result = await openTicketChannel(interaction, { title: selected, topic: selected, userInputs: { user_inputs: {}, formatted_code: {} } });
        if (result.error) return respondError(interaction, result.error);

        const configRow = first('SELECT owner_role FROM ticket WHERE guild_id = ?', interaction.guild.id) || {};
        await assignOwnerRole(interaction.guild, interaction.user, configRow.owner_role);
        const payload = { embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Opened ticket for you in ${result.channel}` }], components: [], ephemeral: true };
        return editOriginal(interaction, payload);
    } catch (err) {
        return respondError(interaction, `${interaction.user}: An error occurred while creating the ticket\n \`\`\`${err.message}\`\`\``);
    }
}

function buildOpenModal(topic, moduleData) {
    const modal = new ModalBuilder().setCustomId(`ticket_open_modal:${topic}`).setTitle('Ticket Module');
    moduleData.forEach((row, index) => {
        modal.addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId(`field_${index}`)
                .setLabel(String(row.name).slice(0, 45))
                .setPlaceholder(row.description ? String(row.description).slice(0, 99) : undefined)
                .setRequired(Boolean(row.required))
                .setStyle(String(row.style).toLowerCase() === 'long' ? TextInputStyle.Paragraph : TextInputStyle.Short)
        ));
    });
    return modal;
}

async function handleOpenModal(interaction) {
    const topic = interaction.customId.split(':')[1] || 'default';
    const moduleData = await fetchModuleData(interaction.guild.id, topic);
    if (!moduleData) return respondError(interaction, `${interaction.user}: No module data found for the selected topic.`);

    const userInputs = {};
    const formattedCode = {};
    moduleData.forEach((row, index) => {
        let value = '';
        try { value = interaction.fields.getTextInputValue(`field_${index}`); } catch (err) {}
        userInputs[row.name] = value;
        if (row.code) formattedCode[row.code] = value;
    });

    const configRow = first('SELECT owner_role, category_id FROM ticket WHERE guild_id = ?', interaction.guild.id);
    if (!configRow) return respondError(interaction, `${interaction.user}: Tickets module is disabled in this server.`);

    const topicRow = first('SELECT category_id FROM ticket_topics WHERE guild_id = ? AND name = ?', interaction.guild.id, topic);
    let category = topicRow && topicRow.category_id ? interaction.guild.channels.cache.get(String(topicRow.category_id)) : null;
    if (!category && configRow.category_id) category = interaction.guild.channels.cache.get(String(configRow.category_id)) || null;

    if (topic !== 'default') {
        const loading = { embeds: [{ color: COLORS.NEUTRAL, description: `${EMOJIS.LOADING} ${interaction.user}: Creating a ticket for you...` }], components: [] };
        await editOriginal(interaction, loading);
    }

    interaction.category = category;
    const result = await openTicketChannel(interaction, { title: topic, topic, userInputs: { user_inputs: userInputs, formatted_code: formattedCode } });
    if (result.error) return respondError(interaction, result.error);
    await assignOwnerRole(interaction.guild, interaction.user, configRow.owner_role);

    const payload = { embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Opened ticket for you in ${result.channel}` }], ephemeral: true };
    if (topic === 'default') return respond(interaction, payload);
    return editOriginal(interaction, payload);
}

function buildTopicsAddModal() {
    return new ModalBuilder()
        .setCustomId('ticket_topics_add')
        .setTitle('Add a ticket topic')
        .addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('topic name')
                .setPlaceholder("the ticket topic's name..").setRequired(true).setStyle(TextInputStyle.Short)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('description').setLabel('topic description')
                .setPlaceholder('the description of the ticket topic...').setRequired(false).setMaxLength(100).setStyle(TextInputStyle.Paragraph)),
            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('emoji').setLabel('topic emoji')
                .setPlaceholder('the emoji of the ticket topic...').setRequired(false).setMaxLength(100).setStyle(TextInputStyle.Short))
        );
}

async function handleTopicsModal(interaction, ownerId) {
    if (ownerId && String(ownerId) !== String(interaction.user.id)) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} You are **not** the author of this message` }], ephemeral: true }).catch(() => {});
    }
    const name = interaction.fields.getTextInputValue('name');
    let description = null, emoji = null;
    try { description = interaction.fields.getTextInputValue('description') || null; } catch (err) {}
    try { emoji = interaction.fields.getTextInputValue('emoji') || null; } catch (err) {}
    if (first('SELECT 1 AS ok FROM ticket_topics WHERE guild_id = ? AND name = ?', interaction.guild.id, name)) {
        return interaction.reply({
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: A topic with the name **${name}** already exists` }],
            ephemeral: true
        }).catch(() => {});
    }
    run('INSERT INTO ticket_topics (guild_id, name, description, emoji) VALUES (?, ?, ?, ?)', interaction.guild.id, name, description, emoji);
    return interaction.reply({
        embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Added new ticket topic **${name}**` }],
        ephemeral: true
    }).catch(() => {});
}

async function handleTopicsRemoveSelect(interaction, ownerId) {
    if (ownerId && String(ownerId) !== String(interaction.user.id)) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} You are **not** the author of this message` }], ephemeral: true }).catch(() => {});
    }
    const name = interaction.values[0];
    run('DELETE FROM ticket_topics WHERE guild_id = ? AND name = ?', interaction.guild.id, name);
    return interaction.reply({ content: `Removed **${name}** topic`, ephemeral: true }).catch(() => {});
}

async function handleTopicsRemoveRequest(interaction, ownerId) {
    if (ownerId && String(ownerId) !== String(interaction.user.id)) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} You are **not** the author of this message` }], ephemeral: true }).catch(() => {});
    }
    const results = query('SELECT name, description FROM ticket_topics WHERE guild_id = ?', interaction.guild.id);
    if (!results.length) return;
    const options = results.map((row) => {
        const option = { label: row.name, value: row.name };
        if (row.description) option.description = row.description.slice(0, 100);
        return option;
    });
    const select = new StringSelectMenuBuilder().setCustomId(`ticket_topics_remove_select:${ownerId || ''}`).setPlaceholder('select a topic...').addOptions(options);
    const payload = {
        embeds: [{ color: COLORS.NEUTRAL, description: '🔍 Select a topic to delete' }],
        components: [new ActionRowBuilder().addComponents(select)]
    };
    return editOriginal(interaction, payload);
}

async function handleModal(interaction) {
    const [kind, ownerId] = interaction.customId.split(':');
    if (kind === 'ticket_topics_add') return handleTopicsModal(interaction, ownerId);
    if (kind === 'ticket_open_modal') return handleOpenModal(interaction);
    return false;
}

module.exports = {
    PermissionFlagsBits,
    ChannelType,
    ticketExists,
    needOpenTicket,
    canManageTicket,
    canActOnTicket,
    supportRoleIds,
    supportRoleIdsForTicket,
    parseRoleIds,
    ticketRow,
    ticketView,
    resolveEmoji,
    transcriptEmbed,
    transcriptComponents,
    exportTranscript,
    closeTicket,
    makeTranscript,
    panelClick,
    handleTopicSelect,
    buildOpenModal,
    handleOpenModal,
    buildTopicsAddModal,
    handleTopicsModal,
    handleTopicsRemoveSelect,
    handleTopicsRemoveRequest,
    handleModal,
    openTicketChannel,
    assignOwnerRole,
    respondError
};
