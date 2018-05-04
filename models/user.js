var mongoose = require('mongoose');
var schema = new mongoose.Schema({
    sender_psid: {
      type: String
    },
    symptom:{
        type: String
    },
    status: {
      type: Boolean
    }
});
  module.exports = mongoose.model('user', schema);