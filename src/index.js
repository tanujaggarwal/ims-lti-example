'use strict';

var bodyParser = require('body-parser'),
	express = require('express'),
	path = require('path'),
	lti = require('ims-lti');

// MemoryStore probably shouldn't be used in production
var nonceStore = new lti.Stores.MemoryStore();
var provider = null;
var outcome = null;

var secrets = Object.create(null);
secrets.key = 'secret';

function getSecret (consumerKey, cb) {
	var secret = secrets[consumerKey];
	if (secret) {
		cb(null, secret);
		return;
	}

	var err = new Error('Unknown consumer "' + consumerKey + '"');
	err.status = 403;

	cb(err);
}

function submit(){
	console.log("Entered in submit api");
	outcome = new lti.Extensions.Outcomes.OutcomeService(provider);
	if (!outcome){
		console.log("outcome service not present");
	}
	else{
		outcome.send_replace_result_with_url(.5,'https://google.com', function(err,result){
			if(err){
				console.log("error in sendingg result");
			}
			else{
				console.log("sucess");
			}
		}) 
	}
}

function handleLaunch (req, res, next) {
	console.log("some launch is done");
	if (!req.body) {
		var err = new Error('Expected a body');
		err.status = 400;

		return next(err);
	}
	else{
		console.log()
	}

	var consumerKey = req.body.oauth_consumer_key;
	if (!consumerKey) {
		var err = new Error('Expected a consumer');
		err.status = 422;

		return next(err);
	}

	getSecret(consumerKey, function (err, consumerSecret) {
		if (err) {
			return next(err);
		}

		provider = new lti.Provider(consumerKey, consumerSecret);


		provider.valid_request(req, function (err, isValid) {

			if (err || !isValid) {
				return next(err || new Error('invalid lti'));
			}

			// var body = {};
			// [
			// 	'roles', 'admin', 'alumni', 'content_developer', 'guest', 'instructor',
			// 	'manager', 'member', 'mentor', 'none', 'observer', 'other', 'prospective_student',
			// 	'student', 'ta', 'launch_request', 'username', 'userId', 'mentor_user_ids',
			// 	'context_id', 'context_label', 'context_title', 'body'
			// ].forEach(function (key) {
			// 	body[key] = provider[key];
			// });

			console.log(JSON.stringify(provider.body));	
			res.sendFile(path.join(__dirname, 'index.html'));

		});

	});
}

var app = express();

app.set('json spaces', 2);

// If using reverse proxy to terminate SSL
// Such as an Elastic-Load-Balence, ElasticBeanstalk, Heroku
// Uncomment the following line
app.enable('trust proxy');

app.post('/launch_lti', bodyParser.urlencoded({ extended: false }), handleLaunch);
app.post('/submit', bodyParser.urlencoded({ extended: false }), submit);
app.get('*', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));	
});

const port = process.env.PORT || 3001;


var server = require('http')
	.createServer(app)
	.listen(port, function () {
		var address = server.address();
		console.log('Listening on %s:%s', address.address, address.port);
	});
