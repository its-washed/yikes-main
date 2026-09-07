const { Events, EmbedBuilder } = require('discord.js');
const { getGuildConfig, updateGuildConfig } = require('../utils/config');
const { resolve } = require('../utils/variables');
const { logger } = require('../utils/logger');

const inviteCache = new Map();

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,

    async execute(member) {
        if (member.user.bot) return;
        const config = getGuildConfig(member.guild.id);
        if (!config.inviteTracker?.enabled) return;

        try {
            const invites = await member.guild.invites.fetch();
            const cached = inviteCache.get(member.guild.id) || new Map();

            let inviter = null;
            let usedInvite = null;

            for (const [code, invite] of invites) {
                const cachedUses = cached.get(code) || 0;
                if (invite.uses > cachedUses) {
                    inviter = invite.inviter;
                    usedInvite = code;
                    cached.set(code, invite.uses);
                    break;
                }
            }

            inviteCache.set(member.guild.id, cached);

            if (!inviter || inviter.bot) return;

            const inviterData = config.inviteTracker?.invites || {};
            if (!inviterData[inviter.id]) inviterData[inviter.id] = { regular: 0, fake: 0, bonus: 0, left: 0 };

            const accountAge = Date.now() - member.user.createdAt.getTime();
            const threshold = (config.inviteTracker?.fakeThreshold || 3) * 86400000;

            if (accountAge < threshold) {
                inviterData[inviter.id].fake++;
            } else {
                inviterData[inviter.id].regular++;
            }

            updateGuildConfig(member.guild.id, {
                inviteTracker: { ...config.inviteTracker, invites: inviterData }
            });

            const logChannel = member.guild.channels.cache.get(config.inviteTracker?.logChannel);
            if (logChannel) {
                const msg = config.inviteTracker?.message || '{inviter.mention} invited {user.mention} to the server!';
                const ctx = { inviter: inviter, user: member.user, guild: member.guild, member };
                const text = resolve(msg, ctx);
                logChannel.send({ content: text }).catch(() => {});
            }

            const rewards = config.inviteTracker?.rewards || [];
            const total = (inviterData[inviter.id].regular || 0) + (inviterData[inviter.id].bonus || 0);

            for (const reward of rewards) {
                if (total >= reward.threshold) {
                    const role = member.guild.roles.cache.get(reward.roleId);
                    if (role) {
                        try {
                            const inviterMember = await member.guild.members.fetch(inviter.id);
                            if (!inviterMember.roles.cache.has(role.id)) {
                                await inviterMember.roles.add(role, 'Invite reward');
                            }
                        } catch {}
                    }
                }
            }
        } catch {}

        try {
            const invites = await member.guild.invites.fetch();
            const cached = new Map();
            for (const [code, invite] of invites) {
                cached.set(code, invite.uses);
            }
            inviteCache.set(member.guild.id, cached);
        } catch {}
    }
};
