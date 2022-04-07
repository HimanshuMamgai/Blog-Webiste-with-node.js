const mongoose = require("mongoose");

// post schema
const postSchema = new mongoose.Schema({
    title : String,
    date : String,
    content : String,
    img: String,
    author: String
});

// post model
module.exports = mongoose.model("Post", postSchema);