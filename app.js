require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const upload = require("express-fileupload");
const date = require(__dirname + "/date.js");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./models/User");
const Post = require("./models/Post");
const homeRoute = require("./routes/home.js");
const contactRoute = require("./routes/contact.js");
const composeRoute = require("./routes/compose.js");
const postRoute = require("./routes/post.js");
const subscribeRoute = require("./routes/subscribe.js");

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
app.get("/", homeRoute);

/* About Page */
app.get(["/about", "/posts/about"], (req, res) => {
    res.render("about");
});

app.get("/message", (req, res) => {
    res.redirect("https://realtimechatapplication24.herokuapp.com/");
});

/* Contact Page */
app.get(["/contact", "/posts/contact"], contactRoute);

app.post("/contact", contactRoute);

/* Compose post */
app.get("/compose", composeRoute);

app.post("/compose", composeRoute);

app.get("/posts/:postId", postRoute);

/* Newsletter */
app.post("/subscribe", subscribeRoute);

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
    res.render("login", {message: ""});
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
                    passport.authenticate("local", {failureRedirect: "/login"})(req, res, () => {
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
                if(!foundUser) {
                    res.redirect("/register");
                } else {
                    if(foundUser.role != "admin") {
                        res.render("admin", {message: "You are not registered as admin."});
                    } else {
                        passport.authenticate("local", {failureRedirect: "/auth/admin"})(req, res, function() {
                            res.redirect("/auth/admin/post");
                        });
                    }
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
    User.findById({"_id": requestedId}, (err, foundUser) => {
        if(err) {
            console.log(err.message);
        } else {
            if(foundUser.username == "Himanshu") {
                res.redirect("/auth/admin/users");
            } else {
                User.findByIdAndDelete({_id: requestedId}, (err, foundUser) => {
                    if(err) {
                        console.log(err.message);
                    } else {
                        console.log("User deleted successfully.");
                        res.redirect("/auth/admin/users");
                    }
                });
            }
        }
    });
});

app.post("/edit/post/:id", (req, res) => {
    const requestedId = req.params.id;
    Post.findById({"_id": requestedId}, (err, foundPost) => {
        if(err) {
            console.log(err.message);
        } else {
            res.render("update", {id: foundPost._id, title: foundPost.title, content: foundPost.content});
        }
    });
});

app.post("/update/post/:id", (req, res) => {
    const requestedId = req.params.id;
    let day = date.getDate();
    Post.findByIdAndUpdate({_id: requestedId}, {$set:{
        title: req.body.title,
        content: req.body.content,
        date: day,
        author: req.user.username
    }}, (err, msg) => {
        if(err) {
            console.log(err.message);
        } else {
            res.redirect("/auth/admin/post");
        }
    });
});

app.post("/edit/user/:id", (req, res) => {
    const requestedId = req.params.id;
    User.findById({"_id": requestedId}, (err, foundUser) => {
        if(foundUser.role == "admin") {
            if(foundUser.username == "Himanshu") {
                res.redirect("/auth/admin/users");
            } else {
                User.findByIdAndUpdate({_id: requestedId}, {$set:{
                    role: "basic"
                }}, (err, msg) => {
                    if(err) {
                        console.log(err.message);
                    } else {
                        res.redirect("/auth/admin/users");
                    }
                });
            }
        } else {
            User.findByIdAndUpdate({_id: requestedId}, {$set:{
                role: "admin"
            }}, (err, msg) => {
                if(err) {
                    console.log(err.message);
                } else {
                    res.redirect("/auth/admin/users");
                }
            });
        }
    });
});

app.get("/forgot", (req, res) => {
    res.render("forgot");
});

app.post("/forgot", (req, res) => {
    User.findOne({"username": req.body.username}, (err, foundUser) => {
        if(err) {
            console.log(err);
        } else {
            foundUser.setPassword(req.body.password, (err, user) => {
                if(err) {
                    console.log(err);
                } else {
                    User.findByIdAndUpdate({_id: user._id}, {$set: {
                        hash: user.hash,
                        salt: user.salt
                    }}, (err, msg) => {
                        if(err) {
                            console.log(err.message);
                        } else {
                            res.redirect("/login");
                        }
                    });
                }
            });
        }
    });
});

app.post("/message", (req, res) => {
    res.redirect("/contact");
});

app.post("/failure", (req, res) => {
    res.redirect("/");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});