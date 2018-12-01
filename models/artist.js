var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");

var artistSchema = new mongoose.Schema({
   name : String,
   votes : [userSchema],
});

module.exports = mongoose.model("User", artistSchema);