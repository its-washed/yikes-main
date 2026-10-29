const { first, run } = require('../../utils/database');
const { warn, approve } = require('../../utils/context');
const { COLORS } = require('../../utils/styles');
const { ensureEconomy } = require('../../utils/predicates');
const { logSystem, addRole, LOGGING_GUILD, LOGGING_KEYS } = require('../../utils/manage');
const { prefix } = require('../../utils/moderation');

const DONATOR_ROLE = '1242474452353290291';

module.exports = {
    data: { name: 'redeem', description: 'Redeem your product keys', usage: ',redeem <key>' },
    aliases: ['claim'],
    cooldown: 5,

    async execute(message, args, client) {
        const key = args[0];
        if (!key) return warn(message, 'Usage: `redeem <key>`');
        if (!await ensureEconomy(message, client)) return;

        const check = first('SELECT * FROM store_orders WHERE serial_code = ?', key);
        if (!check) return warn(message, 'Product key is **invalid**');
        if (check.claimed) return warn(message, `Product key is **already claimed** by <@${check.claimed_by}>`);

        const logKeys = () => {
            const guild = client.guilds.cache.get(LOGGING_GUILD);
            const channel = guild && LOGGING_KEYS ? guild.channels.cache.get(LOGGING_KEYS) : null;
            return channel;
        };

        if (check.product_id === 1) {
            const checkDonator = first('SELECT * FROM donor WHERE user_id = ?', message.author.id);
            if (!checkDonator) {
                run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
                run('INSERT INTO donor (user_id, timestamp, status) VALUES (?, ?, ?)', message.author.id, Date.now() / 1000, 'purchased');
                await addRole(client, message.author, DONATOR_ROLE);
                const channel = logKeys();
                if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **donator** to ${message.author} \`${message.author.username}\`\n > **Key:** ${key}` }] }).catch(() => {});
                return approve(message, 'You have **redeemed** your **donator perks**');
            }
            if (checkDonator.status === 'boosted') {
                run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
                run('UPDATE donor SET status = ? WHERE user_id = ?', 'purchased', message.author.id);
                await addRole(client, message.author, DONATOR_ROLE);
                const channel = logKeys();
                if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **donator** to ${message.author} \`${message.author.username}\`\n > **Key:** ${key}` }] }).catch(() => {});
                return approve(message, 'You have **redeemed** your **donator perks**');
            }
            return warn(message, 'You already have **donator perks**\n> If you need help, create a Ticket in our [**Support Server**](https://discord.gg/evelina)');
        }
        if (check.product_id === 2) {
            run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
            run('UPDATE economy SET item_booster = item_booster + 1 WHERE user_id = ?', message.author.id);
            const channel = logKeys();
            if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **booster** to ${message.author} (\`${message.author.id}\`)\n > **Key:** ${key}` }] }).catch(() => {});
            const p = await prefix(message);
            return approve(message, `You have **redeemed** your **economy booster**\n > Use \`${p}item use booster\` to activate it`);
        }
        if (check.product_id === 3) {
            run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
            const channel = logKeys();
            if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **custom instance** to ${message.author} (\`${message.author.id}\`)\n > **Key:** ${key}` }] }).catch(() => {});
            return approve(message, 'You have **redeemed** your **custom instance**\n> Please open a ticket in our [**Support Server**](https://discord.gg/evelina) to get started');
        }
        if (check.product_id === 4) {
            run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
            const channel = logKeys();
            if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **premium** to ${message.author} (\`${message.author.id}\`)\n > **Key:** ${key}` }] }).catch(() => {});
            return approve(message, 'You have **redeemed** your **premium**\n> Please open a ticket in our [**Support Server**](https://discord.gg/evelina) to get started');
        }
        if (check.product_id === 5) {
            run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
            run('UPDATE economy SET cash = cash + 10000000 WHERE user_id = ?', message.author.id);
            const channel = logKeys();
            if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **10.000.000 💵** to ${message.author} (\`${message.author.id}\`)\n > **Key:** ${key}` }] }).catch(() => {});
            const p = await prefix(message);
            return approve(message, `You have **redeemed** your **10.000.000 💵**\n> Use \`${p}balance\` to check your balance`);
        }
        if (check.product_id === 7) {
            const company = first('SELECT * FROM company WHERE members LIKE ?', `%${message.author.id}%`);
            if (!company) return warn(message, 'You are **not** in a company');
            run('UPDATE store_orders SET claimed = TRUE, claimed_by = ? WHERE serial_code = ?', message.author.id, key);
            const companyVoters = first('SELECT * FROM company_voters WHERE company_id = ? AND user_id = ?', company.id, message.author.id);
            if (companyVoters) run('UPDATE company_voters SET votes = votes + 25 WHERE company_id = ? AND user_id = ?', company.id, message.author.id);
            else run('INSERT INTO company_voters (user_id, company_id, votes) VALUES (?, ?, 25)', message.author.id, company.id);
            run('UPDATE company SET votes = votes + 25 WHERE id = ?', company.id);
            const channel = logKeys();
            if (channel) channel.send({ embeds: [{ color: COLORS.NEUTRAL, description: `${client.user}: Added **25 votes** to ${message.author} (\`${message.author.id}\`)\n > **Key:** ${key}` }] }).catch(() => {});
            return approve(message, 'You have **redeemed** your **25 votes** for your company');
        }
        return warn(message, 'Product key is **invalid**');
    }
};
