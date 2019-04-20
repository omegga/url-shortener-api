
const express = require('express');
const validUrl = require('valid-url');
const dotenv = require('dotenv');
const mongo = require('mongodb').MongoClient;
const shortid = require('shortid');

dotenv.config();
const DB_NAME = process.env.DB_NAME || "mongodb://localhost:27017/urls";
const COLLECTION_NAME = process.env.COLLECTION_NAME || "url";
const EXAMPLE_URL = 'https://www.google.com';
const MESSAGE_TO_USER = "pass a url to create a new url shortener";
const USAGE_TEXT = "use the shortener to access the passed url";
const NOT_FOUND_URL = "Could not find url shortener.";
const NOT_VALID_URL_TEXT = "This is not a valid url.";
const NOT_VALID_ID_TEXT = "This is not a valid id.";

function createShortenerResponse(url, shortener, hostname) {
  return {
    passed_url: url,
    shortener: process.env.NODE_ENV === 'production'
      ? `https://${hostname}/${shortener}`
      : `http://${hostname}:${process.env.PORT}/${shortener}`,
    message_to_user: MESSAGE_TO_USER,
    usage: USAGE_TEXT
  };
}

function clientRequestLogger(req, res, next) {
  console.log(req.method, req.url);
  next();
}

mongo.connect(DB_NAME, (err, db) => {
  if (err) {
    throw err;
  }
  console.log('successfully connected to database');
  const collection = db.collection(COLLECTION_NAME);
  
  const app = express();
  app.use(clientRequestLogger);

  app.get("/", (req, res) => {
    // redirect to an example
    res.redirect(`/new/${EXAMPLE_URL}`);
  });
  
  app.get("/new/*", (req, res) => {
    const url = req.params[0];
    if (!validUrl.isUri(url)) {
      return res.send(NOT_VALID_URL_TEXT);
    }
    collection.findOne({ url }, (err, doc ) => {
      if (err) {
        throw err;
      }
      if (doc) {
        return res.json(createShortenerResponse(doc.url, doc.shortener, req.hostname));
      }
      collection.insertOne({ "url": url, "shortener": shortid.generate() }, (err, result) => {
        if (err) {
          throw err;
        }
        const [ insertedDoc ] = result.ops;
        return res.json(createShortenerResponse(insertedDoc.url, insertedDoc.shortener, req.hostname));
      });
    });
  });
  
  app.get("/:shortener", (req, res) => {
    collection.findOne({ "shortener": req.params.shortener }, (err, doc) => {
      if (err) {
        throw err;
      }
      if (!doc) {
        return res.send(NOT_FOUND_URL);
      }
      return res.redirect(doc.url);
    });
  });
  
  app.listen(process.env.PORT, () => {
    console.log("server listening on port " + process.env.PORT);
  });
});
