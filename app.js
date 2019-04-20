
const express = require("express");
const validUrl = require("valid-url");
const dotenv = require('dotenv');
const mongo = require("mongodb").MongoClient;

dotenv.config();
const dbName = process.env.DB_NAME || "mongodb://localhost:27017/urls";
const collectionName = process.env.COLLECTION_NAME || "url";

const app = express();

//Connect to database
function connect(next) {
	mongo.connect(dbName, (err, db) => {
		if (err) {
			throw err;
		} else {
			next(db);
		}
	});
}

//find all url shorteners
function findAll(next) {
	connect(db => {
		const collection = db.collection(collectionName);
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

//find one url shortener
function find(id, next) {
	connect(db => {
		const collection = db.collection(collectionName);
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

//insert a new url shortener into collection
function insert(id, url, next) {
	connect(db => {
		const collection = db.collection(collectionName);
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
	//redirect to an example
	res.redirect(`/new/https://www.google.com`);
});

app.get("/new/*", (req, res) => {
		//retrieve passed url and verify that it's a valid url
		//retrieve all url shorteners from database
		//and check available id for the new url shortener
		//insert url shortener document in database
		//display the url shortener json document to user
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
					var shortener = {
						passed_url:url,
            shortener: process.env.NODE_ENV === 'production' 
              ? `https://${req.hostname}/${random}`
              : `http://${req.hostname}:${process.env.PORT}/${random}`,
						message_to_user:"pass a url to create a new url shortener",
						usage:"use the shortener to access the passed url"
					};
					res.setHeader("Content-Type","application/json");
					res.send(JSON.stringify(shortener));	
				});
			});
		} else {
			res.send("This is not a valid url.");
		}
});

app.get("/:id", (req, res) => {
	//verify if id is number
	//if not, send 404 error
	//otherwise, if url id is found in collection, redirect to url
	//else, display a message
	const { id } = req.params;
	if(!isNaN(id)) {
		find(id.toString(), doc => {
			if (doc[0]) {
				res.redirect(doc[0].path);
			} else {
				res.send("Could not find url shortener.");
			}
		});
	} else {
		res.send("Page not found.");
	}
});


app.listen(process.env.PORT, () => {
	console.log("server listening");
});
