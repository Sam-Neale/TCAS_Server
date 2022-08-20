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
    if(req.body.x && req.body.y && req.body.z && req.body.live && req.body.live.flight && req.body.live.server && req.body.airspeed && req.body.track && req.body.vs){
        const data = {
            id: `${req.body.live.flight}-${req.body.live.server}`,
            x: req.body.x,
            y: req.body.y,
            z: req.body.z,
            live:{
                flightID: req.body.live.flight,
                serverID: req.body.live.server,
            },
            airspeed: req.body.airspeed,
            track: req.body.track,
            isGrounded: req.body.isGrounded,
            vs: req.body.vs,
            ts: new Date().getTime(),
            manual: true
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
        case 2:
        case "6a04ffe8-765a-4925-af26-d88029eeadba":
            return dbObjects.trainingCollection;
            break;
        case 3:
        case "7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856":
            return dbObjects.expertCollection;
            break;
        case 1:
        case "d01006e4-3114-473c-8f69-020b89d02884":
            return dbObjects.casualCollection;
            break;
        default: null;
    }
}

function refreshOnlineFlights(){
    //Casual
    const options = {
        method: 'GET',
        url: 'https://api.infiniteflight.com/public/v2/sessions/d01006e4-3114-473c-8f69-020b89d02884/flights',
        headers: { Authorization: `Bearer ${process.env.IF_Key}` }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        if(response.statusCode == 200){
            const data = JSON.parse(body);
            
            data.result.forEach(async aircraft =>{
                const data = {
                    id: `${aircraft.flightId}-d01006e4-3114-473c-8f69-020b89d02884`,
                    x: aircraft.longitude,
                    y: aircraft.latitude,
                    z: aircraft.altitude,
                    live: {
                        flightID: aircraft.flightId,
                        serverID: "d01006e4-3114-473c-8f69-020b89d02884",
                    },
                    airspeed: aircraft.speed,
                    track: aircraft.track,
                    isGrounded: aircraft.airspeed > 100,
                    vs: aircraft.verticalSpeed,
                    ts: new Date().getTime(),
                    manual: false
                }
                const possiblePreExisting = await checkForFlight(data.id, getServerCollection("d01006e4-3114-473c-8f69-020b89d02884"))
                if(possiblePreExisting == null){
                    const insertResult = await (getServerCollection("d01006e4-3114-473c-8f69-020b89d02884")).insertOne(data);
                }else{
                    if(possiblePreExisting.manual == false){
                        const updateResult = await (getServerCollection("d01006e4-3114-473c-8f69-020b89d02884")).updateOne({ id: data.id }, { $set: data });
                    }
                }
            })
        }
    });
    //Training
    const trainingOptions = {
        method: 'GET',
        url: 'https://api.infiniteflight.com/public/v2/sessions/6a04ffe8-765a-4925-af26-d88029eeadba/flights',
        headers: { Authorization: `Bearer ${process.env.IF_Key}` }
    };

    request(trainingOptions, function (error, response, body) {
        if (error) throw new Error(error);

        if (response.statusCode == 200) {
            const data = JSON.parse(body);

            data.result.forEach(async aircraft => {
                const data = {
                    id: `${aircraft.flightId} 6a04ffe8-765a-4925-af26-d88029eeadba`,
                    x: aircraft.longitude,
                    y: aircraft.latitude,
                    z: aircraft.altitude,
                    live: {
                        flightID: aircraft.flightId,
                        serverID: "6a04ffe8-765a-4925-af26-d88029eeadba",
                    },
                    airspeed: aircraft.speed,
                    track: aircraft.track,
                    isGrounded: aircraft.airspeed > 100,
                    vs: aircraft.verticalSpeed,
                    ts: new Date().getTime(),
                    manual: false
                }
                const possiblePreExisting = await checkForFlight(data.id, getServerCollection("6a04ffe8-765a-4925-af26-d88029eeadba"))
                if (possiblePreExisting == null) {
                    const insertResult = await (getServerCollection("6a04ffe8-765a-4925-af26-d88029eeadba")).insertOne(data);
                } else {
                    if (possiblePreExisting.manual == false) {
                        const updateResult = await (getServerCollection("6a04ffe8-765a-4925-af26-d88029eeadba")).updateOne({ id: data.id }, { $set: data });
                    }
                }
            })
        }
    });
    //Expert
    const expertOptions = {
        method: 'GET',
        url: 'https://api.infiniteflight.com/public/v2/sessions/7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856/flights',
        headers: { Authorization: `Bearer ${process.env.IF_Key}` }
    };

    request(expertOptions, function (error, response, body) {
        if (error) throw new Error(error);

        if (response.statusCode == 200) {
            const data = JSON.parse(body);

            data.result.forEach(async aircraft => {
                const data = {
                    id: `${aircraft.flightId} 7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856`,
                    x: aircraft.longitude,
                    y: aircraft.latitude,
                    z: aircraft.altitude,
                    live: {
                        flightID: aircraft.flightId,
                        serverID: "7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856",
                    },
                    airspeed: aircraft.speed,
                    track: aircraft.track,
                    isGrounded: aircraft.airspeed > 100,
                    vs: aircraft.verticalSpeed,
                    ts: new Date().getTime(),
                    manual: false
                }
                const possiblePreExisting = await checkForFlight(data.id, getServerCollection("7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856"))
                if (possiblePreExisting == null) {
                    const insertResult = await (getServerCollection("7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856")).insertOne(data);
                } else {
                    if (possiblePreExisting.manual == false) {
                        const updateResult = await (getServerCollection("7e5dcd44-1fb5-49cc-bc2c-a9aab1f6a856")).updateOne({ id: data.id }, { $set: data });
                    }
                }
            })
        }
    });
}

setInterval(refreshOnlineFlights, 2000);

async function checkOutdatedFlights(){
    //Casual
    const casualFlights = await(getServerCollection(1)).find({}).toArray();
    casualFlights.forEach(flight =>{
        if(new Date().getTime() - flight.ts > 1000 * 60 * 10){
            (getServerCollection(1)).deleteMany({ id: flight.id });
        }
    })
    //Training
    const trainingFlights = await (getServerCollection(2)).find({}).toArray();
    trainingFlights.forEach(flight => {
        if (new Date().getTime() - flight.ts > 1000 * 60 * 10) {
            (getServerCollection(2)).deleteMany({ id: flight.id });
        }
    })
    //Expert
    const expertFlights = await (getServerCollection(3)).find({}).toArray();
    expertFlights.forEach(flight => {
        if (new Date().getTime() - flight.ts > 1000 * 60 * 10) {
            (getServerCollection(3)).deleteMany({ id: flight.id });
        }
    })
}
setInterval(checkOutdatedFlights, 1000 * 60);