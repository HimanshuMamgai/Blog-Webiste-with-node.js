const express = require("express");
const router = express.Router();
const https = require('https');

router.post("/subscribe", (req, res) => {
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

module.exports = router;