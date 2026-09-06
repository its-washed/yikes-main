const chalk = require('chalk');

const timestamp = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
};

const logger = {
    info: (msg) => console.log(chalk.gray(`[${timestamp()}]`) + chalk.blue(' INFO ') + msg),
    success: (msg) => console.log(chalk.gray(`[${timestamp()}]`) + chalk.green(' OK   ') + msg),
    warn: (msg) => console.log(chalk.gray(`[${timestamp()}]`) + chalk.yellow(' WARN ') + msg),
    error: (msg) => console.log(chalk.gray(`[${timestamp()}]`) + chalk.red(' ERR  ') + msg),
    command: (msg) => console.log(chalk.gray(`[${timestamp()}]`) + chalk.magenta(' CMD  ') + msg),
    debug: (msg) => {
        if (process.env.DEBUG) {
            console.log(chalk.gray(`[${timestamp()}]`) + chalk.cyan(' DBG  ') + msg);
        }
    }
};

module.exports = { logger };
