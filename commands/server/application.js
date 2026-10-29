const { PermissionFlagsBits } = require('discord.js');
const { query, first, run } = require('../../utils/database');
const { warn, approve, paginate } = require('../../utils/context');
const { needPerm } = require('../../utils/moderation');
const { sendCard } = require('../../utils/helpCard');
const { prefix } = require('../../utils/moderation');
const { parseChannel } = require('../../utils/helpers');
const { createEmbed } = require('../../utils/embeds');
const { COLORS } = require('../../utils/styles');

function parseJson(value, fallback) {
    try {
        const parsed = JSON.parse(value);
        return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (err) {
        return fallback;
    }
}

function questionsOf(row) {
    const parsed = parseJson(row.questions, []);
    return Array.isArray(parsed) ? parsed : [];
}

function rolesOf(row) {
    const parsed = parseJson(row.roles, []);
    return Array.isArray(parsed) ? parsed.map(String) : [];
}

function iconOf(guild) {
    return guild.icon ? guild.iconURL({ size: 256 }) : undefined;
}

module.exports = {
    data: { name: 'application', description: 'Manage your applications', usage: ',application <create|delete|list|question|role|status|channel|level>' },
    aliases: ['app'],
    cooldown: 5,
    subcommands: ['create', 'delete', 'list', 'question', 'role', 'status', 'channel', 'level'],
    execute: async (message, args) => {
        const sub = args[0];
        if (sub) return warn(message, 'Valid subcommands: create, delete, list, question, role, status, channel, level');
        return sendCard(message, module.exports);
    },
    subs: {
        create: {
            aliases: ['add'],
            data: { name: 'application create', description: 'Create a new application', usage: ',application create <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `application create <name>`');
                const applications = query('SELECT * FROM applications WHERE guild_id = ?', message.guild.id);
                if (applications.length >= 25) return warn(message, 'You can only have **25 applications** per server.');
                if (first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id)) {
                    return warn(message, 'Application with that name already exists.');
                }
                run('INSERT INTO applications (guild_id, name, questions, status) VALUES (?, ?, ?, ?)', message.guild.id, name, '[]', 1);
                return approve(message, `Application \`${name}\` has been created.\nYou can now add questions to it using \`${prefix(message)}application question add\`.`);
            }
        },
        delete: {
            aliases: ['remove'],
            data: { name: 'application delete', description: 'Delete an application', usage: ',application delete <name>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args.join(' ').trim();
                if (!name) return warn(message, 'Usage: `application delete <name>`');
                if (!first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id)) {
                    return warn(message, 'Application with that name does not exist.');
                }
                run('DELETE FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                return approve(message, `Application \`${name}\` has been deleted.`);
            }
        },
        list: {
            aliases: ['all'],
            data: { name: 'application list', description: 'List all applications', usage: ',application list' },
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const applications = query('SELECT * FROM applications WHERE guild_id = ?', message.guild.id);
                if (!applications.length) return warn(message, 'No applications found.');
                const lines = [];
                applications.forEach((application, index) => {
                    lines.push(`**${application.name}** — ${application.status ? 'Open' : 'Closed'}`);
                    questionsOf(application).forEach((question, qIndex) => {
                        lines.push(`> Question ${qIndex + 1}: \`${question}\``);
                    });
                    lines.push(`> ${index + 1}/${applications.length} (${applications.length} entries)`);
                });
                return paginate(message, lines, 'Applications', { name: message.guild.name, icon_url: iconOf(message.guild) });
            }
        },
        question: {
            aliases: ['questions'],
            data: { name: 'application question', description: 'Manage questions', usage: ',application question <add|remove|edit|list>' },
            subcommands: ['add', 'remove', 'edit', 'list'],
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.question);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'application question add', description: 'Add a question to an application', usage: ',application question add <name> <question>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args[0];
                        const question = args.slice(1).join(' ').trim();
                        if (!name || !question) return warn(message, 'Usage: `application question add <name> <question>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const questions = questionsOf(check);
                        if (questions.length >= 5) return warn(message, 'You can only have **5 questions** per application.');
                        if (question.length > 45) return warn(message, 'Question can not be longer than **100 characters**');
                        questions.push(question);
                        run('UPDATE applications SET questions = ? WHERE name = ? AND guild_id = ?', JSON.stringify(questions), name, message.guild.id);
                        return approve(message, `Question has been added to application \`${name}\`\n\`\`\`${question}\`\`\``);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'application question remove', description: 'Remove a question from an application', usage: ',application question remove <name> <index>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args[0];
                        const index = parseInt(args[1], 10);
                        if (!name || !Number.isInteger(index)) return warn(message, 'Usage: `application question remove <name> <index>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const questions = questionsOf(check);
                        if (index > questions.length) return warn(message, 'Question with that index does not exist.');
                        questions.splice(index - 1, 1);
                        run('UPDATE applications SET questions = ? WHERE name = ? AND guild_id = ?', JSON.stringify(questions), name, message.guild.id);
                        return approve(message, `Question has been removed from application \`${name}\``);
                    }
                },
                edit: {
                    aliases: [],
                    data: { name: 'application question edit', description: 'Edit a question in an application', usage: ',application question edit <name> <index> <question>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args[0];
                        const index = parseInt(args[1], 10);
                        const question = args.slice(2).join(' ').trim();
                        if (!name || !Number.isInteger(index) || !question) return warn(message, 'Usage: `application question edit <name> <index> <question>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const questions = questionsOf(check);
                        if (index > questions.length) return warn(message, 'Question with that index does not exist.');
                        if (question.length > 45) return warn(message, 'Question can not be longer than **100 characters**');
                        questions[index - 1] = question;
                        run('UPDATE applications SET questions = ? WHERE name = ? AND guild_id = ?', JSON.stringify(questions), name, message.guild.id);
                        return approve(message, `Question has been edited in application \`${name}\`\n\`\`\`${question}\`\`\``);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'application question list', description: 'List all questions in an application', usage: ',application question list <name>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'Usage: `application question list <name>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const questions = questionsOf(check);
                        if (!questions.length) return warn(message, 'No questions found.');
                        const lines = questions.map((question, index) => `**${index + 1}.** \`${question}\``);
                        return paginate(message, lines, name, { name: message.guild.name, icon_url: iconOf(message.guild) });
                    }
                }
            }
        },
        role: {
            aliases: ['roles'],
            data: { name: 'application role', description: 'Manage application roles', usage: ',application role <add|remove|list>' },
            subcommands: ['add', 'remove', 'list'],
            execute: async (message) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                return sendCard(message, module.exports.subs.role);
            },
            subs: {
                add: {
                    aliases: [],
                    data: { name: 'application role add', description: 'Add a role to an application', usage: ',application role add <name> <role>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args[0];
                        if (!name) return warn(message, 'Usage: `application role add <name> <role>`');
                        const role = message.mentions.roles.first() || message.guild.roles.cache.get(String(args[1] || '').replace(/[<@&>]/g, ''));
                        if (!role) return warn(message, 'Usage: `application role add <name> <role>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const roles = rolesOf(check);
                        if (roles.includes(role.id)) return warn(message, 'Role is already added to this application.');
                        roles.push(role.id);
                        run('UPDATE applications SET roles = ? WHERE name = ? AND guild_id = ?', JSON.stringify(roles), name, message.guild.id);
                        return approve(message, `Role ${role} has been added to application \`${name}\``);
                    }
                },
                remove: {
                    aliases: [],
                    data: { name: 'application role remove', description: 'Remove a role from an application', usage: ',application role remove <name> <role>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args[0];
                        if (!name) return warn(message, 'Usage: `application role remove <name> <role>`');
                        const role = message.mentions.roles.first() || message.guild.roles.cache.get(String(args[1] || '').replace(/[<@&>]/g, ''));
                        if (!role) return warn(message, 'Usage: `application role remove <name> <role>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const roles = rolesOf(check);
                        if (!roles.includes(role.id)) return warn(message, 'Role is not added to this application.');
                        roles.splice(roles.indexOf(role.id), 1);
                        run('UPDATE applications SET roles = ? WHERE name = ? AND guild_id = ?', JSON.stringify(roles), name, message.guild.id);
                        return approve(message, `Role ${role} has been removed from application \`${name}\``);
                    }
                },
                list: {
                    aliases: [],
                    data: { name: 'application role list', description: 'List all roles in an application', usage: ',application role list <name>' },
                    execute: async (message, args) => {
                        if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                        const name = args.join(' ').trim();
                        if (!name) return warn(message, 'Usage: `application role list <name>`');
                        const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                        if (!check) return warn(message, 'Application with that name does not exist.');
                        const roles = rolesOf(check);
                        if (!roles.length) return warn(message, 'No roles found.');
                        const lines = roles.map(roleId => {
                            const role = message.guild.roles.cache.get(roleId);
                            return role ? `${role}` : `<@&${roleId}>`;
                        });
                        return paginate(message, lines, `Roles for \`${name}\``, { name: message.guild.name, icon_url: iconOf(message.guild) });
                    }
                }
            }
        },
        status: {
            aliases: [],
            data: { name: 'application status', description: 'Change the status of an application', usage: ',application status <name> <open|closed>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args[0];
                if (!name) return warn(message, 'Usage: `application status <name> <open|closed>`');
                const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                if (!check) return warn(message, 'Application with that name does not exist.');
                const value = String(args[1] || '').toLowerCase();
                if (value !== 'open' && value !== 'closed') return warn(message, 'Invalid status. Use `open` or `closed`.');
                const status = value === 'open';
                run('UPDATE applications SET status = ? WHERE name = ? AND guild_id = ?', status ? 1 : 0, name, message.guild.id);
                return approve(message, `Application \`${name}\` is now ${status ? 'True' : 'False'}`);
            }
        },
        channel: {
            aliases: [],
            data: { name: 'application channel', description: 'Set the channel for an application', usage: ',application channel <name> <channel>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args[0];
                if (!name) return warn(message, 'Usage: `application channel <name> <channel>`');
                const channel = parseChannel(message, args[1]);
                if (!channel) return warn(message, 'Usage: `application channel <name> <channel>`');
                const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                if (!check) return warn(message, 'Application with that name does not exist.');
                run('UPDATE applications SET channel_id = ? WHERE name = ? AND guild_id = ?', channel.id, name, message.guild.id);
                return approve(message, `Application \`${name}\` channel has been set to ${channel}`);
            }
        },
        level: {
            aliases: [],
            data: { name: 'application level', description: 'Set the level for an application', usage: ',application level <name> <level>' },
            execute: async (message, args) => {
                if (!await needPerm(message, PermissionFlagsBits.ManageGuild)) return;
                const name = args[0];
                const level = parseInt(args[1], 10);
                if (!name || !Number.isInteger(level)) return warn(message, 'Usage: `application level <name> <level>`');
                const check = first('SELECT * FROM applications WHERE name = ? AND guild_id = ?', name, message.guild.id);
                if (!check) return warn(message, 'Application with that name does not exist.');
                run('UPDATE applications SET level = ? WHERE name = ? AND guild_id = ?', level, name, message.guild.id);
                return approve(message, `Application \`${name}\` level has been set to ${level}`);
            }
        }
    },
    listEmbeds: (guild, applications) => applications.map(application => createEmbed({
        color: COLORS.NEUTRAL,
        title: application.name
    }))
};
