const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { first, run, addHistory } = require('./database');
const { sendModLog } = require('./moderation');
const { successEmbed, errorEmbed } = require('./embeds');
const { COLORS } = require('./styles');

const APPEAL_ID = 'persistent:appeal';
const ACCEPT_ID = 'persistent:accept';
const REJECT_ID = 'persistent:reject';
const SUBMIT_MODAL = 'appeal_submit';
const MODAL_PREFIX = 'appeal_mod:';

function appealRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(APPEAL_ID).setLabel('Appeal').setStyle(ButtonStyle.Secondary)
    );
}

function moderationRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(ACCEPT_ID).setLabel('Accept').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(REJECT_ID).setLabel('Reject').setStyle(ButtonStyle.Danger)
    );
}

function isEnabled(guildId) {
    return Boolean(first('SELECT 1 AS ok FROM appeals WHERE guild_id = ?', guildId));
}

async function ephemeral(interaction, embed) {
    try {
        if (interaction.replied || interaction.deferred) return await interaction.followup.send({ embeds: [embed], ephemeral: true });
        return await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {}
}

function fail(interaction, text) {
    return ephemeral(interaction, errorEmbed(null, text));
}

function succeed(interaction, text) {
    return ephemeral(interaction, successEmbed(null, text));
}

async function sendPunishmentDm(target, guildId, description) {
    const payload = {
        embeds: [{ color: 0xff3939, description }]
    };
    if (isEnabled(guildId)) payload.components = [appealRow()];
    const msg = await target.send(payload);
    return msg.id;
}

function isAppealButton(customId) {
    return customId === APPEAL_ID || customId === ACCEPT_ID || customId === REJECT_ID;
}

async function handleAppealButton(interaction) {
    if (interaction.customId === APPEAL_ID) {
        const record = first('SELECT * FROM history WHERE appeal_id = ?', interaction.message.id);
        if (!record) return fail(interaction, "This appeal can't be found in the database");
        const check = first('SELECT * FROM appeals WHERE guild_id = ?', record.server_id);
        if (!check) return fail(interaction, 'Appeals are not enabled in this server');
        const guild = interaction.client.guilds.cache.get(String(record.server_id));
        if (!guild) return fail(interaction, "This guild can't be found");
        const channel = guild.channels.cache.get(String(check.channel_id));
        if (!channel) return fail(interaction, "Appeals channel can't be found");
        const me = guild.members.me;
        if (!channel.permissionsFor(me) || !channel.permissionsFor(me).sendMessages) {
            return fail(interaction, "I don't have permission to send messages in the appeals channel");
        }
        const modal = new ModalBuilder()
            .setCustomId(SUBMIT_MODAL)
            .setTitle('Appeal Application')
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('text').setLabel('Reason').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ));
        return interaction.showModal(modal).catch(() => {});
    }

    const action = interaction.customId === ACCEPT_ID ? 'accept' : 'reject';
    const modal = new ModalBuilder()
        .setCustomId(MODAL_PREFIX + action)
        .setTitle(`${action === 'accept' ? 'Accept' : 'Reject'} Appeal Reason`)
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Paragraph)
                .setRequired(true).setMaxLength(1024)
        ));
    return interaction.showModal(modal).catch(() => {});
}

async function handleSubmit(interaction) {
    const reason = interaction.fields.getTextInputValue('text');
    const record = first('SELECT * FROM history WHERE appeal_id = ?', interaction.message.id);
    if (!record) return fail(interaction, "This appeal can't be found in the database");
    const check = first('SELECT * FROM appeals WHERE guild_id = ?', record.server_id);
    if (!check) return fail(interaction, 'Appeals are not enabled in this server');
    const guild = interaction.client.guilds.cache.get(String(record.server_id));
    if (!guild) return fail(interaction, "This guild can't be found");
    const channel = guild.channels.cache.get(String(check.channel_id));
    if (!channel) return fail(interaction, "Appeals channel can't be found");
    const me = guild.members.me;
    if (!channel.permissionsFor(me) || !channel.permissionsFor(me).sendMessages) {
        return fail(interaction, "I don't have permission to send messages in the appeals channel");
    }

    const embed = {
        color: COLORS.NEUTRAL,
        title: 'Appeal Application',
        author: {
            name: interaction.user.username,
            icon_url: interaction.user.displayAvatarURL({ size: 256 })
        },
        fields: [
            { name: 'User', value: interaction.user.toString(), inline: true },
            { name: 'Moderator', value: `<@${record.moderator_id}>`, inline: true },
            { name: 'Case ID', value: String(record.guild_id), inline: true },
            { name: 'Punishment', value: String(record.punishment), inline: true },
            { name: 'Reason', value: String(record.reason), inline: true },
            { name: 'Time', value: `<t:${Math.floor(Number(record.time) || 0)}:R>`, inline: true },
            { name: 'Appeal Message', value: `\`\`\`${reason}\`\`\``, inline: false }
        ]
    };

    const sent = await channel.send({ embeds: [embed], components: [moderationRow()] });
    run('UPDATE history SET appeal_msg = ?, appeal_msg_id = ? WHERE appeal_id = ?', reason, sent.id, interaction.message.id);
    await interaction.message.edit({ components: [] }).catch(() => {});
    return succeed(interaction, 'Your appeal has been submitted');
}

async function handleModerationSubmit(interaction, action) {
    const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
    const record = first('SELECT * FROM history WHERE appeal_msg_id = ?', interaction.message.id);
    if (!record) return fail(interaction, "This appeal can't be found in the database");
    const guild = interaction.client.guilds.cache.get(String(record.server_id));
    if (!guild) return fail(interaction, "This guild can't be found");

    if (action === 'reject') {
        let target = null;
        if (String(record.punishment) === 'Ban') target = await interaction.client.users.fetch(String(record.user_id)).catch(() => null);
        else target = guild.members.cache.get(String(record.user_id));
        if (target) {
            await target.send({
                embeds: [errorEmbed(null, `You have been rejected in **${guild.name}**\n> Reason: ${reason}`)]
            }).catch(() => {});
        }
        await interaction.message.edit({ components: [] }).catch(() => {});
        return succeed(interaction, `The appeal has been rejected\n> Reason: ${reason}`);
    }

    const discordReason = `[Appeal] ${reason} | ${interaction.user} (${interaction.user.id})`;
    const punishment = String(record.punishment);
    let historyId = null;
    let description = null;
    let newPunishment = null;
    let target = null;

    if (punishment === 'Ban') {
        const user = await interaction.client.users.fetch(String(record.user_id)).catch(() => null);
        if (!user) return fail(interaction, `Failed to unban <@${record.user_id}>`);
        try {
            await guild.bans.remove(user, discordReason);
        } catch (err) {
            return fail(interaction, `Failed to unban ${user}`);
        }
        target = user;
        historyId = addHistory(record.server_id, record.user_id, interaction.user.id, 'Unban', reason, Date.now() / 1000, 'None');
        description = 'unbanned';
        newPunishment = 'Unban';
        await user.send({
            embeds: [successEmbed(null, `You have been accepted in **${guild.name}**\n> Reason: ${reason}`)]
        }).catch(() => {});
    } else if (punishment === 'Mute') {
        const member = guild.members.cache.get(String(record.user_id));
        if (!member) return fail(interaction, `Failed to unmute <@${record.user_id}>`);
        try {
            await member.timeout(null, discordReason);
        } catch (err) {
            return fail(interaction, `Failed to unmute ${member}`);
        }
        target = member;
        historyId = addHistory(record.server_id, record.user_id, interaction.user.id, 'Unmute', reason, Date.now() / 1000, 'None');
        description = 'unmuted';
        newPunishment = 'Unmute';
        await member.send({
            embeds: [successEmbed(null, `You have been unmuted in **${guild.name}**\n> Reason: ${reason}`)]
        }).catch(() => {});
    } else if (punishment === 'Jail') {
        const member = guild.members.cache.get(String(record.user_id));
        if (!member) return fail(interaction, `Failed to unjail <@${record.user_id}>`);
        const jailed = first('SELECT roles FROM jail_members WHERE guild_id = ? AND user_id = ?', guild.id, member.id);
        if (!jailed) return fail(interaction, `${member} is **not** jailed`);
        const jailInfo = first('SELECT * FROM jail WHERE guild_id = ?', guild.id);
        const jailRole = jailInfo ? guild.roles.cache.get(String(jailInfo.role_id)) : null;
        if (!jailRole) return fail(interaction, 'Jail role **not found**. Please unset jail and set it back');
        let saved = [];
        try {
            saved = JSON.parse(jailed.roles || '[]');
            if (!Array.isArray(saved)) saved = [];
        } catch (err) {
            saved = [];
        }
        const me = guild.members.me;
        const manageable = saved
            .map(id => guild.roles.cache.get(String(id)))
            .filter(role => role && me && role.position < me.roles.highest.position);
        const boosterRole = guild.roles.premiumSubscriberRole;
        if (boosterRole && member.roles.cache.has(boosterRole.id) && !manageable.some(r => r.id === boosterRole.id)) {
            manageable.push(boosterRole);
        }
        try {
            await member.edit({ roles: manageable, reason: discordReason });
        } catch (err) {
            return fail(interaction, `Failed to unjail ${member}`);
        }
        run('DELETE FROM jail_members WHERE guild_id = ? AND user_id = ?', guild.id, member.id);
        target = member;
        historyId = addHistory(record.server_id, record.user_id, interaction.user.id, 'Unjail', reason, Date.now() / 1000, 'None');
        description = 'unjailed';
        newPunishment = 'Unjail';
        await member.send({
            embeds: [successEmbed(null, `You have been unjailed in **${guild.name}**\n> Reason: ${reason}`)]
        }).catch(() => {});
    } else {
        return fail(interaction, `A ${punishment} appeal can't be accepted automatically`);
    }

    await sendModLog(guild, {
        user: target,
        moderator: interaction.user,
        reason,
        description,
        punishment: newPunishment,
        historyId
    });

    await interaction.message.edit({ components: [] }).catch(() => {});
    return succeed(interaction, `The appeal has been accepted\n> Reason: ${reason}`);
}

module.exports = {
    APPEAL_ID,
    ACCEPT_ID,
    REJECT_ID,
    isAppealButton,
    sendPunishmentDm,
    isEnabled,
    handleAppealButton,
    handleSubmit,
    handleModerationSubmit
};
