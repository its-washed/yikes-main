const { PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } = require('discord.js');
const { first, run } = require('./database');
const { COLORS, EMOJIS } = require('./styles');
const { vcRenameAllowed } = require('./predicates');

async function vcTask(interaction) {
    const voice = interaction.member && interaction.member.voice ? interaction.member.voice.channel : null;
    if (!voice) return [false, 'You are **not** in a voice channel'];
    const cfg = first('SELECT 1 AS ok FROM voicemaster WHERE guild_id = ?', interaction.guild.id);
    if (!cfg) return [false, 'VoiceMaster is **not** configured'];
    const row = first('SELECT user_id FROM voicemaster_channels WHERE voice = ?', voice.id);
    if (!row) return [false, 'This voice channel is **not** managed by the system'];
    if (String(row.user_id) !== interaction.user.id) return [false, 'You are **not** the **owner** of this voice channel'];
    return [true, null];
}

function warnEphemeral(interaction, text) {
    return interaction.reply({
        embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${interaction.user}: ${text}` }],
        ephemeral: true
    }).catch(() => {});
}

function resultEphemeral(interaction, color, emoji, text) {
    const payload = { embeds: [{ color, description: `${emoji} ${interaction.user}: ${text}` }], ephemeral: true };
    if (interaction.deferred || interaction.replied) return interaction.followup.send(payload).catch(() => {});
    return interaction.reply(payload).catch(() => {});
}

function containsBannedWord(words, text) {
    const lower = String(text || '').toLowerCase();
    return words.some(word => word && lower.includes(word));
}

async function handleClaim(interaction) {
    const voice = interaction.member && interaction.member.voice ? interaction.member.voice.channel : null;
    if (!voice) return warnEphemeral(interaction, 'You are **not** in a voice channel');
    const row = first('SELECT user_id FROM voicemaster_channels WHERE voice = ?', voice.id);
    if (!row) return warnEphemeral(interaction, 'This voice channel is not managed by the system');
    const owner = interaction.guild.members.cache.get(String(row.user_id));
    if (owner && voice.members.has(owner.id)) return warnEphemeral(interaction, 'The owner is still in the voice channel');
    run('UPDATE voicemaster_channels SET user_id = ? WHERE voice = ?', interaction.user.id, voice.id);
    if (owner) {
        await voice.permissionOverwrites.edit(owner, { ViewChannel: null, Connect: null }, { reason: 'Voice channel claimed' }).catch(() => {});
    }
    await voice.permissionOverwrites.edit(interaction.user, { ViewChannel: true, Connect: true }, { reason: 'Voice channel claimed' }).catch(() => {});
    return resultEphemeral(interaction, COLORS.SUCCESS, EMOJIS.APPROVE, 'You are the new owner of the voice channel');
}

async function handleInfo(interaction) {
    const voice = interaction.member.voice.channel;
    const row = first('SELECT user_id FROM voicemaster_channels WHERE voice = ?', voice.id);
    if (!row) return warnEphemeral(interaction, 'This voice channel is **not** managed by the system');
    const owner = interaction.guild.members.cache.get(String(row.user_id));
    const permitted = [];
    for (const member of interaction.guild.members.cache.values()) {
        const perms = voice.permissionsFor(member);
        if (perms && perms.has(PermissionFlagsBits.Connect)) permitted.push(`${member}`);
    }
    let description = `**Owner:** ${owner || `<@!${row.user_id}>`} (\`${row.user_id}\`)\n**Created:** <t:${Math.floor(voice.createdTimestamp / 1000)}:R>\n**Bitrate:** ${voice.bitrate / 1000}kbps\n**Permitted:** ${permitted.join(', ') || 'N/A'}`;
    if (description.length > 4096) description = description.slice(0, 4093) + '...';
    return interaction.followup.send({
        embeds: [{
            color: COLORS.NEUTRAL,
            title: voice.name,
            description,
            author: { name: interaction.user.username, icon_url: interaction.user.displayAvatarURL() },
            thumbnail: owner ? { url: owner.user.displayAvatarURL() } : undefined
        }],
        ephemeral: true
    }).catch(() => {});
}

async function handleManageAccess(interaction) {
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('vm_permit').setLabel('Permit').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('vm_unpermit').setLabel('Unpermit').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('vm_kick').setLabel('Kick').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({
        embeds: [{ color: COLORS.NEUTRAL, description: `${interaction.user}: Choose an action to perform on a member in the voice channel` }],
        components: [row],
        ephemeral: true
    }).catch(() => {});
}

async function handleSelectionPrompt(interaction, kind) {
    if (kind === 'kick') {
        const voice = interaction.member.voice.channel;
        if (voice && voice.members.size === 1) return warnEphemeral(interaction, 'You are the only member in the voice channel');
    }
    const select = new UserSelectMenuBuilder()
        .setCustomId(`vm_select_${kind}`)
        .setPlaceholder(`Who do you want to ${kind}?`)
        .setMinValues(1)
        .setMaxValues(5);
    const row = new ActionRowBuilder().addComponents(select);
    return interaction.update({
        embeds: [{ color: COLORS.NEUTRAL, description: `${interaction.user}: Use the dropdown menu to select the members` }],
        components: [row]
    }).catch(() => {});
}

async function handleSelect(interaction, kind) {
    const [ok, reason] = await vcTask(interaction);
    if (!ok) return warnEphemeral(interaction, reason);
    const voice = interaction.member.voice.channel;
    const members = interaction.values
        .map(id => interaction.guild.members.cache.get(id))
        .filter(Boolean);
    if (!members.length) return warnEphemeral(interaction, 'No valid members were selected');
    const names = members.map(m => `${m}`);
    if (kind === 'permit') {
        for (const member of members) {
            await voice.permissionOverwrites.edit(member, { Connect: true, ViewChannel: true }, { reason: `Permitted by ${interaction.user.tag}` }).catch(() => {});
        }
        return interaction.update({
            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: ${names.join(', ')} have been permitted` }],
            components: []
        }).catch(() => {});
    }
    if (kind === 'unpermit') {
        for (const member of members) {
            await voice.permissionOverwrites.edit(member, { Connect: false }, { reason: `Unpermitted by ${interaction.user.tag}` }).catch(() => {});
        }
        return interaction.update({
            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: ${names.join(', ')} have been unpermitted` }],
            components: []
        }).catch(() => {});
    }
    if (kind === 'kick') {
        for (const member of members) {
            await voice.permissionOverwrites.edit(member, { Connect: false }, { reason: `Kicked by ${interaction.user.tag}` }).catch(() => {});
            await member.voice.disconnect(`Kicked from voice channel by ${interaction.user.tag}`).catch(() => {});
        }
        return interaction.update({
            embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: ${names.join(', ')} have been kicked` }],
            components: []
        }).catch(() => {});
    }
    return warnEphemeral(interaction, 'Unknown selection action');
}

async function handleVmRenameModal(interaction) {
    const voice = interaction.member && interaction.member.voice ? interaction.member.voice.channel : null;
    if (!voice) return warnEphemeral(interaction, 'You are **not** in a voice channel');
    const name = String(interaction.fields.getTextInputValue('name') || '').trim();
    if (!name) return warnEphemeral(interaction, 'You must provide a name');
    const cfg = first('SELECT banned_words, savesettings FROM voicemaster WHERE guild_id = ?', interaction.guild.id);
    if (cfg && cfg.banned_words) {
        let words = [];
        try {
            const parsed = JSON.parse(cfg.banned_words);
            if (Array.isArray(parsed)) words = parsed;
        } catch (err) {}
        if (containsBannedWord(words, name)) {
            return warnEphemeral(interaction, 'This voice channel name contains a prohibited word. Please choose a different name.');
        }
    }
    if (!vcRenameAllowed(voice.id)) {
        return warnEphemeral(interaction, 'You renamed this channel too many times in a short amount of time');
    }
    try {
        await voice.edit({ name, reason: `Voice channel name changed by ${interaction.user.tag}` });
    } catch (err) {
        if (err.code === 50035) return warnEphemeral(interaction, 'Name contains words not allowed for servers in Server Discover');
        return warnEphemeral(interaction, `Failed to rename the channel\n\`\`\`\`${err.message}\`\`\`\``);
    }
    if (cfg && cfg.savesettings) {
        run('INSERT OR REPLACE INTO voicemaster_names (guild_id, user_id, name) VALUES (?, ?, ?)', interaction.guild.id, interaction.user.id, name);
    }
    return resultEphemeral(interaction, COLORS.SUCCESS, EMOJIS.APPROVE, `Voice channel name changed to **${name}**`);
}

async function handleVmInteraction(interaction) {
    const action = interaction.customId.replace('vm_', '');

    if (action.startsWith('select_')) {
        return handleSelect(interaction, action.slice('select_'.length));
    }

    if (action === 'claim') return handleClaim(interaction);

    if (action === 'manage_access') {
        const [ok, reason] = await vcTask(interaction);
        if (!ok) return warnEphemeral(interaction, reason);
        return handleManageAccess(interaction);
    }

    if (action === 'permit' || action === 'unpermit' || action === 'kick') {
        const [ok, reason] = await vcTask(interaction);
        if (!ok) return warnEphemeral(interaction, reason);
        return handleSelectionPrompt(interaction, action);
    }

    if (action === 'rename') {
        const [ok, reason] = await vcTask(interaction);
        if (!ok) return warnEphemeral(interaction, reason);
        const modal = new ModalBuilder()
            .setCustomId('vm_rename')
            .setTitle('rename your voice channel')
            .addComponents(new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('voice channel name')
                    .setPlaceholder('the new voice channel name...')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ));
        return interaction.showModal(modal).catch(() => {});
    }

    const [ok, reason] = await vcTask(interaction);
    if (!ok) return warnEphemeral(interaction, reason);
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true }).catch(() => {});

    const voice = interaction.member.voice.channel;
    const lockLike = { lock: false, unlock: true, hide: false, reveal: true };

    if (action === 'lock' || action === 'unlock') {
        await voice.permissionOverwrites.edit(interaction.guild.id, { Connect: lockLike[action] }, { reason: `Channel ${action}ed by ${interaction.user.tag}` }).catch(() => {});
        return resultEphemeral(interaction, COLORS.NEUTRAL, EMOJIS.QUESTION, `${action === 'lock' ? 'Locked' : 'Unlocked'} ${voice}`);
    }
    if (action === 'hide' || action === 'reveal') {
        await voice.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: lockLike[action] }, { reason: `Channel ${action === 'hide' ? 'hidden' : 'revealed'} by ${interaction.user.tag}` }).catch(() => {});
        return resultEphemeral(interaction, COLORS.NEUTRAL, EMOJIS.QUESTION, `${action === 'hide' ? 'Hidden' : 'Revealed'} ${voice}`);
    }
    if (action === 'increase' || action === 'limit') {
        const newLimit = voice.userLimit >= 99 ? 99 : voice.userLimit + 1;
        if (voice.userLimit === 99) return warnEphemeral(interaction, "Limit can't be higher than 99");
        await voice.setUserLimit(newLimit, `Channel user limit increased by ${interaction.user.tag}`).catch(() => {});
        return resultEphemeral(interaction, COLORS.NEUTRAL, EMOJIS.QUESTION, `Increased ${voice}'s member limit`);
    }
    if (action === 'decrease') {
        if (voice.userLimit === 0) return warnEphemeral(interaction, "Limit can't be lower than 0");
        await voice.setUserLimit(voice.userLimit - 1, `Channel user limit decreased by ${interaction.user.tag}`).catch(() => {});
        return resultEphemeral(interaction, COLORS.NEUTRAL, EMOJIS.QUESTION, `Decreased ${voice}'s member limit`);
    }
    if (action === 'info') return handleInfo(interaction);
    if (action === 'transfer') return warnEphemeral(interaction, 'Use `,voice transfer its_washed` to transfer.');
    return warnEphemeral(interaction, 'Unknown button action');
}

module.exports = { handleVmInteraction, handleVmRenameModal };
