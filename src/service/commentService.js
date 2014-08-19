var db = require("randoDB");
var logger = require("../log/logger");
var async = require("async");
var Errors = require("../error/errors");

module.exports = {
    delete: function (user, randoId, callback) {
	logger.debug("[commentService.delete, ", user.email, "] Start delete rando: ", randoId);
	var self = this;

        async.detect(user.randos, function (rando, done) {
            done(rando.user.randoId == randoId || rando.stranger.randoId == randoId);
        }, function (rando) {
            if (!rando) {
                callback(Errors.RandoNotFound());
                return;
            }

            logger.debug("[commentService.delete, ", user.email, "] Rando found. Delete rando.");
            if (rando.stranger.randoId == randoId) {
                rando.stranger.delete = 1;
            } else {
                rando.user.delete = 1;
            }

            db.user.update(user, function (err) {
                if (err) {
                    callback(Errors.System());
                    return;
                }
                callback(null, {command: "delete", result: "done"});
            });
        });
    },
    unDelete: function (user, randoId, callback) {
	logger.debug("[commentService.unDelete, ", user.email, "] Start unDelete rando: ", randoId);
	var self = this;

        async.detect(user.randos, function (rando, done) {
            done(rando.user.randoId == randoId || rando.stranger.randoId == randoId);
        }, function (rando) {
            if (!rando) {
                callback(Errors.RandoNotFound());
                return;
            }

            logger.debug("[commentService.unDelete, ", user.email, "] Rando found. UnDelete rando.");
            if (rando.stranger.randoId == randoId) {
                rando.stranger.delete = 0;
            } else {
                rando.user.delete = 0;
            }

            db.user.update(user, function (err) {
                if (err) {
                    callback(Errors.System());
                    return;
                }
                callback(null, {command: "undelete", result: "done"});
            });
        });
    },
    report: function (user, randoId, callback) {
	logger.debug("[commentService.report, ", user.email, "] Start report for rando: ", randoId);
	var self = this;

	async.waterfall([
	    function (done) {
		self.updateRando(user.id, randoId, function (rando) {
		    rando.stranger.report = 1;
		}, function (err, rando) {
		    done(null, rando.stranger.user, rando.stranger.randoId);
		});
	    },
	    function (strangerId, randoId, done) {
		self.updateRando(strangerId, randoId, function (rando) {
		    rando.user.report = 1;
		}, function () {
		    done();
		});
	    },
	], function (err) {
	    if (err) {
		logger.warn("[commentService.report, ", user.email, "] Waterfall error: ", err);
		callback(err);
		return;
	    }
	    callback(null, {command: "report", result: "done"});
	});
    },
    updateRando: function (userId, randoId, updater, callback) {
	this.findUserWithRando(userId, randoId, function (err, user, rando) {
	    if (err) {
		logger.warn("[commentService.updateRando, ", userId, "] Error, when run findUserWithRando. userId: ", userId, " randoId: ", randoId, " error: ", err);
		callback(err);
		return;
	    } else if (!rando) {
		logger.warn("[commentService.updateRando, ", user.email, "] Rando is not exist, after run findUserWithRando. userId: ", userId, " randoId: ", randoId);
		callback(Errors.RandoForCommentNotFound());
		return;
	    }

	    logger.debug("[commentService.updateRando, ", user.email, "] Trigger updater with rando with id: ", randoId);


	    updater(rando);

	    db.user.update(user);
	    callback(null, rando);
	});
    },
    findUserWithRando: function (userId, randoId, callback) {
	db.user.getById(userId, function (err, user) {
	    if (err) {
		logger.warn("[commentService.findUserWithRando, ", userId, "] Can't find user by id: ", userId);
		callback(Errors.System(err));
		return;
	    } else if (!user) {
		logger.debug("[commentService.findUserWithRando, ", userId, "] User not found: ", userId);
		callback(Errors.UserForCommentNotFound());
		return;
	    } else if (!user.randos || user.randos.length == 0) {
		logger.debug("[commentService.findUserWithRando, ", user.email, "] User does not have rando");
		callback(Errors.RandoForCommentNotFound());
		return;
	    }

	    logger.debug("[commentService.findUserWithRando, ", user.email, "] Found user.");

	    async.filter(user.randos, function (rando, done) {
		logger.debug("[commentService.findUserWithRando, ", user.email, "] Filter rando: ", rando.stranger.randoId, " == ", randoId);
		//TODO: think about correction this predicate:
		done(rando.stranger.randoId == randoId || rando.user.randoId == randoId);
	    }, function (result) {
		logger.debug("[commentService.findUserWithRando, ", user.email, "] Found randos: ", result.length);
		callback(null, user, result[0]);
	    });
	});
    }
};
