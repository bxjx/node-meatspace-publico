'use strict';

var level = require('level');
var ttl = require('level-ttl');
var uuid = require('uuid');
var Sublevel = require('level-sublevel');

var Publico = function (user, options) {
  var self = this;

  var DEFAULT_TTL = 10000; // 10 seconds
  var CHAT_TTL_LONG = 259200000; // 3 days

  var setTime = function () {
    return Date.now();
  };

  if (!options) {
    options = {};
  }

  this.user = user;
  this.dbPath = options.db || './db';
  this.limit = options.limit || 30;
  this.db = Sublevel(level(this.dbPath, {
    createIfMissing: true,
    valueEncoding: 'json'
  }));
  // Remove ttl
  //this.db = ttl(this.db, { checkFrequency: options.frequency || 10000 });

  var sendChat = function (key, chat, created, options, callback) {
    var ttl = DEFAULT_TTL;

    if (options.ttl) {
      ttl = parseInt(options.ttl, 10);

      if (isNaN(ttl)) {
        ttl = DEFAULT_TTL;
      }
    }

    var key = uuid.v1();

    callback(null, {
      message: chat,
      media: options.media || false,
      ttl: ttl,
      key: key,
      created: created
    });
  };

  this.getChat = function (key, callback) {
    self.db.get(key, function (err, chat) {
      if (err || !chat) {
        callback(new Error('Chat not found'));
      } else {
        callback(null, chat);
      }
    });
  };

  this.getChats = function (reverse, callback) {
    var chats = [];

    self.db.createReadStream({
      limit: self.limit,
      reverse: reverse

    }).on('data', function (data) {

      chats.push(data);
    }).on('error', function (err) {

      callback(err);
    }).on('end', function () {

      callback(null, {
        chats: chats
      });
    });
  };

  this.addChat = function (chat, options, callback) {
    var ttl = DEFAULT_TTL;

    if (!options) {
      options = {};
    }

    if (options.ttl) {
      ttl = parseInt(options.ttl, 10);

      if (isNaN(ttl)) {
        ttl = DEFAULT_TTL;
      }
    }

    var created = setTime();
    var key = uuid.v1();

    self.db.put(key, {
      message: chat,
      media: options.media || false,
      ttl: ttl,
      created: created
    }, { ttl: ttl }, function (err) {
      if (err) {
        callback(err);
      } else {
        sendChat(key, chat, created, options, callback);
      }
    });
  };
};

module.exports = Publico;
