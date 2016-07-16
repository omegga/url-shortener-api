
var express = require("express"),
	validUrl = require("valid-url"),
	mongo = require("mongodb").MongoClient;

var dbName = process.env.DB_NAME || "mongodb://localhost:27017/urls",
	collectionName = process.env.COLLECTION_NAME || "url";

var app = express();

//Connect to database
function connect(next) {
	mongo.connect(dbName, function(err, db) {
		if (err) {
			throw err;
		} else {
			next(db);
		}
	});
}

//find all url shorteners
function findAll(next) {
	connect(function(db) {
		var collection = db.collection(collectionName);
		collection.find().toArray(function(err, docs) {
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
	connect(function(db) {
		var collection = db.collection(collectionName);
		collection.find({"id":id}).toArray(function(err, doc) {
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
	connect(function(db) {
		var collection = db.collection(collectionName);
		id = id.toString();
		collection.insertOne({"id":id,"path":url}, function(err, r) {
			if (err) {
				throw err;
			} else {
				db.close();
				next();
			}
		});
	});
}

app.get("/", function(req, res) {
	//redirect to an example
	res.redirect("https://"+req.hostname+"/new/https://www.google.com");
});

app.get("/new/*", function(req, res) {
		//retrieve passed url and verify that it's a valid url
		//retrieve all url shorteners from database
		//and check available id for the new url shortener
		//insert url shortener document in database
		//display the url shortener json document to user
		var url = req.params[0];
		if (validUrl.isUri(url)) {
			findAll(function(docs){
				var idList = [],
					random;
				docs.forEach(function(doc){
						idList.push(doc.id);
				});
				do {
					random = Math.floor(Math.random()*1000);
				} while (idList.indexOf(random)>0);
				
				insert(random, url, function() {
					var shortener = {
						passed_url:url,
						shortener:"https://"+req.hostname+"/"+random,
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

app.get("/:id", function(req, res) {
	//verify if id is number
	//if not, send 404 error
	//otherwise, if url id is found in collection, redirect to url
	//else, display a message
	var id = req.params.id;
	if(!isNaN(id)) {
		find(id.toString(), function(doc) {
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


app.listen(process.env.PORT, function() {
	console.log("server listening");
});