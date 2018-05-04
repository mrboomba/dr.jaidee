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

app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

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

app.get('/',(req,res)=>{
  res.end("Kwam pen suan tua")
})

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
    
    User.findOne({'sender_psid':sender_psid},function(err,user){
      console.log("Somethings");
      if(err){
        console.log(err);
      }
      else if(!user){

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
      else if(user.status==0){
        
        user.status = 1
        User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,updateuser){
          response = {
            "text": `สวัสดีค่ะวันนี้เป็นอะไรมาคะ`
          }
          return callSendAPI(sender_psid, response); 
        })
        

      }
      else{
        var sentence = wordcut.cut(received_message.text).split("|");
        if(user.status == 1){
          var sympthom = []
          sympthom = firstMeet(sentence,function(sympthom){
          if(sympthom.length == 0&&user.symptom.length==0){
            response = {
              "text": `ขออภัยค่ะ หมอไม่เข้าใจค่ะ`
            }
            return  callSendAPI(sender_psid, response); 
          }
          else{
            var arr =[];
          for(var i =0 ; i<sympthom.length;i++){
            var tmp = {};
            tmp ={'name':sympthom[i],
            'level':0,
            'description':"",
            'duration':""}
              arr.push(tmp);
          }
          console.log(user);
          User.findOneAndUpdate({'sender_psid':sender_psid},{$set:{'symptom':arr}},{new:true},function(err,updateuser){
            if(err){
              console.log(err); 
            }
            else
            console.log(updateuser);
            for(var i =0 ;i<updateuser.symptom.length;i++){
              if(updateuser.symptom[i].name == "หมดสติ"){
                updateuser.symptom = [];
                updateuser.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},updateuser,function(err,usr){
                  response = {
                    "text": `ประเมินการหมดสติ โดยการตะโกนเรียกดังๆ และเขย่าที่ไหล่ แต่ควรระวังหากมีการบาดเจ็บที่กระดูกคอ ถ้าพบว่าหมดสติ ให้ตะโกนเรียกคนอื่นมาช่วย
                    ขอความช่วยเหลือจากผู้อื่นและให้ช่วยตามรถพยาบาล เช่น เรียก 1669 ระบบบริการ การแพทย์ฉุกเฉิน หรือ 1772 จัดท่าให้ผู้ป่วยนอนหงาย ระหว่างจัดท่าควรระวัง ประคองกระดูกคอของผู้ป่วยอย่างดี
                    เปิดทางเดินหายใจ โดยใช้มือข้างหนึ่งกดหน้าผากและมืออีกข้างหนึ่งเชยคางให้ยกขึ้น ท่านี้จะทำให้ทางเดินหายใจเปิดโล่ง
                    ตรวจการหายใจประมาณ 10 วินาที โดยก้มหน้าลงไปให้แก้มอยู่ใกล้กับจมูกและปากของผู้ป่วย หน้าของผู้ช่วยเหลือจะต้องตะแคงหันไปทางหน้าอกของผู้ป่วย ให้ฟังเสียงลมหายใจของผู้ป่วยและสายตามองที่หน้าอกว่ามีการกระเพื่อมขึ้นลงหรือไม่
                    ถ้ายังหายใจ ให้จัดท่าผู้ป่วยนอนในท่าพักฟื้นในลักษณะนอนตะแคงกึ่งคว่ำ งอขาผู้ป่วยยันพื้นไว้หนึ่งข้างคล้ายๆกับนอนเอาขาก่ายหมอนข้าง ใช้มือของผู้ป่วยในด้านตรงข้ามวางหนุนคางไว้ เพื่อเปิดทางเดินหายใจ และระบายเสมหะ หรือน้ำลายได้ง่าย การเปลี่ยนให้ผู้ป่วยนอนท่านี้จะต้องแน่ใจว่า ไม่มีการบาดเจ็บที่กระดูกคอ
                    ถ้าหากผู้ป่วยที่หมดสติ หยุดหายใจให้ผายปอด 2 ครั้งในทันที
                    การผายปอด ช่วยการหายใจ โดยใช้นิ้วชี้และนิ้วหัวแม่มือบีบจมูก ขณะเดียวกันต้องเปิดการเดินหายใจด้วยการกดหน้าผาก เชยคาง ประกบปาก เข้ากับปากของผู้ป่วย เป่าลมเข้าไป ให้หน้าอกของผู้ป่วยยกขึ้นนาน 1 – 2 วินาที แล้วถอนปากออกสูดลมหายใจ แล้วประกบปากเป่าลมเข้าไปอีกครั้ง ทำการผายปอด 2 ครั้ง และต่อด้วยการกดหน้าอกนวดหัวใจทันที
                    การนวดหัวใจ ให้วางส้นมือขนานกับแนวกึ่งกลางหน้าอก มืออีกข้างหนึ่งซ้อนทับมือแรก กดหน้าอกให้ยุบลงไปประมาณ 1.5 – 2 นิ้ว กดหน้าอกจำนวน 30 ครั้งด้วยอัตราเร็ว 100 ครั้ง / นาที โดยทำสลับกับการเป่าปาก 2 ครั้ง ไปเรื่อยๆอย่างต่อเนื่องโดยไม่หยุดพัก จนกระทั่งผู้ป่วยมีอาการไอ หรือขยับตัวหรือหายใจได้เอง หรือเมื่อมีทีมช่วยเหลือมาถึงจึงจะหยุดได้
                    สำหรับขั้นตอนการผายปอด หากไม่แน่ใจว่าผู้ป่วยมีโรคติดต่อหรือไม่ หรือไม่ใช่ญาติสนิท ผู้ช่วยเหลือสามารถทำการนวดหัวใจด้วยการกดหน้าอกเพียงอย่างเดียวด้วยความเร็ว 100 ครั้ง/นาที จนกว่าผู้ป่วยจะหายใจได้เองหรือทีมช่วยเหลือมาถึง`
                  }
                  return callSendAPI(sender_psid, response);
                  
                }) 
              }
              if(updateuser.symptom[i].name == "ชัก"){
                updateuser.symptom = [];
                updateuser.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},updateuser,function(err,usr){
                  response = {
                    "text": `โดยปกติแล้วผู้ที่มีอาการชัก จะสามารถหยุดได้เองภายใน 1-2 นาที แต่หากมีอาการเกินกว่า 5 นาที หรือเมื่อหยุดชักแล้วหมดสติ ควรนำผู้ป่วยส่งให้ถึงมือแพทย์อย่างเร็วที่สุด 
                    สามารถช่วยเหลือเบื่องต้นโดย ประคองผู้ป่วยให้นอนหรือนั่งลง ประคองศีรษะให้น้ำลายไหลออกทางมุมปากด้านใดด้านหนึ่ง และห้ามใส่อะไรลงไปในปากของผู้ที่ชักเด็ดขาด ควรสังเกตอาการและความผิดปกติของผู้ที่ชักตลอดเวลา เพื่อแจ้งแพทย์
                    เบอร์โทรสายด่วนรถพยาบาล 1669`
                  }
                  return callSendAPI(sender_psid, response);
                  
                }) 
              }
              if(updateuser.symptom[i].name == "ปากเบี้ยว"){
                updateuser.symptom = [];
                updateuser.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},updateuser,function(err,usr){
                  response = {
                    "text": `โรคเบลบ์ส พัลซี่ (Bell’s Palsy) หรือโรคใบหน้าเบี้ยวครึ่งซีก ซึ่งสาเหตุของโรคนี้เกิดจากการติดเชื้อไวรัสที่เป็นสาเหตุของโรคไข้หวัด  ผู้ป่วยที่เป็นโรคนี้ไม่ต้องตื่นตระหนักแต่ประการใด เพราะผู้ป่วยโรคนี้กว่า 90% มักจะหายได้เอง โดยจะค่อย ๆ ดีขึ้นภายใน 2-3 อาทิตย์ ทั้งนี้ควรหมั่นสังเกตอาการและดูแลสุขภาพตนเองดังต่อไปนี้ 
                    •	หากมีอาการแขนขาอ่อนแรงร่วมด้วย มิได้เป็นแค่เฉพาะส่วนใบหน้าเท่านั้น อาจะเป็นอาการเริ่มต้นของโรคหลอดเลือดสมองตีบ ควรรีบพบแพทย์ 
                    •	ผู้ป่วยอาจมีอาการตาแดงหรือตาอักเสบได้ เนื่องจากตาปิดไม่สนิท ควรใส่แว่นหรือใช้ผ้าสะอาดปิดตาไว้ 
                    •	ควรพยายามแยกเขี้ยวหรือยิงฟันเพื่อบริหารกล้ามเนื้อใบหน้าในระหว่างที่ยังมีอาการ 
                    •	หมั่นดูแลสุขภาพกายใจให้แข็งแรงตลอดเวลา ไม่เครียดและพักผ่อนให้เพียงพอ เพื่อป้องกันโรคไข้หวัด อันเป็นสาเหตุของอาการโรคเบลล์ส พัลซี่
                    แต่หากเป็นนานแล้วยังไม่หายแนะนำให้พบแพทย์เพราะอาจเป็นอาการของเส้นเลือดสมองตีบได้ค่ะ `
                  }
                  return callSendAPI(sender_psid, response);
                  
                }) 
              }
              if(updateuser.symptom[i].name == "ปวดหัว"){
                updateuser.follow = "ปวดหัว"
                updateuser.status = 2;
                return User.findOneAndUpdate({'sender_psid':sender_psid},updateuser,function(err,usr){
                  response = {
                    "text": `ปวดหัวแบบใหนคะ 1.ปวดหัวข้างเดียว 2.ปวดหัว ตื้อๆ หนักๆ 3.ปวดหน่วงๆ ที่หน้าผากและกระบอกตา`
                  }
                  return callSendAPI(sender_psid, response);
                  
                }) 
              }

              if(updateuser.symptom[i].name == "ปวดท้อง"){
                updateuser.follow = "ปวดท้อง"
                updateuser.status = 2;
                return User.findOneAndUpdate({'sender_psid':sender_psid},updateuser,function(err,usr){
                  response = {
                    "text": `ปวดหัวแบบใหนคะ 1.ชายโครงขวา  2.ใต้ลิ้นปี่ 3.ปวดบั้นเอว 4.ปวดรอบสะดือตรงกับตำแหน่งลำไส้เล็ก 5.ปวดท้องน้อยซ้ายหรือขวา 6.ปวดท้องน้อย  `
                  }
                  return callSendAPI(sender_psid, response);
                  
                }) 
              }
              
            }
          
          });
          
          }

          });
          
        }
        else if(user.status == 2){
          var sentence = wordcut.cut(received_message.text).split("|")
          if(user.follow == "ปวดหัว"){
            if(_.contains(sentence,"1")||_.contains(sentence,"ข้างเดียว")){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `อาการปวดหัวแบบนี้เป็นอาการปวดเนื่องมาจากโรคไมเกรน ระยะเวลาของอาการปวดอาจแตกต่างกันไปในผู้ป่วยแต่ละราย บางรายอาจปวดนานถึง 72 ชั่วโมง ซึ่งโดยทั่วไปแล้วยาแก้ปวดธรรมดาแบบพาราเซตามอลมักใช้ไม่ได้ผลกับการปวดหัวแบบไมเกรน ต้องใช้ยาแก้ปวดที่แรงขึ้น เพราะฉะนั้นควรปรึกษาแพทย์เพื่อสั่งยาให้จะดีกว่านะคะ อีกอย่างหนึ่งก็คือ หากมีอาการปวดหัวจากไมเกรนบ่อยๆ แพทย์จะสามารถแนะนำให้กินยาป้องกันได้ด้วยค่ะ`
                }
                return callSendAPI(sender_psid, response);
                  
                }) 
              
            }
            else if(_.contains(sentence,"2")||_.contains(sentence,"ตื้อ")){
              var obj = _.find(user.symptom, function (obj) { return obj.name === "ไข้"; });
              if(!obj){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `คุณอาจกำลังเจออาการปวดหัวเนื่องจากความเครียดเข้าให้แล้วก็ได้ค่ะ หากคุณรู้สึกว่ากำลังถูกรบกวนด้วยอาการปวดหัวแบบนี้ ซึ่งอาจบรรเทาได้ด้วยการกินยาแก้ปวดแบบธรรมดา แต่ถ้าปวดหัวอย่างต่อเนื่องเป็นเวลานาน ก็ไม่ควรนิ่งนอนใจนะคะ การปรึกษาแพทย์จะช่วยให้ความรู้ที่ถูกต้องในการดูแลตัวเองและการปฏิบัติตัวค่ะ`
                }
                return callSendAPI(sender_psid, response);
                }); 
              }
              else{
                var obj2 = _.find(user.symptom, function (obj) { return obj.name === "น้ำมูก"; });
                if(obj2)
                user.symptom = [];
                user.follow = ""
                user.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `เมื่อเริ่มมีอาการไข้หวัด ความรุนแรงของอาการจะมีมากในช่วง 2-3 วันแรก ก่อนจะค่อย ๆ ทุเลาลง  ควรดื่มน่ำเยอะๆและพักผ่อนให้มากๆนะคะ           ทั้งนี้อาการไข้หวัดและไข้หวัดใหญ่ จะค่อนข้างคล้ายกัน อาจสับสนได้ แต่ผู้ป่วยและผู้ดูแลสามารถสังเกตความแตกต่างได้โดยหากเป็นไข้หวัดใหญ่ อาการจะเกิดอย่างรุนเร็ว และมีอาการหลัก ๆ คือ ไข้สูง ปวดศีรษะ และปวดกล้ามเนื้อ อีกทั้งจะรู้สึกไม่สบายตัวจนไม่สามารถทำกิจวัตรประจำวันได้ตามปกติ แต่อาการไข้หวัดทั่วไปจะไม่รุนแรง และยังคงทำกิจกรรมต่าง ๆ ได้ตามปกติ แต่จะมีอาการที่เห็นได้ชัดคือไอ และมีน้ำมูก`
                }
                return callSendAPI(sender_psid, response);
                }); 
              }
              
            }
            else if(_.contains(sentence,"3")||_.contains(sentence,"หน่วง"||_.contains(sentence,"ตา"))){
              var obj = _.find(user.symptom, function (obj) { return obj.name === "หวัด"; });
              var obj2 = _.find(user.symptom, function (obj) { return obj.name === "น้ำมูก"; });
              var obj3 = _.find(user.symptom, function (obj) { return obj.name === "เวียนหัว"; });
              if(obj3&&obj2&&obj){
                user.symptom = [];
                user.follow = ""
                user.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `คุณอาจเจอกับอาการไซนัสอักเสบเข้าให้แล้วค่ะ การปรึกษาแพทย์จะช่วยคุณได้ดีที่สุดค่ะ โดยหากยังไม่แน่ใจว่าอาการปวดของตัวเองจะเกี่ยวเนื่องกับสาเหตุใดๆ การได้ปรึกษาแพทย์โดยตรงจะช่วยให้คำแนะนำได้อย่างถูกต้องและตรงจุดค่ะ`
                }
                return callSendAPI(sender_psid, response);
                }); 
              }
              else{
                user.symptom = [];
                user.follow = ""
                user.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `เมื่อเริ่มมีอาการไข้หวัด ความรุนแรงของอาการจะมีมากในช่วง 2-3 วันแรก ก่อนจะค่อย ๆ ทุเลาลง  ควรดื่มน่ำเยอะๆและพักผ่อนให้มากๆนะคะ           ทั้งนี้อาการไข้หวัดและไข้หวัดใหญ่ จะค่อนข้างคล้ายกัน อาจสับสนได้ แต่ผู้ป่วยและผู้ดูแลสามารถสังเกตความแตกต่างได้โดยหากเป็นไข้หวัดใหญ่ อาการจะเกิดอย่างรุนเร็ว และมีอาการหลัก ๆ คือ ไข้สูง ปวดศีรษะ และปวดกล้ามเนื้อ อีกทั้งจะรู้สึกไม่สบายตัวจนไม่สามารถทำกิจวัตรประจำวันได้ตามปกติ แต่อาการไข้หวัดทั่วไปจะไม่รุนแรง และยังคงทำกิจกรรมต่าง ๆ ได้ตามปกติ แต่จะมีอาการที่เห็นได้ชัดคือไอ และมีน้ำมูก`
                }
                return callSendAPI(sender_psid, response);
                }); 
              }
            }
          }
          else if(user.follow == "ปวดท้อง"){
            if(_.contains(sentence,"1")||_.contains(sentence,"โครง")){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `เป็นจุดของตับ และถุงน้ำดี หากกดแล้วเจอก้อนแข็ง ๆ บวกกับอาการตัวเหลือง ตาเหลือง หมายถึง ความบกพร่องของตับ หรือถุงน้ำดี หากปวดมากควรพบแพทย์`
                }
                return callSendAPI(sender_psid, response);
                  
                }) 
              
            }
            else if(_.contains(sentence,"2")||_.contains(sentence,"ลิ้น")){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `ลองสังเกตตัวเองหากปวดเป็นประจำเวลาหิว หรืออิ่ม อาจเกี่ยวกับโรคกระเพาะ หากปวดรุนแรงร่วมกับคลื่นไส้อาเจียน อาจเป็นตับอ่อนอักเสบ
- หากคลำเจอก้อนเนื้อขนาดใหญ่และค่อนข้างแข็ง อาจหมายถึงตับโต
- หากคลำได้ก้อนสามเหลี่ยมแบนเล็ก ๆ อาจเป็นกระดูกลิ้นปี่ ควรพบแพทย์`
                }
                return callSendAPI(sender_psid, response);
                }); 
            }
            else if(_.contains(sentence,"3")||_.contains(sentence,"เอว")){
                user.symptom = [];
                user.follow = ""
                user.status = 0;
                return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
                response = {
                  "text": `ตรงตำแหน่งของท่อไต ไต ลำไส้ใหญ่
                  - อาการปวดมาก : ลำไส้ใหญ่อักเสบ
                  - อาการปวดร้าวถึงต้นขา  : เริ่มต้นเป็นนิ่วในท่อไต
                  - อาการปวดร่วมกับปวดหลัง มีไข้ หนาวสั่น ปัสสาวะขุ่น : กรวยไตอักเสบ ควรรีบไปพบแพทย์
                  - เมื่อคลำเจอก้อนเนื้อ : ควรรีบไปพบแพทย์`
                }
                return callSendAPI(sender_psid, response);
                }); 
            }
            else if(_.contains(sentence,"4")||_.contains(sentence,"ดือ")){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
              response = {
                "text": `หากกดแล้วปวดมาก คืออาการไส้ติ่ง ปวดมากจนทนไม่ได้ควรพบแพทย์ หากปวดแบบมีลมในท้องด้วย  อาจแค่กระเพาะลำไส้ทำงานผิดปกติ`
              }
              return callSendAPI(sender_psid, response);
              }); 
            }
            else if(_.contains(sentence,"5")){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
              response = {
                "text": `เป็นตำแหน่ง ไส้ติ่ง ท่อไต และปีกมดลูก
                - หากปวดเกร็งเป็นระยะ ๆ แล้วร้าวมาที่ต้นขา : กรวยไตอักเสบ ควรพบแพทย์
                - ปวดเสียดตลอดเวลา กดแล้วเจ็บมาก : ไส้ติ่งอักเสบ
                - ปวดร่วมกับมีไข้สูง หนาวสั่น มีตกขาว  : ปีกมดลูกอักเสบ
                - คลำแล้วเจอก้อนเนื้อ : ก้อนไส้ติ่ง หรือรังไข่ผิดปกติ`
              }
              return callSendAPI(sender_psid, response);
              }); 
            }
            else if(_.contains(sentence,"6")){
              user.symptom = [];
              user.follow = ""
              user.status = 0;
              return User.findOneAndUpdate({'sender_psid':sender_psid},user,function(err,usr){
              response = {
                "text": `ตรงตำแหน่งกระเพาะปัสสาวะ และมดลูก
                - ปวดเวลาถ่ายปัสสาวะ หรือถ่ายกะปริบกะปรอย : กระเพาะปัสสาวะอักเสบ หรือ นิ่วในกระเพาะปัสสาวะ
                - ปวดเกร็งเวลามีประจำเดือน ผู้หญิงที่แต่งงาน ไม่มีลูกแล้วมีอาการปวดเรื้อรัง : อาการมดลูกผิดปกติ ควรรีบไปพบแพทย์`
              }
              return callSendAPI(sender_psid, response);
              }); 
            }
          }
          response = {
            "text": `ขอโทษนะคะหมอไม่เข้าใจค่ะ`
          }
          return callSendAPI(sender_psid, response);

        }
      }
    
    // Sends the response message
   
    });

    
}

function firstMeet(sentence,callback){
  var hold;
  var not;
  var sympthom =[];
  _.each(sentence,function(word){
      if(word == "ไม่"){
        not = true;
      }
      if(word == "ปวด"){
        hold = "ปวด";
      }
      if(word == "หมด"){
        hold = "หมด";
      }
      if(word == "สติ"){
        if(hold == "หมด"){
          hold = ""
          sympthom.push("หมดสติ")
        }
      }
      if(word == "เจ็บ"){
        hold = "เจ็บ";
      }
      if(word == "คอ"){
        if(hold == "เจ็บ"){
          hold = ""
          sympthom.push("เจ็บคอ")
        }
      }
      
      if(word == "สุนัข"||word == "หมา"){
        hold = "หมา";
      }
      if(word == "กัด"){
        if(hold == "หมา"){
          hold = ""
          sympthom.push("หมากัด")
        }
      }
      if(word == "ท้อง"){
        if(hold = "ปวด"){
          hold = ""
          sympthom.push("ปวดท้อง")
        }
      }
      if(word == "หัว"||word == "ศรีษะ"){
        if(hold = "ปวด"){
          hold = ""
          sympthom.push("ปวดหัว")
        }
        if(hold = "เวีบน"){
          hold = ""
          sympthom.push("เวียนหัว")
        }
      }
      if(word == "ตัว"){
        if(hold == "ปวด"){
          hold = ""
          sympthom.push("ปวดตัว")
        }
      }
      if(word == "ท้อง"){
        if(hold == "ปวด"){
          hold = ""
          sympthom.push("ปวดท้อง")
        }
      }
      if(word == "คลื่น"){
        hold = "คลื่น";
      }
      if(word == "ไส้"){
        if(hold = "คลื่น"){
          hold = ""
          sympthom.push("คลื่นไส้")
        }
      }

      if(word == "อา"){
        hold = "อา";
      }
      if(word == "เจียน"){
        if(hold = "อา"){
          hold = ""
          sympthom.push("อ้วก")
        }
      }
      if(word=="อ้วก"){
        sympthom.push("อ้วก")
      }

      if(word == "ชัก"){
        if(not){
          not = false;
        }
        else sympthom.push("ชัก")
      }
      if(word == "ตัว"){
        hold = "ตัว";
      }
      if(word == "ร้อน"){
        if(hold = "ร้อน"){
          hold = ""
          sympthom.push("ไข้")
        }
      }
      if(word == "ไข้"){
        sympthom.push("ไข้")
      }
      if(word == "หมด"){
        hold = "หมด";
      }
      if(word == "ปาก"){
        hold = "ปาก"
      }
      if(word == "คัด"){
        hold = "คัด"
      }
      if(word == "จมูก"){
        if(hold == "คัด"){
          hold = ""
          sympthom.push("คัดจมูก")
        }
      }
      if(word == "น้ำ"){
        hold = "น้ำ"
      }
      if(word == "มูก"){
        if(hold == "น้ำ"){
          hold = ""
          sympthom.push("น้ำมูก")
        }
      }
      if(word == "หวัด"){
        sympthom.push("หวัด")
     }
      if(word == "ไอ"){
      sympthom.push("ไอ")
     }
     if(word == "จาม"){
      sympthom.push("จาม")
     }
  
      if(word == "หวัด"){
          sympthom.push("หวัด")
      }
      
      if(word == "เบี้ยว"){
        if(hold == "ปาก"){
          hold = ""
          sympthom.push("ปากเบี้ยว")
        }
      }
      
  });
  callback(sympthom)
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
handleMessage(2006056299466160,{'text': "อยู่ดีๆก็ปากเบี้ยว"});

// Sets server port and logs message on success
