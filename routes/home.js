const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const mongoose = require("mongoose");

router.get("/", (req, res) => {
    Post.find({}, (err, posts) => {
        if(err) {
            console.log(err);
        } else {
            res.render("home", {posts: posts});
        }
    });
});

module.exports = router;