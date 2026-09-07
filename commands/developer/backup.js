const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: { name: 'backup', description: 'Backup/restore bot data (Developer only)', usage: ',backup <create|load|list> [name]' },
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer.')] });

        const sub = args[0]?.toLowerCase();
        if (!sub) return message.reply({ embeds: [errorEmbed('Subcommands', 'Valid: `create`, `load`, `list`, `delete`')] });

        const dataDir = path.join(__dirname, '../../data');
        const backupDir = path.join(__dirname, '../../backups');

        if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

        if (sub === 'create') {
            const name = args[1] || `backup_${Date.now()}`;
            const dest = path.join(backupDir, name);
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

            const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                fs.copyFileSync(path.join(dataDir, file), path.join(dest, file));
            }
            return message.reply({ embeds: [successEmbed('Backup Created', `Backed up **${files.length}** files to \`${name}\`.`)] });
        }

        if (sub === 'load') {
            const name = args[1];
            if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,backup load <name>')] });
            const src = path.join(backupDir, name);
            if (!fs.existsSync(src)) return message.reply({ embeds: [errorEmbed('Not Found', `No backup named \`${name}\`.`)] });

            const files = fs.readdirSync(src).filter(f => f.endsWith('.json'));
            for (const file of files) {
                fs.copyFileSync(path.join(src, file), path.join(dataDir, file));
            }
            return message.reply({ embeds: [successEmbed('Restored', `Restored **${files.length}** files from \`${name}\`.`)] });
        }

        if (sub === 'list') {
            const backups = fs.readdirSync(backupDir).filter(f => {
                try { return fs.statSync(path.join(backupDir, f)).isDirectory(); } catch { return false; }
            });
            if (!backups.length) return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: 'Backups', description: 'No backups found.' })] });
            const list = backups.map(b => `\`${b}\``).join('\n');
            return message.reply({ embeds: [createEmbed({ color: 0x6c5ce7, title: `Backups (${backups.length})`, description: list })] });
        }

        if (sub === 'delete') {
            const name = args[1];
            if (!name) return message.reply({ embeds: [errorEmbed('Missing Name', 'Usage: ,backup delete <name>')] });
            const src = path.join(backupDir, name);
            if (!fs.existsSync(src)) return message.reply({ embeds: [errorEmbed('Not Found', `No backup named \`${name}\`.`)] });
            fs.rmSync(src, { recursive: true });
            return message.reply({ embeds: [successEmbed('Deleted', `Backup \`${name}\` removed.`)] });
        }

        return message.reply({ embeds: [errorEmbed('Invalid', 'Valid: `create`, `load`, `list`, `delete`')] });
    }
};
