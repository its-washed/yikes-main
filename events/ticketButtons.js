const { Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { first, run } = require('../utils/database');
const { COLORS, EMOJIS } = require('../utils/styles');
const { getGuildConfig } = require('../utils/config');
const T = require('../utils/tickets');

const rateLimits = new Map();

function tooFast(interaction) {
    const now = Date.now();
    const last = rateLimits.get(interaction.channel.id) || 0;
    if (now - last < 5000) return true;
    rateLimits.set(interaction.channel.id, now);
    return false;
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
    } catch (err) {}
}

async function deny(interaction, reason, phrase) {
    return respond(interaction, {
        embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${reason}` }],
        ephemeral: true
    });
}

async function handleClose(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    if (tooFast(interaction)) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: You are too fast, please wait a little bit...` }],
            ephemeral: true
        });
    }
    await editOriginal(interaction, { components: [T.ticketRow('closed')] });

    const ticket = first('SELECT user_id, topic FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        interaction.guild.id, interaction.channel.id);
    if (!ticket) return respond(interaction, { content: 'Ticket data not found.', ephemeral: true });

    const owner = interaction.guild.members.cache.get(String(ticket.user_id));
    if (owner) {
        try {
            await interaction.channel.permissionOverwrites.edit(owner.id, {
                ViewChannel: false, SendMessages: false, AttachFiles: false, EmbedLinks: false
            });
        } catch (err) {}
    }

    const closedId = (first('SELECT closed FROM ticket WHERE guild_id = ?', interaction.guild.id) || {}).closed;
    const closedCategory = closedId ? interaction.guild.channels.cache.get(String(closedId)) : null;
    const newName = `closed-${owner ? owner.username : 'user'}`.replace(/default/g, 'ticket');
    try {
        if (closedCategory && closedCategory.type === 4) {
            await interaction.channel.setName(newName);
            await interaction.channel.setParent(closedCategory.id);
        } else {
            await interaction.channel.setName(newName);
        }
    } catch (err) {}

    return respond(interaction, {
        embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Closed the ticket` }],
        components: [T.ticketRow('closed')]
    });
}

async function handleReopen(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    if (tooFast(interaction)) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: You are too fast, please wait a little bit...` }],
            ephemeral: true
        });
    }
    await editOriginal(interaction, { components: [T.ticketRow('open')] });

    const ticket = first('SELECT user_id, topic FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        interaction.guild.id, interaction.channel.id);
    if (!ticket) return respond(interaction, { content: 'Ticket data not found.', ephemeral: true });

    const owner = interaction.guild.members.cache.get(String(ticket.user_id));
    if (owner) {
        try {
            await interaction.channel.permissionOverwrites.edit(owner.id, {
                ViewChannel: true, SendMessages: true, AttachFiles: true, EmbedLinks: true
            });
        } catch (err) {}
    }

    const topicRow = first('SELECT category_id FROM ticket_topics WHERE guild_id = ? AND name = ?',
        interaction.guild.id, ticket.topic);
    const topicCategory = topicRow && topicRow.category_id ? interaction.guild.channels.cache.get(String(topicRow.category_id)) : null;
    const newName = `${ticket.topic || 'ticket'}-${owner ? owner.username : 'user'}`.replace(/default/g, 'ticket');
    try {
        if (topicCategory && topicCategory.type === 4) {
            await interaction.channel.setName(newName);
            await interaction.channel.setParent(topicCategory.id);
        } else {
            await interaction.channel.setName(newName);
        }
    } catch (err) {}

    return respond(interaction, {
        embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Opened the ticket` }]
    });
}

async function handleDelete(interaction) {
    const check = await T.canActOnTicket(interaction, 'close tickets');
    if (!check.ok) return deny(interaction, check.reason);
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_confirm_close_yes').setLabel('Yes').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ticket_confirm_close_no').setLabel('No').setStyle(ButtonStyle.Danger)
    );
    return respond(interaction, {
        embeds: [{ color: COLORS.NEUTRAL, description: `${EMOJIS.QUESTION} ${interaction.user}: Are you sure you want to close this ticket?` }],
        components: [row]
    });
}

async function handleConfirmYes(interaction) {
    await editOriginal(interaction, {
        embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${interaction.user}: Deleting this channel in 5 seconds` }],
        components: []
    });
    await T.closeTicket(interaction.guild, interaction.channel, interaction.user.id);
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
        await interaction.channel.delete('ticket closed');
    } catch (err) {}
}

async function handleConfirmNo(interaction) {
    return editOriginal(interaction, {
        embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: You changed your mind` }],
        components: []
    });
}

async function handleDeleteRequest(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    await T.closeTicket(interaction.guild, interaction.channel, interaction.user.id);
    await editOriginal(interaction, {
        embeds: [{ color: COLORS.LOADING, description: `${EMOJIS.LOADING} ${interaction.user}: Deleting this channel` }],
        components: []
    });
    try {
        await interaction.channel.delete('ticket closed');
    } catch (err) {}
}

async function handleTranscript(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    const check = await T.canActOnTicket(interaction, 'create ticket transcripts');
    if (!check.ok) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${check.reason}` }],
            ephemeral: true
        });
    }
    const opened = first('SELECT user_id, topic FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        interaction.guild.id, interaction.channel.id);
    const logsRow = first('SELECT logs FROM ticket WHERE guild_id = ?', interaction.guild.id);
    if (!logsRow || !logsRow.logs) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: Transcripts are disabled in this server\n> Enable it with \`ticket settings logs [channel]\`` }],
            ephemeral: true
        });
    }
    const result = await T.exportTranscript(interaction.guild, interaction.channel, interaction.user.id,
        opened ? opened.user_id : null, opened ? opened.topic : null, { record: false });
    const url = result.url || result.id;
    return respond(interaction, {
        embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Transcript generated [**here**](${url})` }]
    });
}

async function handleClaim(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
    const check = await T.canActOnTicket(interaction, 'claim tickets');
    if (!check.ok) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${check.reason}` }],
            ephemeral: true
        });
    }
    const ticket = first('SELECT user_id, topic, claimed_by FROM ticket_opened WHERE guild_id = ? AND channel_id = ?',
        interaction.guild.id, interaction.channel.id);
    if (!ticket) return respond(interaction, { content: 'Ticket data not found.', ephemeral: true });
    if (ticket.claimed_by !== null && ticket.claimed_by !== undefined) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: Ticket is already claimed by <@${ticket.claimed_by}>` }],
            ephemeral: true
        });
    }

    const supportRoles = await T.supportRoleIdsForTicket(interaction.guild, ticket);
    const privat = Boolean((first('SELECT claiming_privat FROM ticket WHERE guild_id = ?', interaction.guild.id) || {}).claiming_privat);
    for (const roleId of supportRoles) {
        const role = interaction.guild.roles.cache.get(String(roleId));
        if (!role) continue;
        try {
            await interaction.channel.permissionOverwrites.edit(role.id, {
                ViewChannel: !privat, SendMessages: false, AttachFiles: !privat, EmbedLinks: !privat
            }, { reason: 'Ticket claimed by a staff member' });
        } catch (err) {}
    }
    try {
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true, SendMessages: true
        }, { reason: 'Claimed the ticket' });
    } catch (err) {}

    const claimRow = first('SELECT channel_id FROM ticket_claims WHERE guild_id = ? AND channel_id = ?',
        interaction.guild.id, interaction.channel.id);
    if (!claimRow) {
        run('INSERT INTO ticket_claims (guild_id, user_id, channel_id) VALUES (?, ?, ?)',
            interaction.guild.id, interaction.user.id, interaction.channel.id);
    } else {
        run('UPDATE ticket_claims SET user_id = ? WHERE guild_id = ? AND channel_id = ?',
            interaction.user.id, interaction.guild.id, interaction.channel.id);
    }
    run('UPDATE ticket_opened SET claimed_by = ? WHERE guild_id = ? AND channel_id = ?',
        interaction.user.id, interaction.guild.id, interaction.channel.id);

    const prefix = (getGuildConfig(interaction.guild.id).prefix) || ',';
    return editOriginal(interaction, {
        embeds: [{
            color: COLORS.SUCCESS,
            description: `${EMOJIS.APPROVE} ${interaction.user}: Claimed the ticket from <@${ticket.user_id}>\n> You can unclaim it by running \`${prefix}ticket unclaim\``
        }],
        components: []
    });
}

async function handleTopicsButton(interaction) {
    const [kind, ownerId] = interaction.customId.split(':');
    if (ownerId && String(ownerId) !== String(interaction.user.id)) {
        return respond(interaction, {
            embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} You are **not** the author of this message` }],
            ephemeral: true
        });
    }
    if (kind === 'ticket_topics_add') {
        return interaction.showModal(T.buildTopicsAddModal()).catch(() => {});
    }
    if (kind === 'ticket_topics_remove') {
        return T.handleTopicsRemoveRequest(interaction, ownerId);
    }
    return false;
}

async function execute(interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.guild) return;

    const id = interaction.customId;

    if (id === 'ticket_open' || id === 'ticket_create') return T.panelClick(interaction);
    if (id === 'ticket_topic_select') return T.handleTopicSelect(interaction);
    if (id.startsWith('ticket_topics_add:') || id.startsWith('ticket_topics_remove:')) return handleTopicsButton(interaction);
    if (id.startsWith('ticket_topics_remove_select')) {
        return T.handleTopicsRemoveSelect(interaction, id.split(':')[1] || null);
    }
    if (id === 'ticket_close') return handleClose(interaction);
    if (id === 'ticket_reopen') return handleReopen(interaction);
    if (id === 'ticket_delete') return handleDelete(interaction);
    if (id === 'ticket_confirm_close_yes') return handleConfirmYes(interaction);
    if (id === 'ticket_confirm_close_no') return handleConfirmNo(interaction);
    if (id === 'ticket_delete_request') return handleDeleteRequest(interaction);
    if (id === 'ticket_transcript') return handleTranscript(interaction);
    if (id === 'ticket_claim') return handleClaim(interaction);
}

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    execute
};
