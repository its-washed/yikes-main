const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { first, run } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { blacklisted, warnMedia, onRatelimit } = require('../../utils/media');
const { getJson } = require('../../utils/social');
const { sendCard } = require('../../utils/helpCard');
const { createEmbed } = require('../../utils/embeds');
const { COLORS, EMOJIS } = require('../../utils/styles');

const pending = new Map();

function cocHeaders() {
    const token = process.env.CLASHOFCLANS_TOKEN || process.env.CLASHOFCLANS_API_KEY || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function prunePending() {
    const now = Date.now();
    for (const [key, value] of pending.entries()) {
        if (value.expires <= now) pending.delete(key);
    }
}

function authorOf(message) {
    return { name: message.author.username, icon_url: message.author.displayAvatarURL() };
}

async function playerData(message, token) {
    let tag = String(token || '').trim().replace(/^#/, '');
    if (!tag) {
        const check = first('SELECT * FROM clashofclans WHERE user_id = ?', message.author.id);
        if (check) tag = String(check.tag);
        else return { error: 'You need to provide a tag or verify your account first' };
    }
    const data = await getJson(`https://api.clashofclans.com/v1/players/%23${encodeURIComponent(tag)}`);
    if (!data || data.reason) return { error: `Couldn't get information about **${tag}**` };
    return { data, tag };
}

function townHallEmoji(level) {
    const map = { 8: '<:th8:0>', 9: '<:th9:0>', 10: '<:th10:0>', 11: '<:th11:0>', 12: '<:th12:0>', 13: '<:th13:0>', 14: '<:th14:0>', 15: '<:th15:0>', 16: '<:th16:0>', 17: '<:th17:0>' };
    return map[level] || '';
}

module.exports = {
    data: { name: 'clashofclans', description: 'Clash of Clans related commands', usage: ',clashofclans <verify|info|heroes>' },
    aliases: ['coc'],
    cooldown: 5,
    subcommands: ['verify', 'info', 'heroes'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: verify, info, heroes');
        return sendCard(message, module.exports);
    },
    subs: {
        verify: {
            aliases: [],
            data: { name: 'clashofclans verify', description: 'Verify your Clash of Clans account', usage: ',clashofclans verify <tag>' },
            execute: async (message, args) => {
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                prunePending();
                const check = first('SELECT * FROM clashofclans WHERE user_id = ?', message.author.id);
                if (check) {
                    const linked = await getJson(`https://api.clashofclans.com/v1/players/%23${encodeURIComponent(String(check.tag))}`, cocHeaders());
                    if (linked && !linked.reason) {
                        return warnMedia(message, `Your Discord account is already linked with **${linked.name} | ${linked.tag}**`);
                    }
                }
                let tag = String(args[0] || '').trim();
                if (!tag) return warn(message, 'Usage: `clashofclans verify <tag>`');
                if (tag.startsWith('#')) tag = tag.slice(1);
                const data = await getJson(`https://api.clashofclans.com/v1/players/%23${encodeURIComponent(tag)}`, cocHeaders());
                if (!data || data.reason) return warnMedia(message, `Couldn't get information about **${tag}**`);

                const embed = createEmbed({
                    color: COLORS.NEUTRAL,
                    title: 'Verification',
                    description: 'You need to enter your API token to verify your Clash of Clans account\n> You can find your API token by going into [Settings -> More Settings](https://link.clashofclans.com/en/?action=OpenMoreSettings) and scrolling down.',
                    fields: [
                        { name: 'Tag', value: tag, inline: true },
                        { name: 'Name', value: data.name, inline: true },
                        { name: 'Level', value: String(data.expLevel), inline: true }
                    ],
                    footer: { text: 'You need to verify in the next 2 minutes, otherwise the verification will be cancelled.' }
                });

                const sent = await message.reply({
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('coc_verify').setLabel('Verification').setStyle(ButtonStyle.Primary)
                    )]
                });

                const collector = sent.createMessageComponentCollector({ time: 120000 });
                collector.on('collect', async interaction => {
                    if (interaction.user.id !== message.author.id) {
                        return interaction.reply({ content: 'You are not the author of this embed', ephemeral: true }).catch(() => {});
                    }
                    const id = 'coc_verify_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
                    pending.set(id, { tag, userId: message.author.id, expires: Date.now() + 120000 });
                    const modal = new ModalBuilder()
                        .setCustomId(id)
                        .setTitle('Enter Verification Code')
                        .addComponents(new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('token')
                                .setLabel('API Token')
                                .setPlaceholder('Enter your API token')
                                .setRequired(true)
                                .setStyle(TextInputStyle.Short)
                        ));
                    await interaction.showModal(modal).catch(() => {});
                });
                collector.on('end', () => {
                    sent.edit({ components: [] }).catch(() => {});
                });
                return sent;
            }
        },
        info: {
            aliases: [],
            data: { name: 'clashofclans info', description: 'Gets profile information on the given Clash of Clans player', usage: ',clashofclans info [tag]' },
            execute: async (message, args) => {
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const { data, error } = await playerData(message, args[0]);
                if (error) return warnMedia(message, error);
                const embed = createEmbed({
                    color: COLORS.NEUTRAL,
                    title: `${data.name} | ${data.tag}`,
                    url: `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${data.tag}`
                });
                embed.setAuthor(authorOf(message));
                embed.addFields(
                    { name: 'Town Hall', value: `${townHallEmoji(data.townHallLevel)} ${data.townHallLevel}`, inline: true },
                    { name: 'Exp Level', value: `${EMOJIS.REPLY} ${data.expLevel}`, inline: true },
                    { name: 'Clan', value: `${EMOJIS.QUESTION} ${data.clan && data.clan.name ? data.clan.name : 'No Clan'}`, inline: true },
                    { name: 'Trophies', value: `${EMOJIS.APPROVE} ${data.trophies}`, inline: true },
                    { name: 'Personal Best', value: `${EMOJIS.APPROVE} ${data.bestTrophies}`, inline: true },
                    { name: 'War Stars', value: `${EMOJIS.APPROVE} ${data.warStars}`, inline: true },
                    { name: 'Troop Donations', value: `${EMOJIS.APPROVE} ${data.donations}`, inline: true },
                    { name: 'Multiplayer Wins', value: `${EMOJIS.APPROVE} ${data.attackWins}`, inline: true },
                    { name: 'Multiplayer Defenses', value: `${EMOJIS.APPROVE} ${data.defenseWins}`, inline: true },
                    { name: 'Builder Hall', value: `${EMOJIS.APPROVE} ${data.builderHallLevel}`, inline: true },
                    { name: 'Builder Trophies', value: `${EMOJIS.APPROVE} ${data.builderBaseTrophies}`, inline: true },
                    { name: 'Builder Personal Best', value: `${EMOJIS.APPROVE} ${data.bestBuilderBaseTrophies}`, inline: true }
                );
                return message.reply({ embeds: [embed] });
            }
        },
        heroes: {
            aliases: [],
            data: { name: 'clashofclans heroes', description: 'Gets hero information on the given Clash of Clans player', usage: ',clashofclans heroes [tag]' },
            execute: async (message, args) => {
                if (await blacklisted(message)) return;
                if (await onRatelimit(message)) return;
                const { data, error } = await playerData(message, args[0]);
                if (error) return warnMedia(message, error);
                const embed = createEmbed({
                    color: COLORS.NEUTRAL,
                    title: `${data.name} | ${data.tag}`,
                    url: `https://link.clashofclans.com/en?action=OpenPlayerProfile&tag=${data.tag}`
                });
                embed.setAuthor(authorOf(message));
                const heroes = [...(data.heroes || [])].sort((a, b) => Number(b.level) - Number(a.level));
                if (!heroes.length) return warnMedia(message, `Couldn't get information about **${data.tag}**`);
                for (const hero of heroes) {
                    const equipment = (hero.equipment || []).map(item => `${item.name} (Level ${item.level})`);
                    embed.addFields({
                        name: `${hero.name} (${hero.level}/${hero.maxLevel})`,
                        value: equipment.length ? equipment.join('\n') : 'No equipment',
                        inline: true
                    });
                }
                return message.reply({ embeds: [embed] });
            }
        }
    },
    takePending: (id) => {
        const entry = pending.get(id) || null;
        if (entry) pending.delete(id);
        return entry;
    },

    handleVerify: async (interaction) => {
        const entry = module.exports.takePending(interaction.customId);
        if (!entry) {
            return interaction.reply({ content: 'This verification has expired.', ephemeral: true }).catch(() => {});
        }
        if (interaction.user.id !== entry.userId) {
            return interaction.reply({ content: 'This verification was not meant for you.', ephemeral: true }).catch(() => {});
        }
        const token = interaction.fields.getTextInputValue('token').trim();
        if (!token) {
            return interaction.reply({
                embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.WARNING} ${interaction.user}: You need to provide a verification code` })],
                ephemeral: true
            }).catch(() => {});
        }
        const res = await fetch(`https://api.clashofclans.com/v1/players/%23${encodeURIComponent(entry.tag)}/verifytoken?token=${encodeURIComponent(token)}`, {
            method: 'POST',
            headers: cocHeaders()
        }).catch(() => null);
        const data = res && res.status < 500 ? await res.json().catch(() => null) : null;
        if (!data || data.status !== 'ok') {
            return interaction.reply({
                embeds: [createEmbed({ color: COLORS.WARNING, description: `${EMOJIS.DENY} ${interaction.user}: Invalid verification code` })],
                ephemeral: true
            }).catch(() => {});
        }
        run('INSERT OR REPLACE INTO clashofclans (user_id, tag) VALUES (?, ?)', entry.userId, entry.tag);
        return interaction.update({
            embeds: [createEmbed({ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${interaction.user}: Successfully verified your Clash of Clans account` })],
            components: []
        }).catch(() => {});
    }
};
