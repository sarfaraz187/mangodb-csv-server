const csvtojson = require('csvtojson');
const { MongoClient } = require('mongodb');
const express = require('express');
const bodyParser= require('body-parser');
const multer = require('multer');
const fs = require("fs")

main();
const app = express();
var mongodb = '';
app.use(bodyParser.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3001;
let date = new Date();
let currentDate = date.getDate();
let fileName = '';
let arrayToInsert = [];

var storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'public') },
  filename: function (req, file, cb) {
    fileName = file.originalname;
    cb(null, currentDate + '-' + file.originalname);
  }
});

var upload = multer({ storage: storage }).single('file');

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(500).json(err)
    } else if (err) {
      return res.status(500).json(err)
    }
    writeToDatabase(mongodb);
    return res.status(200).send(req.file);
  });
});

app.get('/collection', async (req, res) => {
  // const database = mongodb.db("myFirstDatabase");
  const username = mongodb.collection("username");
  const cursor = await username.find({});

  if ((await cursor.count()) === 0) {
    console.log("No documents found!");
  }
  let data = await cursor.toArray();
  console.log(data);
  res.send(data);
});

app.listen(PORT, function() {
  console.log(`listening on ${PORT}`);
});

async function main() {
  const uri = "mongodb+srv://testuser:mongo123@readcsv.nlkwb.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
  MongoClient.connect(uri, { useUnifiedTopology: true }).then(async (client) => {
    console.log('DB Connected!');
    mongodb = await client.db();
  }).catch(err => {
    console.log(`DB Connection Error: ${err.message}`);
  });
}

async function writeToDatabase(client) {
  var collection = client.collection('username');
  const csvFilePath = `/Users/mohammedsarfaraz/Desktop/ReadCSV/server/public/${currentDate}-${fileName}`;
  console.log("====================== Uploading =================")
  csvtojson().fromFile(csvFilePath).then(async (source) => {
    for (var i = 0; i < source.length; i++) {
      var oneRow = { industry: source[i]["Industry"] }
      // console.log(oneRow);
      let foundDocument = await collection.findOne({ industry : source[i]["Industry"] });
      console.log({ foundDocument });
      (foundDocument === null) ? arrayToInsert.push(oneRow) : console.log("Already Exists");
      // (collection.findOne({ industry: source[i]["Industry"] })) ? console.log("Already Exists") : arrayToInsert.push(oneRow);
    }

    if (arrayToInsert.length > 0) {
      console.log(`====================== Inserting ${arrayToInsert.length} =================`);
      collection.insertMany(arrayToInsert, (err, result) => {
        if (err) console.log(err);
        if(result) {
          console.log("Import CSV into database successfully.");
          removeFile(csvFilePath);
        }
      });
    } else {
      removeFile(csvFilePath);
    }
  });
};

async function removeFile(filePath) {
  fs.unlink(filePath, function(err) {
    if (err) {
      throw err
    } else {
      console.log("Successfully deleted the file.")
    }
  });
}