var logger = require("../log/logger");
var userModel = require("../model/userModel");
var async = require("async");
var check = require("validator").check;

module.exports = {
    findOrCreateByFBData: function (data, promise) {
	if (!data || !data.email) {
	    promise.fail();
	    return;
	}

	userModel.getByEmail(data.email, function (err, user) {
	    if (err) {
		logger.warn("Error when user.getByEmail: ", err);
		promise.fail();
		return;
	    }
	    if (user) {
		logger.debug("User exist: ", user);
		promise.fulfill(user);
	    } else {
		logger.debug("Can't find user. Create him");
		var user = {
		    facebookId: data.id,
		    email: data.email,
		}
		userModel.create(user);
		promise.fulfill(user);
	    }
	});
    },
    findUserById: function (id, callback) {
	userModel.getById(id, function (err, user) {
	    if (err) {
		logger.warn("Can't find user by id: ", id);
		callback(err);
		return;
	    }
	    if (!user) {
		logger.debug("User is null");
		callback(new Error("User not found"));
		return;
	    }
	    logger.debug("User found by id: ", user);
	    callback(null, user);
	});
    },
    registerByEmailAndPassword: function (email, password, callback) {
	async.series([
	    function (done) {
		try {
		    check(email).isEmail();
		    check(password, "Empty password").notEmpty();

		    logger.debug("user.ervice.registerByEmailAndPassword arguments verification succeffuly done");
		    done();
		} catch (exc) {
		    done(new Error(exc.message));
		}
	    },
	    function (done) {
		userModel.getByEmail(email, function(err, user) {
		    if (err) {
			logger.warn("Can't find user by email: ", email);
			done(err);
			return;
		    }
		    if (user) {
			logger.info("User already exists");
			done(new Error("User already exists"));
			return;
		    }

		    logger.debug("User with email %s is not exist. Nice!", email); 
		    done();
		});
	    },
	    function (done) {
		userModel.create({email: email, password: password}, function (err) {
		    if (err) {
			logger.warn("Can't create user. Email: ", email);
			done(err);
			return;
		    }

		    logger.debug("User created. Nice!");
		    callback();
		    done();
		});
	    }
	], function (err) {
	    if (err) {
		logger.debug("Async error captured: ", err.message);
		callback(err);
		return;
	    }

	    logger.debug("Async process serias without any error");
	});
    }
};
