const { Events } = require('discord.js');
const { query, run } = require('../utils/database');

module.exports = {
    name: Events.ClientReady,
    once: true,

    async execute(client) {
        const checkVotes = async () => {
            try {
                const rows = query('SELECT user_id FROM votes WHERE vote_until IS NOT NULL AND vote_until < ? AND vote_reminder = 1', Date.now() / 1000);
                for (const row of rows) {
                    const user = client.users.cache.get(String(row.user_id)) || await client.users.fetch(String(row.user_id)).catch(() => null);
                    if (!user) continue;
                    try {
                        await user.send({
                            embeds: [{
                                color: 0xFF819F,
                                description: "Don't forget to vote for us on top.gg!"
                            }],
                            components: [{
                                type: 1,
                                components: [{
                                    type: 2,
                                    style: 5,
                                    label: 'Vote on Top.gg',
                                    url: `https://top.gg/bot/${client.user.id}`
                                }]
                            }]
                        });
                        run('UPDATE votes SET vote_until = NULL WHERE user_id = ?', row.user_id);
                    } catch (err) {
                        continue;
                    }
                }
            } catch (err) {
            }
        };

        setInterval(checkVotes, 60000);
    }
};
