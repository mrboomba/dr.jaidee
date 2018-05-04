'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server
const  request = require('request');
var mongodb = require("mongodb");
var mongoose = require('mongoose');
var ObjectID = mongodb.ObjectID;
var User = require("./models/user");
// Creates the endpoint for our webhook

var db;


mongoose.connect(process.env.MONGODB_URI || "mongodb://mrboomba:bcc32171@ds115350.mlab.com:15350/heroku_tkkbw8c3", function (err, client) {
  if (err) {
    console.log(err);
    process.exit(1);
  }

  // Save database object from the callback for reuse.
  // db = client.db();
  console.log("Database connection ready");

  // Initialize the app.
  app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));
});


app.post('/webhook', (req, res) => {  
 
    let body = req.body;
  
    // Checks this is an event from a page subscription
    if (body.object === 'page') {
  
      // Iterates over each entry - there may be multiple if batched
      body.entry.forEach(function(entry) {
  
        // Gets the message. entry.messaging is an array, but 
        // will only ever contain one message, so we get index 0
        let webhook_event = entry.messaging[0];

        // Get the sender PSID
  let sender_psid = webhook_event.sender.id;
  console.log('Sender PSID: ' + sender_psid);
  if (webhook_event.message) {
    handleMessage(sender_psid, webhook_event.message);        
  } else if (webhook_event.postback) {
    handlePostback(sender_psid, webhook_event.postback);
  }      

});

      
  
      // Returns a '200 OK' response to all requests
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Returns a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });

  // Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "EAAIYM3fwgioBAEO9WZCLNDBIbu1LgM3qfZABxMgDNkVEjMi8EulKbNWJBTa8SU1GZC4PNlyJlZB7ScT0DyRCEkS5YQobE7vd7lFcg94DLiVpHIaSLSEe50TYJeZCLvQ2OJBIPbsFHu3CVlvjCDrAk6SPUMQN0qk8Jg5WJ1h83dAZDZD"
      
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
      
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
    
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);      
      }
    }
  });

// Handles messages events
function handleMessage(sender_psid, received_message) {

    let response;
    
    User.find({'sender_psid':sender_psid},function(err,user){
      console.log("Somethings");
      if(err){
        console.log(err);
      }
      else if(!user.length){
        console.log(user);
        
      }
      // Check if the message contains text
    if (received_message.text) {    
  
      // Create the payload for a basic text message
      response = {
        "text": `You sent the message: "${received_message.text}". Now send me an image!`
      }
    }  
    
    // Sends the response message
    callSendAPI(sender_psid, response); 
    });

    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
   // Construct the message body
   let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": "EAAIYM3fwgioBAEO9WZCLNDBIbu1LgM3qfZABxMgDNkVEjMi8EulKbNWJBTa8SU1GZC4PNlyJlZB7ScT0DyRCEkS5YQobE7vd7lFcg94DLiVpHIaSLSEe50TYJeZCLvQ2OJBIPbsFHu3CVlvjCDrAk6SPUMQN0qk8Jg5WJ1h83dAZDZD" },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

// Sets server port and logs message on success
