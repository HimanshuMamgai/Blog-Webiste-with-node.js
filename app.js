require("dotenv").config();
const express = require('express');
const https = require('https');
const mongoose = require('mongoose');
const upload = require("express-fileupload");
const date = require(__dirname + "/date.js");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const Contact = require("./models/Contact");
const Post = require("./models/Post");

const app = express();

app.use(express.static('public'));

app.use(upload());

app.use(express.urlencoded({extended : true}));

app.set('view engine', 'ejs');

const secret = process.env.SECRET;

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false
}));

//to use req. features
app.use(passport.initialize());
app.use(passport.session());

const db_url = process.env.DB_URL;

mongoose.connect(db_url, {useNewUrlParser: true});

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy(User.authenticate()));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://nodeblog24.herokuapp.com/auth/google/compose",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

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

app.get("/message", (req, res) => {
    res.redirect("https://realtimechatapplication24.herokuapp.com/");
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

/* Compose post */
app.get("/compose", (req, res) => {
    if(req.isAuthenticated()) {
        console.log(req.user.username);
        res.render("compose", {title: "", content: ""});
    } else {
        res.redirect("/login");
    }
});

app.post("/compose", (req, res) => {
    let day = date.getDate();

    if(req.files) {
        const post = new Post({
            img: req.files.image.data.toString("base64"),
            title : req.body.title,
            date : day,
            content : req.body.content,
            author: req.user.username
        });
        post.save((err) => {
            if(err) throw err;
            res.redirect("/");
        });
    }
});

app.get("/posts/:postId", (req, res) => {
    const requestPostId = req.params.postId;
    Post.findOne({_id: requestPostId}, (err, post) => {
        if(err) throw err;
        Post.find({ _id: { $nin: [requestPostId] }}, (err, posts) => { //to exclude only one document
            if(err) throw err;
            res.render("post", {image: post.img,title : post.title, date : post.date, author: post.author, content : post.content, posts : posts});
        });
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

app.get("/logout", (req, res) => {
    req.logOut();
    res.redirect("/login");
});

app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/compose", 
passport.authenticate("google", { failureRedirect: "/login" }),
function(req, res) {
    res.redirect("/compose");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register", {message: ""});
});

app.post("/register", (req, res) => {
    User.register({email: req.body.email, username: req.body.username, role: "basic"}, req.body.password, (err) => {
        if (err) {
            console.log(err.message);
            res.render("register", {message: err.message});
        } else {
            passport.authenticate("local")(req, res, function() {
                res.redirect("/compose");
            });
        }
    })
});

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        if(err) {
            console.log(err);
            res.redirect("/register");
        } else {
            User.findOne({"username": req.user.username}, (err, foundUser) => {
                if(!foundUser) {
                    res.redirect("/register");
                } else {
                    passport.authenticate("local")(req, res, function() {
                        res.redirect("/compose");
                    });
                }
            });
        }
    });
});

app.get("/auth/admin", (req, res) => {
    res.render("admin", {message: ""});
});

app.post("/auth/admin", (req, res) => {
    const admin = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(admin, (err) => {
        if(err) {
            console.log(err);
            res.redirect("/auth/admin");
        } else {
            User.findOne({"username": req.user.username}, (err, foundUser) => {
                console.log(foundUser.role);
                if(foundUser.role != "admin") {
                    res.render("admin", {message: "You are not registered as admin."});
                } else {
                    passport.authenticate("local")(req, res, function() {
                        res.redirect("/auth/admin/post");
                    });
                }
            });
        }
    });
});

app.get("/auth/admin/post", (req, res) => {
    if(req.isAuthenticated() && req.user.role == "admin") {
        Post.find({}, (err, foundPost) => {
            if(err) {
                console.log(err.message);
            } else {
                res.render("result", {data: foundPost, fhd: "Title", shd: "Date", thd: "User", link: "post"});
            }
        });
    } else {
        res.redirect("/auth/admin");
    }
});

app.get("/auth/admin/users", (req, res) => {
    if(req.isAuthenticated() && req.user.role == "admin") {
        User.find({}, (err, foundUsers) => {
            if(err) {
                console.log(err.message);
            } else {
                res.render("result", {data: foundUsers, fhd: "Username", shd: "Email", thd: "Role", link: "user"});
            }
        });
    } else {
        res.redirect("/auth/admin");
    }
});

// delete route for post
app.post("/delete/post/:id", (req, res) => {
    const requestedId = req.params.id;
    Post.findByIdAndDelete({_id: requestedId}, (err, foundPost) => {
        if(err) {
            console.log(err.message);
        } else {
            console.log("Post deleted successfully.");
            res.redirect("/auth/admin/post");
        }
    });
});

// delete route for user
app.post("/delete/user/:id", (req, res) => {
    const requestedId = req.params.id;
    User.findByIdAndDelete({_id: requestedId}, (err, foundUser) => {
        if(err) {
            console.log(err.message);
        } else {
            console.log("User deleted successfully.");
            res.redirect("/auth/admin/users");
        }
    });
});

app.post("/edit/post/:id", (req, res) => {
    const requestedId = req.params.id;
    let day = date.getDate();
    Post.findByIdAndUpdate({"_id": requestedId}, (err, foundUser) => {
        console.log(foundUser.title);
    }, {$set: {
        date: day,
        title: req.body.title,
        content: req.body.content,
        author: req.user.username
    }}, (err) => {
        if(err) {
            console.log(err.message);
        } else {
            console.log("Post updated sucessfully!");
            res.redirect("/auth/admin/post");
        }
    });
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});