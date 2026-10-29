const { execSync } = require('child_process');
const { warn, approve } = require('../../utils/context');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

function git(command, timeout = 60000) {
    return execSync(`git ${command}`, { encoding: 'utf8', timeout, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

module.exports = {
    permission: "bot developer",
    data: { name: 'pull', description: 'Pull the latest changes from the repository', usage: ',pull' },
    cooldown: 0,

    async execute(message) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        let oldCommitId;
        let newCommitId;
        try {
            oldCommitId = git('rev-parse --short=7 HEAD');
            git('fetch origin');
            newCommitId = git('rev-parse --short=7 origin/main');
        } catch (err) {
            return warn(message, `Failed to pull from the repository.\n\`\`\`${err.message}\`\`\``);
        }

        if (oldCommitId === newCommitId) {
            return warn(message, `No new commits found. Bot running: **[\`${newCommitId}\`](https://github.com/evelinabot/evelina/commit/${newCommitId})**`);
        }

        try {
            git('reset --hard origin/main');
        } catch (err) {
            return warn(message, `Failed to pull from the repository.\n\`\`\`${err.message}\`\`\``);
        }
        return approve(message, `Pulled from [\`evelina\`](https://github.com/evelinabot/evelina)\n**Commit ID:** [\`${oldCommitId}...${newCommitId}\`](https://github.com/evelinabot/evelina/compare/${oldCommitId}...${newCommitId})`);
    }
};
