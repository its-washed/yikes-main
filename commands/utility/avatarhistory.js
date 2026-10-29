const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { confirm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { first, run, query } = require('../../utils/database');
const { createEmbed, successEmbed, errorEmbed } = require('../../utils/embeds');
const { Paginator } = require('../../utils/pagination');

const BASE_URL = 'https://cdn.evelina.bot/avatars/';

module.exports = {
    data: { name: 'avatarhistory', description: '', usage: ',avatarhistory its_washed', params: ['[user]'] },
    aliases: ['avh'],
    cooldown: 10,
    subcommands: ['view', 'clear', 'global', 'enable', 'disable'],
    subUsages: {
        view: ',avatarhistory view its_washed',
        clear: ',avatarhistory clear',
        global: ',avatarhistory global',
        enable: ',avatarhistory enable',
        disable: ',avatarhistory disable'
    },
    execute: async (message, args) => module.exports.subs.view.execute(message, args),

    subs: {
        view: {
            aliases: [],
            data: { name: 'avatarhistory view', description: "Check a member's avatar history", usage: ',avatarhistory view its_washed' },
            execute: async (message, args) => {
                const user = message.mentions.users.first() || message.author;
                const results = query('SELECT avatar FROM avatar_history WHERE user_id = ?', user.id);
                if (!results.length) {
                    const does = user.id === message.author.id ? "don't" : "doesn't";
                    return warn(message, `${user.id === message.author.id ? 'You' : user} ${does} have an **avatar history**`);
                }
                const urls = results.slice(0, 20).map((record) => `${BASE_URL}${record.avatar}`);
                const embeds = urls.map((url) => ({
                    color: COLORS.NEUTRAL,
                    title: `${user.username}'s Avatar History`,
                    description: `Showing **${urls.length}** from **${results.length}** pictures\n> Click [**here**](https://evelina.bot/avatars/${user.id}) to get the **full** list`,
                    author: { name: `${message.author.username}`, icon_url: message.author.avatarURL() },
                    image: { url }
                }));
                if (embeds.length > 1) {
                    const paginator = new Paginator(embeds, { userId: message.author.id });
                    const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
                    await paginator.start(message.channel, sent);
                    return sent;
                }
                return message.reply({ embeds });
            }
        },
        clear: {
            aliases: [],
            data: { name: 'avatarhistory clear', description: 'Clear your avatar history', usage: ',avatarhistory clear' },
            execute: async (message) => {
                const records = query('SELECT avatar FROM avatar_history WHERE user_id = ?', message.author.id);
                if (!records.length) return warn(message, 'You have no avatar history to clear');
                return confirm(message,
                    `${EMOJI_QUESTION()} ${message.author}: Are you sure you want to clear your avatar history?`,
                    async (i) => {
                        run('DELETE FROM avatar_history WHERE user_id = ?', i.user.id);
                        return i.update({
                            embeds: [successEmbed(null, `${EMOJI_APPROVE()} ${i.user}: Successfully deleted **${records.length}** avatar history entries`)],
                            components: []
                        }).catch(() => {});
                    },
                    async (i) => {
                        return i.update({
                            embeds: [errorEmbed(null, `${EMOJI_DENY()} ${i.user}: Avatar history clear got canceled`)],
                            components: []
                        }).catch(() => {});
                    });
            }
        },
        global: {
            aliases: [],
            data: { name: 'avatarhistory global', description: 'Returns a list of all avatar histories', usage: ',avatarhistory global' },
            execute: async (message) => {
                const results = query('SELECT user_id, COUNT(*) as avatar_count FROM avatar_history GROUP BY user_id')
                    .sort((a, b) => b.avatar_count - a.avatar_count);
                const totalAvatars = results.reduce((sum, result) => sum + Number(result.avatar_count), 0);
                const pages = [];
                for (let i = 0; i < results.length; i += 10) pages.push(results.slice(i, i + 10));
                const embeds = pages.map((page, index) => ({
                    title: 'Global Avatar History',
                    color: COLORS.NEUTRAL,
                    description: page.map((result, i) => {
                        const user = message.client.users.cache.get(result.user_id);
                        return `\`${i + 1 + index * 10}.\` **${user ? user.tag : result.user_id}** - [${Number(result.avatar_count)} Avatars](https://evelina.bot/avatars/${result.user_id})`;
                    }).join('\n'),
                    footer: { text: `Page: ${index + 1}/${pages.length} | Total Avatars: ${totalAvatars}` }
                }));
                if (!embeds.length) return warn(message, 'Error fetching information from the avatar history.');
                if (embeds.length > 1) {
                    const paginator = new Paginator(embeds, { userId: message.author.id });
                    const sent = await message.reply({ embeds: paginator.buildEmbeds(), components: [paginator.buildRow()] });
                    await paginator.start(message.channel, sent);
                    return sent;
                }
                return message.reply({ embeds });
            }
        },
        enable: {
            aliases: [],
            data: { name: 'avatarhistory enable', description: 'Enable avatar history tracking', usage: ',avatarhistory enable' },
            execute: async (message) => {
                const row = first('SELECT status FROM avatar_privacy WHERE user_id = ?', message.author.id);
                if (row && row.status === true) return warn(message, 'Avatar history tracking is already **enabled**');
                if (!row) {
                    run('INSERT INTO avatar_privacy (user_id, status) VALUES (?, ?)', message.author.id, true);
                } else {
                    run('UPDATE avatar_privacy SET status = ? WHERE user_id = ?', true, message.author.id);
                }
                return approve(message, 'Avatar history tracking has been **enabled**');
            }
        },
        disable: {
            aliases: [],
            data: { name: 'avatarhistory disable', description: 'Disable avatar history tracking', usage: ',avatarhistory disable' },
            execute: async (message) => {
                const row = first('SELECT status FROM avatar_privacy WHERE user_id = ?', message.author.id);
                if (row && row.status === false) return warn(message, 'Avatar history tracking is already **disabled**');
                if (!row) {
                    run('INSERT INTO avatar_privacy (user_id, status) VALUES (?, ?)', message.author.id, false);
                } else {
                    run('UPDATE avatar_privacy SET status = ? WHERE user_id = ?', false, message.author.id);
                }
                return approve(message, 'Avatar history tracking has been **disabled**');
            }
        }
    }
};

function EMOJI_QUESTION() { return require('../../utils/styles').EMOJIS.QUESTION; }
function EMOJI_APPROVE() { return require('../../utils/styles').EMOJIS.APPROVE; }
function EMOJI_DENY() { return require('../../utils/styles').EMOJIS.DENY; }
