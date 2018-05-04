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
var wordcut = require("wordcut");
var _ = require("underscore");


wordcut.init();



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
        User.create({'sender_psid':sender_psid},function(err,newUser){
          if(err){
            console.log(err);
            response = {
              "text": `ขอโทษนะคะ เหมือนมีบางอย่างขัดข้องกรุณาลองใหม่ภายหลังค่ะ`
            }
          }
          else{
            response = {
              "text": `สวัสดีค่ะวันนี้เป็นอะไรมาคะ`
            }
          }
          return callSendAPI(sender_psid, response); 
        });
      }
      else{
        var sentence = wordcut.cut(received_message.txt).split("|");
        if(user[0].status == 1){
          var sympthom = firstMeet(sentence);
          if(!sympthom.length){
            response = {
              "text": `ขออภัยค่ะ หมอไม่เข้าใจค่ะ`
            }
          }
          else{
          user[0].sympthom = sympthom;
          _.each(user[0].sympthom,function(sym){
            if(sym.name == "ชัก"){
              response = {
                "text": `โดยปกติแล้วผู้ที่มีอาการชัก จะสามารถหยุดได้เองภายใน 1-2 นาที แต่หากมีอาการเกินกว่า 5 นาที หรือเมื่อหยุดชักแล้วหมดสติ ควรนำผู้ป่วยส่งให้ถึงมือแพทย์อย่างเร็วที่สุด 
                สามารถช่วยเหลือเบื่องต้นโดย ประคองผู้ป่วยให้นอนหรือนั่งลง ประคองศีรษะให้น้ำลายไหลออกทางมุมปากด้านใดด้านหนึ่ง และห้ามใส่อะไรลงไปในปากของผู้ที่ชักเด็ดขาด ควรสังเกตอาการและความผิดปกติของผู้ที่ชักตลอดเวลา เพื่อแจ้งแพทย์
                เบอร์โทรสายด่วนรถพยาบาล 1669`
              }
              break;
            }
          })
          }
        }
        else if(user[0].status == 2){
        }
      }
    
    // Sends the response message
    callSendAPI(sender_psid, response); 
    });

    
}

function firstMeet(sentence){
  var hold;
  var not;
  var sympthom;
  _.each(sentence,function(word){
      if(word == "ไม่"){
        not = true;
      }
      if(word == "ปวด"){
        hold = "ปวด";
      }
      if(word == "ชัก"){
        if(not){
          not = false;
        }
        else sympthom.push("ชัก")
      }
      if(word == "ไข้"){

      }
      if(word == "หมด"){
        hold = "หมด";
      }
      if(word == "ปาก"){
        hold = "ปาก"
      }
      if(word == "เบี้ยว"){
        if(hold == "ปาก"){
          hold = ""
          sympthom.push("ปากเบี้ยว")
        }else{
          
        }
      }
      if(word == "เหงื่อ"){
        hold = "เหงื่อ"
      }
      return sympthom;
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
