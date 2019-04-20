
const express = require("express");
const validUrl = require("valid-url");
const dotenv = require('dotenv');
const mongo = require("mongodb").MongoClient;

dotenv.config();
const DB_NAME = process.env.DB_NAME || "mongodb://localhost:27017/urls";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "url";
const EXAMPLE_URL = 'https://www.google.com';
const MESSAGE_TO_USER = "pass a url to create a new url shortener";
const USAGE_TEXT = "use the shortener to access the passed url";
const NOT_FOUND_URL = "Could not find url shortener.";
const NOT_VALID_URL_TEXT = "This is not a valid url.";
const NOT_VALID_ID_TEXT = "This is not a valid id.";

const app = express();

// Connect to database
function connect(next) {
	mongo.connect(DB_NAME, (err, db) => {
		if (err) {
			throw err;
		} else {
			next(db);
		}
	});
}

// find all url shorteners
function findAll(next) {
	connect(db => {
		const collection = db.collection(COLLECTION_NAME);
		collection.find().toArray((err, docs) => {
			if (err) {
				throw err;
			} else {
				next(docs);
			}
			db.close();
		});
	});
}

// find one url shortener
function find(id, next) {
	connect(db => {
		const collection = db.collection(COLLECTION_NAME);
		collection.find({ "id": id }).toArray((err, doc) => {
			if (err) {
				throw err;
			} else {
				next(doc);
			}
			db.close();
		});
	});
}

// insert a new url shortener into collection
function insert(id, url, next) {
	connect(db => {
		const collection = db.collection(COLLECTION_NAME);
		id = id.toString();
		collection.insertOne({ "id": id, "path": url }, (err, r) => {
			if (err) {
				throw err;
			} else {
				db.close();
				next();
			}
		});
	});
}

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
})

app.get("/", (req, res) => {
	// redirect to an example
	res.redirect(`/new/${EXAMPLE_URL}`);
});

app.get("/new/*", (req, res) => {
		// retrieve passed url and verify that it's a valid url
		// retrieve all url shorteners from database
		// and check available id for the new url shortener
		// insert url shortener document in database
		// display the url shortener json document to user
		const url = req.params[0];
		if (validUrl.isUri(url)) {
			findAll(docs => {
				const idList = [];
				let random;
				docs.forEach(doc => {
						idList.push(doc.id);
				});
				do {
					random = Math.floor(Math.random() * 1000);
				} while (idList.indexOf(random) > -1);
				
				insert(random, url, () => {
					const shortener = {
						passed_url:url,
            shortener: process.env.NODE_ENV === 'production' 
              ? `https://${req.hostname}/${random}`
              : `http://${req.hostname}:${process.env.PORT}/${random}`,
						message_to_user: MESSAGE_TO_USER,
						usage: USAGE_TEXT
					};
					res.setHeader("Content-Type", "application/json");
					res.send(JSON.stringify(shortener));	
				});
			});
		} else {
			res.send(NOT_VALID_URL_TEXT);
		}
});

app.get("/:id", (req, res) => {
	// verify if id is number
	// if not, send 404 error
	// otherwise, if url id is found in collection, redirect to url
	// else, display a message
	const { id } = req.params;
	if(!isNaN(id)) {
		find(id.toString(), doc => {
			if (doc[0]) {
				res.redirect(doc[0].path);
			} else {
				res.send(NOT_FOUND_URL);
			}
		});
	} else {
		res.send(NOT_VALID_ID_TEXT);
	}
});


app.listen(process.env.PORT, () => {
	console.log("server listening on port " + process.env.PORT);
});
