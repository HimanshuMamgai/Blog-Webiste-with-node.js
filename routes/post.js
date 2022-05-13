const express = require("express");
const router = express.Router();
const Post = require("../models/Post");
const mongoose = require("mongoose");

router.get("/posts/:postId", (req, res) => {
    const requestPostId = req.params.postId;
    Post.findOne({_id: requestPostId}, (err, post) => {
        if(err) throw err;
        Post.find({ _id: { $nin: [requestPostId] }}, async (err, posts) => { //to exclude only one document
            if(!err) {
                res.render("post", 
                    {   image: post.img, 
                        title : post.title, 
                        date : post.date, 
                        author: post.author, 
                        content : post.content, 
                        posts : posts
                    });
            } else {
                console.log(err);
            }
        });
    });
});

module.exports = router;