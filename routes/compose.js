const express = require("express");
const router = express.Router();
const date = require("../date.js");
const sharp = require('sharp');

router.get("/compose", (req, res) => {
    if(req.isAuthenticated()) {
        console.log(req.user.username);
        res.render("compose");
    } else {
        res.render("login", {message: "Please login to continue"});
    }
});

router.post("/compose",  async (req, res) => {
    let day = date.getDate();

    if(req.files) {
        let imageData = await sharp(req.files.image.data).resize(500, 800).rotate().toBuffer();
        const post = new Post({
            img: imageData.toString("base64"),
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

module.exports = router;