var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    sender_psid: {
      type: String
    },
    symptom:[{
      name:String,
      level:Number,
      description:String,
      duration:String
    }],
    status: {
      type: Number,
      default: 1
    },
    follow:String
    
});
  module.exports = mongoose.model('user', schema);