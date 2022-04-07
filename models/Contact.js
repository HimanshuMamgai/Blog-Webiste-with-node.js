const mongoose = require("mongoose");

/* Contact form schema */
const contactSchema = new mongoose.Schema({
    email : {
        type : String,
        required : [true, "Please enter your email for contacting!"]
    },
    subject : {
        type : String,
        required : true
    },
    message : String
});

// contact form model
module.exports = mongoose.model("Contact", contactSchema);