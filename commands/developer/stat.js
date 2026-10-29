const fs = require('fs');
const path = require('path');
const { permissionDenied } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');

function countElementsInFile(filePath) {
    let src;
    try {
        src = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        return [0, 0, 0];
    }
    const classes = (src.match(/^\s*(?:export\s+)?class\s+[A-Za-z_$]/gm) || []).length;
    const functions = (src.match(/(?:^|[^\w$])(?:async\s+)?function\s+[A-Za-z_$]/gm) || []).length +
        (src.match(/(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?\(/gm) || []).length;
    const imports = (src.match(/require\s*\(/g) || []).length +
        (src.match(/^\s*import\s.+$/gm) || []).length;
    return [classes, functions, imports];
}

module.exports = {
    permission: "bot developer",
    data: { name: 'stat', description: 'Shows the amount of lines, functions, classes, imports, and files the bot has.', usage: ',stat' },
    cooldown: 0,

    async execute(message) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [permissionDenied(message, 'bot_developer')] });

        let totalLines = 0;
        let totalClasses = 0;
        let totalFunctions = 0;
        let totalImports = 0;
        let totalFiles = 0;
        const root = path.join(__dirname, '..', '..');
        const directories = ['commands', 'utils', 'events'];

        for (const directory of directories) {
            const walk = (dir) => {
                let entries;
                try {
                    entries = fs.readdirSync(dir, { withFileTypes: true });
                } catch (err) {
                    return;
                }
                for (const entry of entries) {
                    const full = path.join(dir, entry.name);
                    if (entry.isDirectory()) {
                        walk(full);
                        continue;
                    }
                    if (!entry.name.endsWith('.js')) continue;
                    totalFiles++;
                    let src;
                    try {
                        src = fs.readFileSync(full, 'utf8');
                    } catch (err) {
                        continue;
                    }
                    totalLines += src.split(/\r?\n/).length;
                    const [classes, functions, imports] = countElementsInFile(full);
                    totalClasses += classes;
                    totalFunctions += functions;
                    totalImports += imports;
                }
            };
            walk(path.join(root, directory));
        }

        return message.reply(
            `**lines:** \`${totalLines.toLocaleString('en-US')}\`\n` +
            `**files:** \`${totalFiles.toLocaleString('en-US')}\`\n` +
            `**functions:** \`${totalFunctions.toLocaleString('en-US')}\`\n` +
            `**classes:** \`${totalClasses.toLocaleString('en-US')}\`\n` +
            `**imports:** \`${totalImports.toLocaleString('en-US')}\``
        );
    }
};
