const { first, run } = require('./database');
const { warn } = require('./context');
const { COLORS, EMOJIS } = require('./styles');
const { confirm } = require('./moderation');

const LOGGING_GUILD = '1352885246097363047';
const SUPPORTER_ROLE = '1228378828704055366';

async function needSupporter(message) {
    const check = first("SELECT 1 AS ok FROM team_members WHERE user_id = ? AND rank IN ('Supporter', 'Moderator', 'Manager', 'Developer')", message.author.id);
    return Boolean(check);
}

async function needPerks(message, client) {
    const checkPremium = first('SELECT 1 AS ok FROM premium WHERE guild_id = ?', message.guild.id);
    if (checkPremium) return true;
    const checkDonor = first('SELECT 1 AS ok FROM donor WHERE user_id = ?', message.author.id);
    const checkVote = first('SELECT vote_until FROM votes WHERE user_id = ?', message.author.id);
    if (checkVote && checkVote.vote_until && checkVote.vote_until > Date.now() / 1000) return true;
    if (checkDonor) return true;
    const guild = client.guilds.cache.get(LOGGING_GUILD);
    if (guild) {
        const member = guild.members.cache.get(message.author.id);
        if (member) {
            const role = guild.roles.cache.get(SUPPORTER_ROLE);
            if (role && member.roles.cache.has(role.id)) return true;
        }
    }
    await warn(message, 'You need [**donator**](https://evelina.bot/premium) perks or to have [**vote**](https://top.gg/bot/1242930981967757452/vote) to use this command');
    return false;
}

function ensureEconomy(message, client) {
    return new Promise(resolve => {
        let settled = false;
        const done = value => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        setTimeout(() => done(false), 65000);
        const check = first('SELECT cash, terms FROM economy WHERE user_id = ?', message.author.id);
        if (!check) {
            if (message.author.createdTimestamp > Date.now() - 14 * 24 * 60 * 60 * 1000) {
                warn(message, 'You need to be on Discord for at least **14 days** to use this command');
                return done(false);
            }
            if (!message.author.avatar) {
                warn(message, "Your account looks **suspicious**, you can't create an economy account");
                return resolve(false);
            }
            run('INSERT INTO economy (user_id, cash, card) VALUES (?, ?, ?)', message.author.id, 5000.00, 0.00);
            return confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: You need to accept the [**rules**](https://evelina.bot/economy) to use the economy system`,
                async (i) => {
                    run('UPDATE economy SET terms = TRUE WHERE user_id = ?', i.user.id);
                    await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: You accepted, you can now use the economy system` }], components: [] });
                    done(true);
                },
                async (i) => {
                    await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: You rejected, you can't use the economy system` }], components: [] });
                    done(false);
                });
            return;
        }
        if (check.terms === 0 || check.terms === false) {
            confirm(message, `${EMOJIS.QUESTION} ${message.author.mention}: You need to accept the [**rules**](https://evelina.bot/economy) to use the economy system`,
                async (i) => {
                    run('UPDATE economy SET terms = TRUE WHERE user_id = ?', i.user.id);
                    await i.update({ embeds: [{ color: COLORS.SUCCESS, description: `${EMOJIS.APPROVE} ${i.user.mention}: You accepted, you can now use the economy system` }], components: [] });
                    done(true);
                },
                async (i) => {
                    await i.update({ embeds: [{ color: COLORS.ERROR, description: `${EMOJIS.DENY} ${i.user.mention}: You rejected, you can't use the economy system` }], components: [] });
                    done(false);
                });
            return;
        }
        if (check.cash < 0) {
            warn(message, "You can't use the economy system with a negative balance.");
            return done(false);
        }
        done(true);
    });
}

async function needBoosterConfigured(message, config) {
    const check = first('SELECT 1 AS ok FROM booster_module WHERE guild_id = ?', message.guild.id);
    if (!check) {
        const prefix = (config && config.prefix) || ',';
        await warn(message, `Booster roles are **not** configured\n> Use \`${prefix}boosterrole setup\` to configure it`);
        return false;
    }
    return true;
}

async function needBoosterRole(message, config) {
    const check = first('SELECT 1 AS ok FROM booster_roles WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
    if (!check) {
        const prefix = (config && config.prefix) || ',';
        await warn(message, `You don't have a booster role set\n> Please use \`${prefix}boosterrole create\` to create a booster role`);
        return false;
    }
    return true;
}

async function notBoosterBlacklisted(message) {
    const check = first('SELECT reason FROM booster_blacklist WHERE guild_id = ? AND user_id = ?', message.guild.id, message.author.id);
    if (check) {
        await warn(message, `You got blacklisted from using boosterroles\n> **Reason:** ${check.reason}`);
        return false;
    }
    return true;
}

async function needBoostedTo(message, level) {
    if (message.guild.premiumTier >= level) return true;
    await warn(message, `The server has to be boosted to level **${level}** to be able to use this command`);
    return false;
}

async function needVcOwner(message) {
    const voice = message.member.voice.channel;
    if (!voice) {
        await warn(message, 'You must be connected to a voice channel to use this command.');
        return false;
    }
    const cfg = first('SELECT * FROM voicemaster WHERE guild_id = ?', message.guild.id);
    if (cfg) {
        const jtc = message.guild.channels.cache.get(String(cfg.channel_id));
        if (!jtc) {
            await warn(message, 'The voice channel linked to the bot no longer exists');
            run('DELETE FROM voicemaster WHERE guild_id = ?', message.guild.id);
            return false;
        }
        const expected = cfg.category ? message.guild.channels.cache.get(String(cfg.category)) : jtc.category;
        if ((voice.category || null) !== (expected || null)) {
            await warn(message, 'You are not in a voice channel created by the bot');
            return false;
        }
    }
    const owner = first('SELECT 1 AS ok FROM voicemaster_channels WHERE voice = ? AND user_id = ?', voice.id, message.author.id);
    if (!owner) {
        await warn(message, 'You are not the owner of this voice channel');
        return false;
    }
    return true;
}

async function needLeveling(message, config) {
    const check = first('SELECT 1 AS ok FROM leveling WHERE guild_id = ?', message.guild.id);
    if (!check) {
        const prefix = (config && config.prefix) || ',';
        await warn(message, `Leveling is **not** enabled\n> Use \`${prefix}level enable\` to enable it`);
        return false;
    }
    return true;
}

async function needAntinukeConfigured(message, config) {
    const check = first('SELECT configured FROM antinuke WHERE guild_id = ?', message.guild.id);
    if (!check || String(check.configured) !== 'true') {
        const prefix = (config && config.prefix) || ',';
        await warn(message, `Antinuke is **not** configured\n> Use \`${prefix}antinuke setup\` to configure it`);
        return false;
    }
    return true;
}

async function needAntinukeOwner(message, config) {
    const check = first('SELECT owner_id FROM antinuke WHERE guild_id = ?', message.guild.id);
    if (!check || !check.owner_id) {
        const prefix = (config && config.prefix) || ',';
        await warn(message, `Antinuke is **not** configured\n> Use \`${prefix}antinuke setup\` to configure it`);
        return false;
    }
    if (String(message.author.id) !== String(check.owner_id)) {
        await warn(message, `Only <@${check.owner_id}> can use this command!`);
        return false;
    }
    return true;
}

async function needAntinukeAdmin(message, config) {
    const check = first('SELECT owner_id, admins FROM antinuke WHERE guild_id = ?', message.guild.id);
    if (!check) {
        const prefix = (config && config.prefix) || ',';
        await warn(message, `Antinuke is **not** configured\n> Use \`${prefix}antinuke setup\` to configure it`);
        return false;
    }
    const allowed = [String(check.owner_id)];
    try {
        const admins = JSON.parse(check.admins || '[]');
        if (Array.isArray(admins)) allowed.push(...admins.map(String));
    } catch (err) {}
    if (!allowed.includes(String(message.author.id))) {
        await warn(message, "You **can't** use this command, you need to be an Antinuke admin");
        return false;
    }
    return true;
}

async function needAntispam(message) {
    const check = first('SELECT 1 AS ok FROM automod_spam WHERE guild_id = ?', message.guild.id);
    if (!check) {
        await warn(message, 'Antispam is **not** enabled\n> Use `automod spam enable` to enable it');
        return false;
    }
    return true;
}

async function needAntirepeat(message) {
    const check = first('SELECT 1 AS ok FROM automod_repeat WHERE guild_id = ?', message.guild.id);
    if (!check) {
        await warn(message, 'Antirepeat is **not** enabled\n> Use `automod repeat enable` to enable it');
        return false;
    }
    return true;
}

const renameBuckets = new Map();

function vcRenameAllowed(channelId) {
    const now = Date.now();
    let bucket = (renameBuckets.get(channelId) || []).filter(t => now - t <= 600000);
    bucket.push(now);
    renameBuckets.set(channelId, bucket);
    return bucket.length < 3;
}

module.exports = { needSupporter, needPerks, ensureEconomy, needBoosterConfigured, needBoosterRole, notBoosterBlacklisted, needBoostedTo, needVcOwner, vcRenameAllowed, needLeveling, needAntinukeAdmin, needAntinukeConfigured, needAntinukeOwner, needAntispam, needAntirepeat };
