const { createEmbed, errorEmbed, successEmbed, permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

module.exports = {
    permission: "bot developer",
    data: { name: 'restart', description: '', usage: ',restart' },
    aliases: [],
    cooldown: 0,
    async execute(message, args, client) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        if (String(args[0] || '').toLowerCase() === '--pull') {
            try {
                const { execSync } = require('child_process');
                const root = path.join(__dirname, '..', '..');
                const oldCommit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
                execSync('git pull', { cwd: root, stdio: 'ignore' });
                const newCommit = execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
                if (oldCommit === newCommit) {
                    return message.reply({ embeds: [successEmbed('No update found. Aborting...')] });
                }
                const commitLink = 'https://github.com/evelinabot/evelina/commit/' + newCommit;
                return message.reply({ embeds: [successEmbed('Restarting the bot with commit **[`' + newCommit + '`](' + commitLink + ')**')] });
            } catch (err) {
                return message.reply({ embeds: [errorEmbed('Pull Failed', 'Could not pull the latest changes (' + err.message + ')')] });
            }
        }

        const confirm = await message.reply({
            embeds: [createEmbed({
                color: 0xffd600,
                title: 'Restart Bot',
                description: 'React with ✅ to confirm restart.'
            })]
        });

        await confirm.react('✅');
        const filter = (r, u) => r.emoji.name === '✅' && u.id === message.author.id;
        const collector = confirm.createReactionCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async () => {
            if (process.env.NODE_APP_INSTANCE !== undefined || process.env.PM2_HOME) {
                try {
                    const { execSync } = require('child_process');
                    execSync('pm2 restart 0', { stdio: 'ignore' });
                } catch (err) {}
            }

            const supervised = Boolean(client.shard) || typeof process.send === 'function';
            if (!supervised) {
                try {
                    const root = path.join(__dirname, '..', '..');
                    const entry = process.argv[1] || path.join(root, 'index.js');
                    const logFd = fs.openSync(path.join(root, '.bot.log'), 'a');
                    let child;
                    try {
                        child = spawn(process.execPath, [entry], {
                            cwd: root,
                            detached: true,
                            stdio: ['ignore', logFd, logFd],
                            windowsHide: true
                        });
                    } finally {
                        fs.closeSync(logFd);
                    }
                    await new Promise((resolve, reject) => {
                        child.once('spawn', resolve);
                        child.once('error', reject);
                    });
                    child.unref();
                } catch (err) {
                    return confirm.edit({ embeds: [errorEmbed('Restart Failed', `Could not start a replacement process (${err.message}). The bot was left running.`)] }).catch(() => {});
                }
            }
            await confirm.edit({ embeds: [createEmbed({ color: 0xffd600, description: 'Restarting...' })] }).catch(() => {});
            process.exit(0);
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                confirm.edit({ embeds: [errorEmbed('Cancelled', 'Restart cancelled.')] });
                confirm.reactions.removeAll().catch(() => {});
            }
        });
    }
};
