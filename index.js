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
    collection: null
};

async function main() {
    // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    dbObjects.db = client.db(dbName);
    dbObjects.collection = dbObjects.db.collection('TCAS-DATA');
}
main()

async function checkForFlight(id) {
    return new Promise(async (resolve, reject) => {
        const filteredDocs = await dbObjects.collection.find({ id }).toArray();
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
            course: req.body.course
        }
        if(await checkForFlight(data.id) == null){
            console.log("Found no flight, creating.")
            const insertResult = await dbObjects.collection.insertOne(data);
            res.sendStatus(200);
        }else{
            console.log("Found flight, updating.")
            const updateResult = await dbObjects.collection.updateOne({ id: data.id }, { $set: data });
            res.sendStatus(200);
        }
    }else{
        res.sendStatus(400);
    }
})