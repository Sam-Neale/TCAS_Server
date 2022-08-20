//@ts-check

//Dependancies
const express = require('express');
const request = require('request');
const { MongoClient } = require('mongodb');
require('dotenv').config();

//DB

// Connection URL
const url = process.env.db_connection;
const client = new MongoClient(url);

// Database Name
const dbName = 'TCAS';
const dbObjects = {
    db: null,
    expertCollection: null,
    trainingCollection: null,
    casualCollection: null
};

async function main() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    dbObjects.db = client.db(dbName);
    dbObjects.expertCollection = dbObjects.db.collection('TCAS-EXPERT');
    dbObjects.trainingCollection = dbObjects.db.collection('TCAS-TRAINING');
    dbObjects.casualCollection = dbObjects.db.collection('TCAS-CASUAL');
}
main()

async function checkForFlight(id, collection) {
    return new Promise(async (resolve, reject) => {
        const filteredDocs = await collection.find({ id }).toArray();
        console.log(filteredDocs)
        resolve(filteredDocs.length == 0 ? null: filteredDocs[0]);
    })
}

//Express
const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.listen(8080, ()=>{
    console.log("Listening on port 8080");
});

//App
app.post("/tcasIN", async (req,res)=>{
    console.log(req.body);
    if(req.body.x && req.body.y && req.body.z && req.body.live && req.body.live.flight && req.body.live.server && req.body.groundSpeed && req.body.course){
        const data = {
            id: `${req.body.live.flight}-${req.body.live.server}`,
            x: req.body.x,
            y: req.body.y,
            z: req.body.z,
            live:{
                flightID: req.body.live.flight,
                serverID: req.body.live.server,
            },
            groundSpeed: req.body.groundSpeed,
            course: req.body.course,
            isGrounded: req.body.isGrounded
        }
        if(await checkForFlight(data.id, getServerCollection(req.body.live.server)) == null){
            console.log("Found no flight, creating.")
            const insertResult = await (getServerCollection(req.body.live.server)).insertOne(data);
            res.sendStatus(200);
        }else{
            console.log("Found flight, updating.")
            const updateResult = await (getServerCollection(req.body.live.server)).updateOne({ id: data.id }, { $set: data });
            res.sendStatus(200);
        }
    }else{
        res.sendStatus(400);
    }
});

app.get("/tcasOUT", async (req, res) => {
    if(req.query.server){
        const docs = await (getServerCollection(req.query.server)).find({}).toArray();
        const filteredDocs = [];
        docs.forEach(doc => {
            console.log(doc);
            delete doc['_id'];
            filteredDocs.push(doc);
        })
        res.status(200);
        res.json(filteredDocs);
    }else{
        res.sendStatus(400);
    }
    
})

function getServerCollection(id){
    switch(id){
        case "6a04ffe8-765a-4925-af26-d88029eeadba":
            return dbObjects.trainingCollection;
            break;
        case "7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856":
            return dbObjects.expertCollection;
            break;
        case "d01006e4-3114-473c-8f69-020b89d02884":
            return dbObjects.casualCollection;
            break;
        default: null;
    }
}