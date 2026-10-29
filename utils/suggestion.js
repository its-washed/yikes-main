const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { first, run } = require('./database');
const { COLORS, EMOJIS } = require('./styles');

const lastUpdateTimes = new Map();

function suggestionRows() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('persistent:upvote_suggestion').setLabel('Upvote').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('persistent:downvote_suggestion').setLabel('Downvote').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('persistent:create_suggestion').setLabel('Create Suggestion').setStyle(ButtonStyle.Primary)
    )];
}

function suggestionEmbed(user, content, upvotes = 0, downvotes = 0) {
    const avatar = user.displayAvatarURL();
    return {
        color: COLORS.WARNING,
        title: '💡 New Suggestion',
        author: { name: `${user.username} (${user.id})`, icon_url: avatar },
        fields: [
            { name: '> Suggestion', value: '```' + content + '```', inline: false },
            { name: '> Upvotes', value: '```' + upvotes + '```', inline: true },
            { name: '> Downvotes', value: '```' + downvotes + '```', inline: true }
        ],
        footer: { text: `${user.username} - Use ;suggest for suggestions`, icon_url: avatar },
        thumbnail: { url: avatar },
        timestamp: new Date().toISOString()
    };
}

async function handleVote(interaction, voteType) {
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const suggestion = first('SELECT author_id, content, upvotes, downvotes FROM suggestions WHERE message_id = ?', interaction.message.id);
    if (!suggestion) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user.mention}: This suggestion is no longer available` }] }).catch(() => {});
    }
    const upvotes = new Set(JSON.parse(suggestion.upvotes || '[]'));
    const downvotes = new Set(JSON.parse(suggestion.downvotes || '[]'));
    const userId = interaction.user.id;

    if (upvotes.has(userId) && voteType === 'upvote') {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user.mention}: You have already **upvoted** this suggestion.` }] }).catch(() => {});
    }
    if (downvotes.has(userId) && voteType === 'downvote') {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user.mention}: You have already **downvoted** this suggestion.` }] }).catch(() => {});
    }

    if (voteType === 'upvote') {
        downvotes.delete(userId);
        upvotes.add(userId);
    } else {
        upvotes.delete(userId);
        downvotes.add(userId);
    }
    run('UPDATE suggestions SET upvotes = ?, downvotes = ? WHERE message_id = ?',
        JSON.stringify([...upvotes]), JSON.stringify([...downvotes]), interaction.message.id);

    const currentTime = Date.now() / 1000;
    const lastUpdate = lastUpdateTimes.get(interaction.message.id) || 0;
    let note = '';
    if (currentTime - lastUpdate >= 10) {
        lastUpdateTimes.set(interaction.message.id, currentTime);
        let author = interaction.client.users.cache.get(String(suggestion.author_id));
        if (!author) author = await interaction.client.users.fetch(String(suggestion.author_id)).catch(() => null);
        if (author && interaction.message.embeds[0]) {
            const original = interaction.message.embeds[0].data;
            const embed = { ...original };
            embed.author = { name: `${author.username} (${author.id})`, icon_url: author.displayAvatarURL() };
            embed.fields = [
                { name: '> Suggestion', value: '```' + suggestion.content + '```', inline: false },
                { name: '> Upvotes', value: '```' + upvotes.size + '```', inline: true },
                { name: '> Downvotes', value: '```' + downvotes.size + '```', inline: true }
            ];
            embed.footer = { text: `${author.username} - Use ;suggest for suggestions`, icon_url: author.displayAvatarURL() };
            embed.thumbnail = { url: author.displayAvatarURL() };
            embed.timestamp = interaction.message.createdAt.toISOString();
            await interaction.message.edit({ embeds: [embed] }).catch(() => {});
        }
    } else {
        note = '(Message will not update instant, because ratelimit)';
    }
    return interaction.editReply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user.mention}: Your **${voteType}** has been recorded ${note}` }] }).catch(() => {});
}

async function openCreateModal(interaction) {
    const check = first('SELECT suggestion FROM modules WHERE guild_id = ?', interaction.guild.id);
    if (!check || !check.suggestion) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: `Suggestion module is **not** enabled` }], ephemeral: true }).catch(() => {});
    }
    const blacklist = first('SELECT reason FROM suggestions_blacklist WHERE guild_id = ? AND user_id = ?', interaction.guild.id, interaction.user.id);
    if (blacklist) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: `You got blacklisted from creating suggestion.\n> **Reason:** ${blacklist.reason}` }], ephemeral: true }).catch(() => {});
    }
    const modal = new ModalBuilder()
        .setCustomId('suggestion_create')
        .setTitle('Create a New Suggestion')
        .addComponents(new ActionRowBuilder().addComponents(
            new TextInputBuilder()
                .setCustomId('suggestion')
                .setLabel('Suggestion')
                .setPlaceholder('Enter your suggestion here...')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
        ));
    await interaction.showModal(modal).catch(() => {});
}

async function handleCreateSubmit(interaction) {
    const content = interaction.fields.getTextInputValue('suggestion');
    const settings = first('SELECT channel_id FROM suggestions_module WHERE guild_id = ?', interaction.guild.id);
    if (!settings || !settings.channel_id) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: 'Suggestion channel is not set up correctly.' }], ephemeral: true }).catch(() => {});
    }
    const channel = interaction.client.channels.cache.get(String(settings.channel_id));
    if (!channel) {
        return interaction.reply({ embeds: [{ color: COLORS.WARNING, description: 'Suggestion channel not found or bot lacks permissions to access it.' }], ephemeral: true }).catch(() => {});
    }
    const sent = await channel.send({ embeds: [suggestionEmbed(interaction.user, content)], components: suggestionRows() });
    run('INSERT INTO suggestions (guild_id, channel_id, message_id, author_id, content) VALUES (?, ?, ?, ?, ?)',
        interaction.guild.id, sent.channel.id, sent.id, interaction.user.id, content);
    const threadRow = first('SELECT threads FROM suggestions_module WHERE guild_id = ?', interaction.guild.id);
    if (threadRow && threadRow.threads) {
        sent.startThread({ name: `Discussion for Suggestion from ${interaction.user.username}`, autoArchiveDuration: 10080 }).catch(() => {});
    }
    return interaction.reply({ embeds: [{ color: COLORS.SUCCESS, description: `Your [**suggestion**](${sent.url}) has been submitted!` }], ephemeral: true }).catch(() => {});
}

module.exports = { handleVote, openCreateModal, handleCreateSubmit, suggestionRows, suggestionEmbed };
