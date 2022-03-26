require("dotenv").config();
const express = require('express');
const bodyParser = require('body-parser');
const https = require('https');
const mongoose = require('mongoose');
const date = require(__dirname + '/date.js');

const app = express();

app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended : true}));

app.set('view engine', 'ejs');

const db_url = process.env.DB_URL;

mongoose.connect(db_url, {useNewUrlParser: true});

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
const Contact = mongoose.model("Contact", contactSchema);

//*************************************************************************************

// post schema
const postSchema = new mongoose.Schema({
    title : String,
    date : String,
    content : String
});

// post model
const Post = mongoose.model("Post", postSchema);

// Home page
app.get("/", (req, res) => {

    Post.find({}, (err, posts) => {
        res.render("home", {posts: posts});
    });
});

/* About Page */
app.get(["/about", "/posts/about"], (req, res) => {
    res.render("about");
});

/* Contact Page */
app.get(["/contact", "/posts/contact"], (req, res) => {
    res.render("contact");
});

app.post("/contact", (req, res) => {
    //new document
    const contact = new Contact({
        email : req.body.email,
        subject : req.body.subject,
        message : req.body.message
    });

    contact.save((err) => {
        if(err) throw err;
        res.sendFile(__dirname + "/message.html");
    });

});

app.get("/login", (req, res) => {
    res.render("login");
});

/* Compose post */
app.get(["/compose", "/posts/compose"], (req, res) => {
    res.render("compose");
});

app.post("/compose", (req, res) => {
    let day = date.getDate();

    const post = new Post({
        title : req.body.title,
        date : day,
        content : req.body.content
    });
    post.save((err) => {
        if(err) throw err;
        res.redirect("/");
    });
});

app.get("/posts/:postId", (req, res) => {
    const requestPostId = req.params.postId;
    Post.findOne({_id: requestPostId}, (err, post) => {
        if(err) throw err;
        Post.find({ _id: { $nin: [requestPostId] }}, (err, posts) => { //to exclude only one document
            if(err) throw err;
            res.render("post", {title : post.title, date : post.date, content : post.content, posts : posts});
        });
    });
});

/* Search bar */
app.post("/search", (req, res) => {
    const query = req.body.query;
    Post.findOne({title: {$regex : query, $options : "$i"}}, (err, post) => { //gives single object
        if(err) throw err;
        if(post != null) { //if no query found
            Post.find({ _id: { $nin: [post._id] }}, (err, posts) => { //gives array of object
                if(err) throw err;
                res.render("post", {title : post.title, date : post.date, content : post.content, posts : posts});
            });
        } else { //gives message rather than error
            res.render("failure", {message : `Your search - "${query}" - did not match any documents.`});
        }
    });
});

/* Newsletter */
app.post("/subscribe", (req, res) => {
    let userEmail = req.body.email;

    const data = {
        members : [
            {
                email_address : userEmail,
                status : "subscribed"
            }
        ]
    };

    console.log(data);

    const jsonData = JSON.stringify(data);

    const url = process.env.MAIL_CHIMP_URI;

    const options = {
        method : "POST",
        auth : "himanshu1:" + process.env.MAIL_CHIMP_API_KEY
    }

    const request = https.request(url, options, (response) => {
        if(response.statusCode == 200) {
            res.render("success");
        } else {
            res.render("failure", {message : "Something went wrong!"});
        }

        response.on("data", (data) => {
            console.log(JSON.parse(data)); //to get data on console
        });

    });

    request.write(jsonData); //to send data on mailchimp
    request.end();

});

app.get("/message", (req, res) => {

    res.sendFile(__dirname + "/message.html");

});

app.post("/message", (req, res) => {
    res.redirect("/");
});

app.post("/failure", (req, res) => {
    res.redirect("/");
});

app.listen(3000, () => {
    console.log("Server is running on port: 3000");
});