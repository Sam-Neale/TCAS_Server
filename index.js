//@ts-check

//Dependancies
const express = require('express');
const request = require('request');
require('dotenv').config();

//Express
const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.listen(8080, ()=>{
    console.log("Listening on port 8080");
});

//App
app.post("/tcasIN", async (req,res)=>{
    const options = {
        method: 'GET',
        url: 'https://iftracker.net/tcasIN',
        headers: { 'Content-Type': 'application/json' }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log(body);
    });
    res.sendStatus(200);
})