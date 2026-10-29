const { ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { query, first, run } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

const pending = new Map();

function parseJson(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
        return fallback;
    }
}

function questionsOf(row) {
    const parsed = parseJson(row.questions, []);
    return Array.isArray(parsed) ? parsed : [];
}

function rolesOf(row) {
    const parsed = parseJson(row.roles, []);
    return Array.isArray(parsed) ? parsed.map(String) : [];
}

function takePending(id) {
    const entry = pending.get(id) || null;
    if (entry) pending.delete(id);
    return entry;
}

function prunePending() {
    const now = Date.now();
    for (const [key, value] of pending.entries()) {
        if (value.expires <= now) pending.delete(key);
    }
}

function warning(description) {
    return createEmbed({ color: COLORS.WARNING, description });
}

module.exports = {
    data: { name: 'apply', description: 'Apply for an open application', usage: ',apply' },
    aliases: [],
    cooldown: 10,

    execute: async (message, args, client) => {
        prunePending();
        const applications = query('SELECT * FROM applications WHERE guild_id = ? AND status = ?', message.guild.id, 1);
        if (!applications.length) return warn(message, 'No open applications found.');

        const menu = new StringSelectMenuBuilder()
            .setCustomId('apply_select')
            .setPlaceholder('Choose an application');
        applications.slice(0, 25).forEach((application, index) => {
            menu.addOptions({ label: String(application.name).slice(0, 100), value: String(index) });
        });

        const sent = await message.reply({
            embeds: [createEmbed({ color: COLORS.NEUTRAL, description: `📋 ${message.author}: Select an application to apply for:` })],
            components: [new ActionRowBuilder().addComponents(menu)]
        });

        const collector = sent.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });
        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                return interaction.reply({ content: 'You are not the **author** of this embed', ephemeral: true }).catch(() => {});
            }
            const application = applications[Number(interaction.values[0])];
            if (!application) {
                return interaction.reply({ content: 'That application no longer exists.', ephemeral: true }).catch(() => {});
            }
            const questions = questionsOf(application);
            if (!questions.length) {
                return interaction.reply({ content: 'That application has no questions yet.', ephemeral: true }).catch(() => {});
            }
            const id = 'apply_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
            pending.set(id, { guildId: message.guild.id, name: application.name, userId: message.author.id, expires: Date.now() + 300000 });
            const modal = new ModalBuilder()
                .setCustomId(id)
                .setTitle(`Application: ${application.name}`.slice(0, 45));
            questions.slice(0, 5).forEach((question, index) => {
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId(`q${index}`)
                        .setLabel(String(question).slice(0, 45))
                        .setMaxLength(1000)
                        .setRequired(true)
                        .setStyle(TextInputStyle.Short)
                ));
            });
            await interaction.showModal(modal).catch(() => {});
        });
        collector.on('end', () => {
            sent.edit({ components: [] }).catch(() => {});
        });
        return sent;
    },

    handleSubmit: async (interaction) => {
        const entry = takePending(interaction.customId);
        if (!entry) {
            return interaction.reply({ content: 'This form has expired.', ephemeral: true }).catch(() => {});
        }
        if (interaction.user.id !== entry.userId) {
            return interaction.reply({ content: 'This form was not meant for you.', ephemeral: true }).catch(() => {});
        }
        const application = first('SELECT * FROM applications WHERE guild_id = ? AND name = ?', entry.guildId, entry.name);
        if (!application) {
            return interaction.update({ embeds: [warning(`${EMOJIS.WARNING} ${interaction.user}: That application no longer exists.`)], components: [] }).catch(() => {});
        }

        const questions = questionsOf(application);
        const responses = {};
        questions.slice(0, 5).forEach((question, index) => {
            responses[question] = interaction.fields.getTextInputValue(`q${index}`);
        });

        const id = Math.floor(Math.random() * 900000) + 100000;
        run('INSERT INTO application_responses (id, guild_id, user_id, application_name, responses, upvotes, downvotes) VALUES (?, ?, ?, ?, ?, 0, 0)',
            id, entry.guildId, entry.userId, entry.name, JSON.stringify(responses));

        const channelId = application.channel_id;
        if (!channelId) {
            return interaction.update({ embeds: [warning(`${EMOJIS.WARNING} ${interaction.user}: No channel set for this application.`)], components: [] }).catch(() => {});
        }
        const channel = interaction.guild.channels.cache.get(String(channelId)) ||
            await interaction.client.channels.fetch(String(channelId)).catch(() => null);
        if (!channel) {
            return interaction.update({ embeds: [warning(`${EMOJIS.WARNING} ${interaction.user}: The designated channel does not exist.`)], components: [] }).catch(() => {});
        }

        const requiredLevel = Number(application.level || 0);
        const userLevel = first('SELECT * FROM level_user WHERE guild_id = ? AND user_id = ?', entry.guildId, entry.userId);
        if (!userLevel || Number(userLevel.level || 0) < requiredLevel) {
            return interaction.update({
                embeds: [warning(`${EMOJIS.WARNING} ${interaction.user}: You do not meet the requirements to apply for this application.\n> You need to be level ${requiredLevel}.`)],
                components: []
            }).catch(() => {});
        }

        const embed = createEmbed({
            color: COLORS.NEUTRAL,
            title: `📩 New Application: ${application.name}`,
            fields: [
                { name: 'User', value: `${interaction.user}`, inline: true },
                { name: 'Created', value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true }
            ]
        });
        embed.setAuthor({ name: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ size: 256 }) });
        for (const [question, answer] of Object.entries(responses)) {
            embed.addFields({ name: String(question).slice(0, 256), value: `\`\`\`${String(answer).slice(0, 900)}\`\`\``, inline: false });
        }

        const moderationRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('persistent:app_upvote').setEmoji('⬆').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('persistent:app_downvote').setEmoji('⬇').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('persistent:app_approve').setLabel('Approve').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('persistent:app_deny').setLabel('Deny').setStyle(ButtonStyle.Danger)
        );

        const sent = await channel.send({ embeds: [embed], components: [moderationRow] }).catch(() => null);
        if (!sent) {
            return interaction.update({ embeds: [warning(`${EMOJIS.WARNING} ${interaction.user}: I could not send the application to that channel.`)], components: [] }).catch(() => {});
        }
        run('UPDATE application_responses SET id = ? WHERE id = ?', sent.id, id);

        return interaction.update({
            embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Your application for \`${application.name}\` has been submitted.` })],
            components: []
        }).catch(() => {});
    },

    handleModeration: async (interaction) => {
        if (!interaction.member || !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: 'You need the **Manage Server** permission to do that.', ephemeral: true }).catch(() => {});
        }
        const action = interaction.customId.replace('persistent:app_', '');
        const response = first('SELECT * FROM application_responses WHERE id = ?', interaction.message.id);
        if (!response) {
            return interaction.reply({ content: 'This application has already been handled.', ephemeral: true }).catch(() => {});
        }
        const application = first('SELECT * FROM applications WHERE guild_id = ? AND name = ?', response.guild_id, response.application_name);

        if (action === 'upvote' || action === 'downvote') {
            const existing = first('SELECT * FROM application_votes WHERE message_id = ? AND user_id = ?', interaction.message.id, interaction.user.id);
            let upvotes = Number(response.upvotes || 0);
            let downvotes = Number(response.downvotes || 0);
            if (existing && existing.vote === action) {
                run('DELETE FROM application_votes WHERE message_id = ? AND user_id = ?', interaction.message.id, interaction.user.id);
                if (action === 'upvote') upvotes--; else downvotes--;
            } else if (existing) {
                run('UPDATE application_votes SET vote = ? WHERE message_id = ? AND user_id = ?', action, interaction.message.id, interaction.user.id);
                if (action === 'upvote') { upvotes++; downvotes--; } else { downvotes++; upvotes--; }
            } else {
                run('INSERT INTO application_votes (message_id, user_id, vote) VALUES (?, ?, ?)', interaction.message.id, interaction.user.id, action);
                if (action === 'upvote') upvotes++; else downvotes++;
            }
            upvotes = Math.max(0, upvotes);
            downvotes = Math.max(0, downvotes);
            run('UPDATE application_responses SET upvotes = ?, downvotes = ? WHERE id = ?', upvotes, downvotes, interaction.message.id);
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFooter({ text: `⬆ ${upvotes} • ⬇ ${downvotes}` });
            return interaction.update({ embeds: [embed] }).catch(() => {});
        }

        const member = interaction.guild.members.cache.get(String(response.user_id)) ||
            await interaction.guild.members.fetch(String(response.user_id)).catch(() => null);
        if (!member) {
            return interaction.reply({ content: 'The applicant is no longer in this server.', ephemeral: true }).catch(() => {});
        }

        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .addFields({ name: 'Status', value: action === 'approve' ? `Approved by ${interaction.user}` : `Rejected by ${interaction.user}` });

        if (action === 'approve' && application) {
            for (const roleId of rolesOf(application)) {
                const role = interaction.guild.roles.cache.get(roleId);
                if (role) await member.roles.add(role, `Application ${application.name} approved by ${interaction.user}`).catch(() => {});
            }
        }

        if (action === 'approve') {
            await member.send(`Your application for \`${response.application_name}\` has been **approved** in **${interaction.guild.name}**.`).catch(() => {});
        } else {
            await member.send(`Your application for \`${response.application_name}\` has been **rejected** in **${interaction.guild.name}**.`).catch(() => {});
        }

        run('DELETE FROM application_votes WHERE message_id = ?', interaction.message.id);
        run('DELETE FROM application_responses WHERE id = ?', interaction.message.id);
        return interaction.update({ embeds: [embed], components: [] }).catch(() => {});
    }
};
