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
app.listen("/tcasIN", async (req,res)=>{
    console.log(req.body);
    res.sendStatus(200);
})