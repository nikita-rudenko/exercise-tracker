const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const cors = require('cors');

const mongoose = require('mongoose');
mongoose.connect(
	process.env.MLAB_URI || 'mongodb://localhost/exercise-track',
	{ useNewUrlParser: true }
);
const Schema = mongoose.Schema;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// User Model with name required
const UserModel = mongoose.model(
	'UserModel',
	new Schema({ user: { type: String, required: true } })
);

// Exercise Model
const ExModel = mongoose.model(
	'ExModel',
	new Schema({
		userId: { type: String, required: true },
		description: { type: String, required: true },
		duration: { type: Number, required: true },
		date: Date
	})
);

app.use(express.static('public'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

// POST Create a user
app.post('/api/exercise/new-user', function(req, res) {
	const username = req.body.username;

	UserModel.countDocuments({ user: username }, (err, count) => {
		if (err) {
			res.json({ err });
		}
		if (count > 0) {
			res.end('The username already exists. Please use a different username');
		}

		const user = new UserModel({ user: username });

		user.save((err, data) => res.json({ id: data._id, username: data.user }));
	});
});

// POST create new exercise
app.post('/api/exercise/add/', function(req, res) {
	const userId = req.body.userId;

	UserModel.countDocuments({ _id: userId }, (err, count) => {
		if (err) res.json({ err });
		if (count <= 0) {
			res.end("User with this userId doesn't exist");
		}

		const Exercise = new ExModel({
			userId: req.body.userId,
			description: req.body.description,
			duration: req.body.duration,
			date: req.body.date
		});

		Exercise.save(function(err, data) {
			if (err) {
				console.log(err);
			}

			res.json({
				user: data.userId,
				description: data.description,
				duration: data.duration,
				date: new Date(data.date)
			});
		});
	});
});

app.get('/api/exercise/log?:userId/:from?/:to?/:limit?', function(req, res) {
	// userId parameter {required}
	const userId = req.query.userId;
	if (!userId) {
		res.end('Error! userId required');
	}

	// form search query
	const { from, to, limit } = req.query;
	let search = {
		userId
	};

	// FROM parameter [optional]
	if (from) {
		search.date ? (search.date = {}) : false;
		search.date.$gte = new Date(from);
	}

	// TO parameter [optional]
	if (to) {
		search.date ? (search.date = {}) : false;
		search.date.$lte = new Date(to);
	}

	// Limit parameter [optional]
	if (req.query.limit) {
		limit = parseInt(req.query.limit);
	}

	// Search results
	ExModel.find(search)
		.limit(limit)
		.then(ex => {
			return ex.length ? res.send(ex) : res.status(404).send('Nothing found');
		});
});

// Not found middleware
app.use((req, res, next) => {
	return next({ status: 404, message: 'not found' });
});

// Error Handling middleware
app.use((err, req, res, next) => {
	let errCode, errMessage;

	if (err.errors) {
		// mongoose validation error
		errCode = 400; // bad request
		const keys = Object.keys(err.errors);
		// report the first validation error
		errMessage = err.errors[keys[0]].message;
	} else {
		// generic or custom error
		errCode = err.status || 500;
		errMessage = err.message || 'Internal Server Error';
	}
	res
		.status(errCode)
		.type('txt')
		.send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
