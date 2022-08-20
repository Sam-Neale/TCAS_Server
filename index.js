//@ts-check

//Dependancies
const express = require('express');
const request = require('request');
require('dotenv').config();

//Express
const app = express();
app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.listen(8080)