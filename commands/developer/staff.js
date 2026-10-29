const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { sendCard } = require('../../utils/helpCard');
const { isDeveloper } = require('../../utils/developer');
const { needSupporter } = require('../../utils/predicates');
const { rankOf } = require('../../utils/staff');
const { COLORS } = require('../../utils/styles');

const ALLOWED_SOCIALS = ['instagram', 'snapchat', 'steam', 'discord', 'custom', 'spotify', 'youtube', 'github', 'soundcloud', 'tiktok', 'twitter'];
const ALLOWED_RANKS = ['developer', 'administrator', 'manager', 'moderator', 'supporter'];

function needBotDeveloper(message) {
    if (rankOf(message.author.id) >= 4 || isDeveloper(message.author.id)) return true;
    return false;
}

function getTarget(message, args) {
    const mention = message.mentions.users.first();
    if (mention) return { user: mention, rest: args.slice(1) };
    const match = /^(\d{17,20})$/.exec(String(args[0] || '').trim());
    if (match) {
        const user = message.client.users.cache.get(match[1]);
        if (user) return { user, rest: args.slice(1) };
    }
    return { user: null, rest: args };
}

function parseSocials(row) {
    if (!row) return {};
    try {
        const parsed = JSON.parse(row.socials || '{}');
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
        return {};
    }
}

function socialLines(socials) {
    return Object.entries(socials).map(([platform, link]) => `**${capitalize(platform)}:** ${link}`);
}

function capitalize(text) {
    return text ? text[0].toUpperCase() + text.slice(1) : text;
}

async function editOwnSocial(message, args, mode) {
    const platform = (args[0] || '').toLowerCase();
    const link = args[1];
    if (!ALLOWED_SOCIALS.includes(platform)) {
        return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
    }
    const row = first('SELECT * FROM team_members WHERE user_id = ?', message.author.id);
    if (!row) return warn(message, "You aren't in the staff team");
    const socials = parseSocials(row);

    if (mode === 'add') {
        if (socials[platform]) return warn(message, `You already have a **${capitalize(platform)}** link`);
        if (!link) return warn(message, 'You must provide a link');
        socials[platform] = link;
        run('UPDATE team_members SET socials = ? WHERE user_id = ?', JSON.stringify(socials), message.author.id);
        return approve(message, `Your [**${capitalize(platform)}**](${link}) link got added successfully`);
    }
    if (mode === 'remove') {
        if (!socials[platform]) return warn(message, `You don't have a **${capitalize(platform)}** link`);
        delete socials[platform];
        run('UPDATE team_members SET socials = ? WHERE user_id = ?', JSON.stringify(socials), message.author.id);
        return approve(message, `Your **${capitalize(platform)}** link got removed successfully`);
    }
    if (!socials[platform]) return warn(message, `You don't have a **${capitalize(platform)}** link`);
    if (!link) return warn(message, 'You must provide a link');
    socials[platform] = link;
    run('UPDATE team_members SET socials = ? WHERE user_id = ?', JSON.stringify(socials), message.author.id);
    return approve(message, `Your [**${capitalize(platform)}**](${link}) link got updated successfully`);
}

async function editForceSocial(message, args, mode) {
    const { user, rest } = getTarget(message, args);
    if (!user) return warn(message, 'You must mention a user or provide an id');
    const platform = (rest[0] || '').toLowerCase();
    const link = rest[1];
    if (!ALLOWED_SOCIALS.includes(platform)) {
        return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
    }
    const row = first('SELECT * FROM team_members WHERE user_id = ?', user.id);
    if (!row) return warn(message, `**${user.username}** isn't in the staff team`);
    const socials = parseSocials(row);

    if (mode === 'forceadd') {
        if (socials[platform]) return warn(message, `**${user.username}** already has a **${capitalize(platform)}** link`);
        if (!link) return warn(message, 'You must provide a link');
        socials[platform] = link;
        run('UPDATE team_members SET socials = ? WHERE user_id = ?', JSON.stringify(socials), user.id);
        return approve(message, `**${user.username}**'s [**${capitalize(platform)}**](${link}) link got added successfully`);
    }
    if (mode === 'forceremove') {
        if (!socials[platform]) return warn(message, `**${user.username}** doesn't have a **${capitalize(platform)}** link`);
        delete socials[platform];
        run('UPDATE team_members SET socials = ? WHERE user_id = ?', JSON.stringify(socials), user.id);
        return approve(message, `**${user.username}**'s **${capitalize(platform)}** link got removed successfully`);
    }
    if (!socials[platform]) return warn(message, `**${user.username}** doesn't have a **${capitalize(platform)}** link`);
    if (!link) return warn(message, 'You must provide a link');
    socials[platform] = link;
    run('UPDATE team_members SET socials = ? WHERE user_id = ?', JSON.stringify(socials), user.id);
    return approve(message, `**${user.username}**'s [**${capitalize(platform)}**](${link}) link got updated successfully`);
}

module.exports = {
    permission: "bot developer",
    data: {
        name: 'staff',
        description: 'Manage the staff team.',
        usage: ',staff <add|remove|edit|social>'
    },
    subcommands: ['add', 'remove', 'edit', 'social'],
    cooldown: 5,

    async execute(message) {
        if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
        return sendCard(message, module.exports);
    },

    subs: {
        add: {
            aliases: [],
            data: { name: 'staff add', description: 'Add a user to the staff team', usage: ',staff add <user> <rank>' },
            async execute(message, args) {
                if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                const { user, rest } = getTarget(message, args);
                if (!user) return warn(message, 'You must mention a user or provide an id');
                const rank = (rest[0] || '').toLowerCase();
                if (!ALLOWED_RANKS.includes(rank)) return warn(message, `Allowed ranks are:\n> ${ALLOWED_RANKS.join(', ')}`);
                const existing = first('SELECT * FROM team_members WHERE user_id = ?', user.id);
                if (existing) return warn(message, `**${user.username}** is already in the staff team`);
                run('INSERT INTO team_members (user_id, rank, socials) VALUES (?, ?, ?)', user.id, capitalize(rank), '{}');
                return approve(message, `**${user.username}** got added to the staff team as a **${capitalize(rank)}**`);
            }
        },

        remove: {
            aliases: [],
            data: { name: 'staff remove', description: 'Remove a user from the staff team', usage: ',staff remove <user>' },
            async execute(message, args) {
                if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                const { user } = getTarget(message, args);
                if (!user) return warn(message, 'You must mention a user or provide an id');
                const existing = first('SELECT * FROM team_members WHERE user_id = ?', user.id);
                if (!existing) return warn(message, `**${user.username}** isn't in the staff team`);
                run('DELETE FROM team_members WHERE user_id = ?', user.id);
                return approve(message, `**${user.username}** got removed from the staff team`);
            }
        },

        edit: {
            aliases: [],
            data: { name: 'staff edit', description: 'Edit the rank of a staff member', usage: ',staff edit <user> <rank>' },
            async execute(message, args) {
                if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                const { user, rest } = getTarget(message, args);
                if (!user) return warn(message, 'You must mention a user or provide an id');
                const rank = (rest[0] || '').toLowerCase();
                if (!ALLOWED_RANKS.includes(rank)) return warn(message, `Allowed ranks are:\n> ${ALLOWED_RANKS.join(', ')}`);
                const existing = first('SELECT * FROM team_members WHERE user_id = ?', user.id);
                if (!existing) return warn(message, `**${user.username}** isn't in the staff team`);
                run('UPDATE team_members SET rank = ? WHERE user_id = ?', capitalize(rank), user.id);
                return approve(message, `**${user.username}** rank got updated to **${capitalize(rank)}**`);
            }
        },

        social: {
            aliases: [],
            data: { name: 'staff social', description: 'Manage the social media profiles of the staff team.', usage: ',staff social <add|remove|edit|list|forceadd|forceremove|forceedit|forcelist>' },
            subcommands: ['add', 'remove', 'edit', 'list', 'forceadd', 'forceremove', 'forceedit', 'forcelist'],
            async execute(message) {
                if (!await needSupporter(message)) return;
                return sendCard(message, module.exports.subs.social);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'staff social add', description: 'Add a social media profile to yourself', usage: ',staff social add instagram https://instagram.com/bender6pm' },
                    async execute(message, args, client, config) {
                        if (!await needSupporter(message)) return;
                        if (!args[0]) return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
                        return editOwnSocial(message, args, 'add');
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'staff social remove', description: 'Remove a social media profile from yourself', usage: ',staff social remove instagram' },
                    async execute(message, args, client, config) {
                        if (!await needSupporter(message)) return;
                        if (!args[0]) return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
                        return editOwnSocial(message, args, 'remove');
                    }
                },
                edit: {
                    aliases: [],
                    data: { name: 'staff social edit', description: 'Edit a social media profile of yourself', usage: ',staff social edit instagram https://instagram.com/bender6pm' },
                    async execute(message, args, client, config) {
                        if (!await needSupporter(message)) return;
                        if (!args[0]) return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
                        return editOwnSocial(message, args, 'edit');
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'staff social list', description: 'List all social media profiles of yourself', usage: ',staff social list' },
                    async execute(message) {
                        if (!await needSupporter(message)) return;
                        const row = first('SELECT * FROM team_members WHERE user_id = ?', message.author.id);
                        if (!row) return warn(message, "You aren't in the staff team");
                        const socials = parseSocials(row);
                        const lines = socialLines(socials);
                        if (!lines.length) return warn(message, "You doesn't have any social media profiles");
                        return message.reply({
                            embeds: [{
                                color: COLORS.NEUTRAL,
                                title: `${message.author.username}'s Social Profiles`,
                                description: lines.join('\n')
                            }]
                        });
                    }
                },
                forceadd: {
                    aliases: [],
                    data: { name: 'staff social forceadd', description: 'Add a social media profile to a staff member', usage: ',staff social forceadd <user> instagram https://instagram.com/bender6pm' },
                    async execute(message, args) {
                        if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                        if (args.length < 3) return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
                        return editForceSocial(message, args, 'forceadd');
                    }
                },
                forceremove: {
                    aliases: [],
                    data: { name: 'staff social forceremove', description: 'Remove a social media profile from a staff member', usage: ',staff social forceremove <user> instagram' },
                    async execute(message, args) {
                        if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                        if (args.length < 2) return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
                        return editForceSocial(message, args, 'forceremove');
                    }
                },
                forceedit: {
                    aliases: [],
                    data: { name: 'staff social forceedit', description: 'Edit a social media profile of a staff member', usage: ',staff social forceedit <user> instagram https://instagram.com/bender6pm' },
                    async execute(message, args) {
                        if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                        if (args.length < 3) return warn(message, `Allowed platforms are:\n> ${ALLOWED_SOCIALS.join(', ')}`);
                        return editForceSocial(message, args, 'forceedit');
                    }
                },
                forcelist: {
                    aliases: [],
                    data: { name: 'staff social forcelist', description: 'List all social media profiles of a staff member', usage: ',staff social forcelist <user>' },
                    async execute(message, args) {
                        if (!needBotDeveloper(message)) return warn(message, 'You need the **bot developer** rank to use this command');
                        const { user } = getTarget(message, args);
                        if (!user) return warn(message, 'You must mention a user or provide an id');
                        const row = first('SELECT * FROM team_members WHERE user_id = ?', user.id);
                        if (!row) return warn(message, `**${user.username}** isn't in the staff team`);
                        const socials = parseSocials(row);
                        const lines = socialLines(socials);
                        if (!lines.length) return warn(message, `**${user.username}** doesn't have any social media profiles`);
                        return message.reply({
                            embeds: [{
                                color: COLORS.NEUTRAL,
                                title: `${user.username}'s Social Profiles`,
                                description: lines.join('\n')
                            }]
                        });
                    }
                }
            }
        }
    }
};
