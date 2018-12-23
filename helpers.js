'use strict';

var logger = require('winston');
var exports = module.exports = {};

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

var DELETE_TIME_LAPSE = 172800000;

class DeletionReport {
    constructor(channel, actual, wanted) {
        this.channel = channel;
        this.actual = actual;
        this.wanted = wanted;
    }
    perCent() {
        if (this.wanted !== 0) {
            return Math.round((this.actual / this.wanted) * 100);
        } else {
            return 0;
        }
    };
}

/**
 *
 * @param {Client} client
 */
exports.getAllChannels = function(client) {
    var guilds = client.guilds;
    var channelsByGuilds = {};
    guilds.forEach(function(guild) {
        channelsByGuilds[guild.id] = guild.channels;
    });
    return guilds;
};

/**
 *
 * @param {Client} client
 * @param {String} specifiedGuild
 */
exports.getAllChannelsGuild = function(client, specifiedGuild) {
    var channels = [];
    client.guilds.forEach(function(guild) {
        if (guild.name === specifiedGuild) {
            guild.channels.forEach(function(c) {
              if(c.type === 'text') {
                channels.push(c);
              }
            });
        }
    });
    return channels;
};

/**
 *
 * @param {Client} client
 * @param {String} specifiedGuild
 * @param {String} specifiedChannel
 */
exports.getChannelFromGuild = function(client, specifiedGuild, specifiedChannel) {
    var channels = [];
    client.guilds.forEach(function(g) {
        if (g.name === specifiedGuild) {
            g.channels.forEach(function(c) {
                if (c.name == specifiedChannel) {
                    channels.push(c);
                }
            });
        }
    });
    return channels;
};

/**
 *
 * @param {TextChannel} textChannel
 * @param {String} username
 * @param {Message} messageBefore
 * @return {Message[]} Messages of connected user for channel
 */
exports.fetchMessages = function(textChannel, username, messageBefore, lengthBefore) {
    var limit = 100;
    var allMessages = [];
    var lastMsg;
    return new Promise((resolve, reject) => {
        textChannel.fetchMessages({ limit: limit, before: messageBefore != undefined ? messageBefore : null })
            .then((messages) => {
                messages.map((msg) => {
                    if (msg.author.username === username) {
                        allMessages.push(msg);
                    }
                });
                //NB: Don't use .length but .size on messages!
                var currentTotal = (lengthBefore != undefined ? lengthBefore : 0) + messages.size
                logger.debug(`Fetching channel messages ... ${currentTotal}`)
                if (messages.size == limit) {
                    this.fetchMessages(textChannel, username, messages.lastKey(), currentTotal)
                        .then((messages) => {
                            allMessages = allMessages.concat(messages);
                            resolve(allMessages);
                        })
                        .catch((err) => {
                            logger.error(err);
                            reject(err);
                        });
                } else {
                    resolve(allMessages);
                }
            })
            .catch((err) => {
                logger.error(err);
                reject(err);
            });
    });
};

/**
 *
 * @param {TextChannel} channel
 * @param {String} username
 * @param {Boolean} quietMode
 * @returns {DeletionReport}
 */
exports.deleteMsgForChannel = function(channel, username, quietMode) {
    return new Promise((resolve, reject) => {
        this.fetchMessages(channel, username).then((messagesToBeDeleted) => {
            logger.info(`${messagesToBeDeleted.length} messages to delete`);
            var allPromises = Promise.all(messagesToBeDeleted.map(msg => new Promise((resolve, reject) => {
              var messageSentMoreThanTwoDaysAgo = Date.now() - msg.createdAt.getTime() >= DELETE_TIME_LAPSE;
              if(quietMode === false || messageSentMoreThanTwoDaysAgo) {
                msg.delete().then(res => {
                    /*
                    ------------------------------ FIXME ------------------------------
                    | Sometimes res is undefined. This is not happening               |
                    | while testing on small batch of deletion, but this is happening |
                    | while testing in real conditions.                               |
                    -------------------------------------------------------------------
                     */
                    logger.info(`Message ${msg.id} -> Deleted`);
                    resolve(msg);
                }).catch((err) => {
                    logger.error(err);
                    resolve(undefined);
                });
              } else {
                resolve(undefined);
              }
            })));
            allPromises.then(deletedMessages => {
                var filteredResults = deletedMessages.filter(msg => msg !== undefined);
                resolve(new DeletionReport(channel, filteredResults.length, messagesToBeDeleted.length));
            }).catch((err) => {
                logger.error(err.message);
                reject(err);
            });
        }).catch((err) => {
            logger.error(err);
            reject(err);
        });
    });
}

/**
 *
 * @param {TextChannel[]} textChannels
 * @param {String} username
 * @param {Boolean} quietMode
 * @returns {DeletionReport[]}
 */
exports.deleteMessages = function(textChannels, username, quietMode) {
    return new Promise((resolve, reject) => {
        var deletions = Promise.all(textChannels.map(chan => this.deleteMsgForChannel(chan, username, quietMode)));
        deletions.then(reports => {
            reports.map(report => {
                if (report.wanted !== 0) {
                    logger.info(`Channel: ${report.channel.name} (${report.channel.id}) -> ${report.actual}/${report.wanted} messages deleted (${report.perCent()}%)`);
                } else {
                    logger.info(`Channel: ${report.channel.name} (${report.channel.id}) -> No message to delete`);
                }
            });
            resolve(reports);
        }).catch((err) => {
            logger.error(err);
            reject(err);
        });
    });
}
