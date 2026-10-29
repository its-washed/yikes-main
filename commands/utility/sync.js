const { first, query } = require('../../utils/database');
const { warn } = require('../../utils/context');
const { LOGGING_GUILD, addRole, removeRole } = require('../../utils/manage');

const ROLES_TO_SYNC = {
    owner: { id: '1242509393308946503', reason: 'Server Owner role synchronization' },
    donator: { id: '1242474452353290291', reason: 'Donator role synchronization' },
    instance_owner: { id: '1284159368262324285', reason: 'Instance Owner role synchronization' },
    premium: { id: '1242474452353290291', reason: 'Premium role synchronization' },
    bug_hunter_3: { id: '1243745562197626982', reason: 'Bug Hunter (3 reports) role synchronization' },
    bug_hunter_5: { id: '1300196517969137754', reason: 'Bug Hunter (5 reports) role synchronization' }
};

module.exports = {
    data: { name: 'sync', description: "Sync all relevant roles for a user on Evelina's server", usage: ',sync its_washed', params: ['[user]'] },
    aliases: [],
    cooldown: 60,

    async execute(message, args) {
        const user = message.mentions.users.first() || message.author;
        const loading = await message.reply({ embeds: [{ color: 0x7289DA, description: `🔄 Synchronizing roles for ${user}...` }] });

        const mutualGuilds = [...(user.id === message.author.id ? message.client.guilds.cache.values() : message.client.guilds.cache.values())]
            .filter((guild) => guild.members.cache.has(user.id));
        if (!mutualGuilds.length) {
            return loading.edit({ embeds: [{ color: 0xff3939, description: `⛔ User ${user} doesn't share any server with **${message.client.user.username}**` }] });
        }

        const evelinaGuild = message.client.guilds.cache.get(LOGGING_GUILD);
        if (!evelinaGuild) return loading.edit({ embeds: [{ color: 0xff3939, description: '⛔ The logging guild is unavailable' }] });
        const evelinaMember = evelinaGuild.members.cache.get(user.id);
        if (!evelinaMember) {
            return loading.edit({ embeds: [{ color: 0xff3939, description: `⛔ User ${user} is not a member of **${evelinaGuild.name}**` }] });
        }

        const isOwner = mutualGuilds.some((guild) => guild.ownerId === user.id);
        const donor = first('SELECT 1 AS ok FROM donor WHERE user_id = ?', user.id);
        const instance = first('SELECT 1 AS ok FROM instance WHERE owner_id = ?', user.id);
        const premium = first('SELECT 1 AS ok FROM premium WHERE user_id = ?', user.id);
        const bugCountRow = query('SELECT COUNT(*) AS count FROM bugreports WHERE user_id = ?', user.id)[0];
        const bugHunterCount = Number(bugCountRow ? bugCountRow.count : 0) || 0;

        const checks = {
            owner: isOwner,
            donator: Boolean(donor) || Boolean(premium),
            instance_owner: Boolean(instance),
            premium: Boolean(premium) || Boolean(donor),
            bug_hunter_3: bugHunterCount >= 3,
            bug_hunter_5: bugHunterCount >= 5
        };

        const added = [];
        for (const [key, entry] of Object.entries(ROLES_TO_SYNC)) {
            const role = evelinaGuild.roles.cache.get(entry.id);
            if (!role) continue;
            const shouldHave = checks[key];
            const hasRole = evelinaMember.roles.cache.has(role.id);
            try {
                if (shouldHave && !hasRole) {
                    await addRole(message.client, user, entry.id, entry.reason);
                    added.push(role);
                } else if (!shouldHave && hasRole) {
                    await removeRole(message.client, user, entry.id, entry.reason);
                }
            } catch (err) {}
        }

        if (added.length) {
            return loading.edit({
                embeds: [{
                    color: 0x39ffb8,
                    description: `✅ Synchronized roles for ${user} successfully. Added roles: ${added.map((role) => `${role}`).join(', ')}`
                }]
            });
        }
        return loading.edit({ embeds: [{ color: 0x39ffb8, description: `✅ No roles to synchronize for ${user}` }] });
    }
};
