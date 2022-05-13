const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

router.get("/contact", (req, res) => {
  res.render("contact");
});

router.post("/contact", (req, res) => {
    
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'himanshum50360@gmail.com',
          pass: process.env.EMAIL_PASSWORD
        }
    });
      
    var mailOptions = {
        from: req.body.email,
        to: 'himanshum50360@gmail.com',
        subject: req.body.subject,
        html: `<p>Mail sent from: ${req.body.email}</p><br><div style="white-space: pre;">${req.body.message}</div>`
    };
      
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          res.sendFile(__dirname + "/message.html");
        }
    });
});

module.exports = router;