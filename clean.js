var path = require('path');
var program = require('commander');
var pkg = require(path.join(__dirname, 'package.json'));
var logger = require('winston');
var discord = require('discord.js');
var auth = require(path.join(__dirname, 'auth.json'));
var helpers = require('./helpers');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

program
    .version(pkg.version)
    .option('-g, --guild <guild>', 'Discord guild', '')
    .option('-c, --channel <channel>', 'Discord channel', '')
    .option('-t, --token <token>', 'Discord token', '')
    .option('--quiet', 'Delete all messages from 2 days before')
    .parse(process.argv);

const client = new discord.Client();

var token = undefined;
var quietMode = false;
if(program.quiet === true) {
  quietMode = true;
}
if (program.token !== '' && program.token !== undefined) {
    token = program.token;
} else if (auth.token !== undefined) {
    token = auth.token;
} else {
    logger.error('Needs a user token: provided with --token option or in auth.json');
    client.destroy();
}

client.login(token);

client.on('ready', function(evt) {
    logger.info(`Connected successfully as — ${client.user.username}`);
    if (program.guild === '') {
        logger.error('Not implemented yet — you should provide both a guild and a channel name')
        client.destroy();
    } else if (program.channel === '') {
        logger.info(`Will delete all messages in: ${program.guild}`)
        channels = helpers.getAllChannelsGuild(client, program.guild)
        channels.forEach(c => {
          logger.info(`Will delete messages for channel ${c.name}`)
          helpers.deleteMessages([c], client.user.username, quietMode)
              .then(messagesCountArr => {
                  logger.info(`Deletion finished for channel ${c.name}`)
              }).catch(err => {
                logger.error(err);
              });
          logger.info(`Deletion finished for channel ${c.name}`)
        });
    } else {
        logger.info(`Will delete all messages in: ${program.guild} — ${program.channel}`);
        channelsMatchingProvidedName = helpers.getChannelFromGuild(client, program.guild, program.channel)
        if (channelsMatchingProvidedName.length == 0) {
            logger.error(`No channel is matching the provided name: ${program.channel}`);
            client.destroy();
        } else if (channelsMatchingProvidedName.length == 1) {
            logger.info(`Deleting messages from channel ${program.channel}`);
        } else {
            logger.info('Several channels are matching the provided name, messages in all channels will be deleted');
        }
        helpers.deleteMessages(channelsMatchingProvidedName, client.user.username, quietMode)
            .then(messagesCountArr => {
                total = messagesCountArr.reduce((total, value) => total + value);
                logger.info(`Deletion finished`)
                client.destroy();
            }).catch(err => {
              logger.error(err);
              client.destroy();
          });
    }
});

client.on('disconnect', function(evt) {
    if (evt.code !== 1000) {
        logger.error(`Error: ${evt.reason}`);
    } else {
        logger.info('Bye');
    }
    process.exit(0);
});
