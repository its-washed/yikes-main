const { createEmbed, errorEmbed, successEmbed } = require('../../utils/embeds');
const { isDeveloper } = require('../../utils/developer');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: { name: 'db', description: 'View/edit JSON databases (Developer only)', usage: ',db [view/edit] [file] [path]' },
    aliases: ['database'],
    cooldown: 0,
    async execute(message, args) {
        if (!isDeveloper(message.author.id)) return message.reply({ embeds: [errorEmbed('No Permission', 'You must be a developer to use this.')] });

        const action = args[0];
        const fileName = args[1];
        if (!action || !fileName) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,db [view/edit] [filename] [path]')] });

        const dataDir = path.join(__dirname, '../../data');
        const filePath = path.join(dataDir, `${fileName}.json`);

        if (!fs.existsSync(filePath)) return message.reply({ embeds: [errorEmbed('Not Found', `File \`${fileName}.json\` not found.`)] });

        if (action === 'view') {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let output = JSON.stringify(data, null, 2);
            if (output.length > 1800) output = output.slice(0, 1800) + '\n... (truncated)';

            return message.reply({
                embeds: [createEmbed({
                    color: 0x6c5ce7,
                    title: `Database: ${fileName}.json`,
                    fields: [{ name: 'Content', value: `\`\`\`json\n${output}\n\`\`\`` }]
                })]
            });
        }

        if (action === 'edit') {
            const jsonPath = args[2];
            const value = args.slice(3).join(' ');
            if (!jsonPath || !value) return message.reply({ embeds: [errorEmbed('Missing Args', 'Usage: ,db edit [filename] [path.to.key] [value]')] });

            try {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const keys = jsonPath.split('.');
                let obj = data;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (!obj[keys[i]]) obj[keys[i]] = {};
                    obj = obj[keys[i]];
                }

                let parsedValue = value;
                if (value === 'true') parsedValue = true;
                else if (value === 'false') parsedValue = false;
                else if (value === 'null') parsedValue = null;
                else if (!isNaN(value)) parsedValue = Number(value);

                obj[keys[keys.length - 1]] = parsedValue;
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

                return message.reply({ embeds: [successEmbed(`Updated \`${jsonPath}\` to **${value}** in \`${fileName}.json\``)] });
            } catch (e) {
                return message.reply({ embeds: [errorEmbed('Error', e.message)] });
            }
        }

        return message.reply({ embeds: [errorEmbed('Invalid Action', 'Use `view` or `edit`.')] });
    }
};
