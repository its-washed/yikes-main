const { ModalBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle } = require('discord.js');
const { first, run } = require('./database');
const { COLORS, EMOJIS } = require('./styles');

const LINK_REGEX = /[(http(s)?):\/\/(www\.)?a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

function confessRows() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('persistent:submit_confession').setLabel('Submit a confession!').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('persistent:reply_confession').setLabel('Reply').setStyle(ButtonStyle.Secondary)
    )];
}

function replyRows() {
    return [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('persistent:submit_reply').setLabel('Reply').setStyle(ButtonStyle.Secondary)
    )];
}

function buildModal(customId, title) {
    return new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title)
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Confession Content').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('attachment').setLabel('Attachment (Optional)').setStyle(TextInputStyle.Short).setRequired(false)
            )
        );
}

function buildReplyModal() {
    return new ModalBuilder()
        .setCustomId('confess_reply_modal')
        .setTitle('Submit a Reply')
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('content').setLabel('Reply Content').setStyle(TextInputStyle.Paragraph).setRequired(true)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder().setCustomId('attachment').setLabel('Attachment (Optional)').setStyle(TextInputStyle.Short).setRequired(false)
            )
        );
}

async function submitConfession(interaction, content, attachment) {
    attachment = attachment || '';
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const check = first('SELECT * FROM confess WHERE guild_id = ?', interaction.guild.id);
    if (!check) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: `Confessions aren't enabled in this server` }] }).catch(() => {});
    }
    if (LINK_REGEX.test(content)) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: 'You cannot use links in a confession' }] }).catch(() => {});
    }
    if (attachment && !/\.(png|jpg|jpeg|gif|webp)$/i.test(attachment)) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: 'Your attachment is not valid. The file must end in `.png`, `.jpg`, `.jpeg`, or `.gif`.' }] }).catch(() => {});
    }
    const channel = interaction.guild.channels.cache.get(String(check.channel_id));
    if (!channel) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: 'Confession channel is **invalid**' }] }).catch(() => {});
    }
    const count = (check.confession || 0) + 1;
    const embed = {
        color: COLORS.NEUTRAL,
        title: `Anonymous Confession (#${count})`,
        description: '```' + content + '```'
    };
    if (attachment) embed.image = { url: attachment };
    const sent = await channel.send({ embeds: [embed], components: confessRows() });
    await interaction.editReply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user.mention}: Sent your reply in ${sent.url}` }] }).catch(() => {});
    run('UPDATE confess SET confession = ? WHERE guild_id = ?', count, interaction.guild.id);
    run('INSERT INTO confess_members (guild_id, user_id, confession) VALUES (?, ?, ?)', interaction.guild.id, interaction.user.id, count);
}

async function submitReply(interaction, content, attachment) {
    attachment = attachment || '';
    await interaction.deferReply({ ephemeral: true }).catch(() => {});
    const check = first('SELECT * FROM confess WHERE guild_id = ?', interaction.guild.id);
    if (!check) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: `Confessions aren't enabled in this server` }] }).catch(() => {});
    }
    if (LINK_REGEX.test(content)) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: 'You cannot use links in a confession' }] }).catch(() => {});
    }
    if (attachment && !/\.(png|jpg|jpeg|gif|webp)$/i.test(attachment)) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: 'Your attachment is not valid. The file must end in `.png`, `.jpg`, `.jpeg`, or `.gif`.' }] }).catch(() => {});
    }
    const channel = interaction.guild.channels.cache.get(String(check.channel_id));
    if (!channel) {
        return interaction.editReply({ embeds: [{ color: COLORS.WARNING, description: 'Confession channel is **invalid**' }] }).catch(() => {});
    }
    const count = (check.confession || 0) + 1;
    const embed = {
        color: COLORS.NEUTRAL,
        title: `Anonymous Reply (#${count})`,
        description: '```' + content + '```'
    };
    if (attachment) embed.image = { url: attachment };

    const source = interaction.message;
    let sent = null;
    if (source) {
        let thread = source.thread;
        if (!thread && source.channel) {
            thread = await source.startThread({ name: 'Confession Replies', autoArchiveDuration: 10080 }).catch(() => null);
        }
        if (thread) sent = await thread.send({ embeds: [embed], components: replyRows() }).catch(() => null);
    }
    if (!sent) {
        sent = await channel.send({ embeds: [embed], components: replyRows() });
    }
    await interaction.editReply({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user.mention}: Sent your reply in ${sent.url}` }] }).catch(() => {});
    const ownerRow = first('SELECT user_id FROM confess_members WHERE confession = ? AND guild_id = ?', check.confession, interaction.guild.id);
    if (ownerRow) {
        const owner = interaction.guild.members.cache.get(String(ownerRow.user_id));
        if (owner) {
            owner.send({ embeds: [{ color: COLORS.NEUTRAL, description: `Someone replied to your confession in ${sent.url}` }] }).catch(() => {});
        }
    }
    run('UPDATE confess SET confession = ? WHERE guild_id = ?', count, interaction.guild.id);
    run('INSERT INTO confess_members (guild_id, user_id, confession) VALUES (?, ?, ?)', interaction.guild.id, interaction.user.id, count);
}

module.exports = { confessRows, replyRows, buildModal, buildReplyModal, submitConfession, submitReply };
