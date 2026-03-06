var express = require("express");
var router  = express.Router();
var passport = require("passport");
var User = require("../models/user");

//root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
   res.render("register");
});

//handle sign up logic
router.post("/register", async function(req, res){
    var newUser = new User({username: req.body.username});
    try {
        await User.register(newUser, req.body.password);
        passport.authenticate("local")(req, res, function(){
           res.redirect("/records");
        });
    } catch(err) {
        console.log(err);
        return res.render("register");
    }
});

//show login form
router.get("/login", function(req, res){
   res.render("login");
});

//handling login logic
router.post("/login", passport.authenticate("local",
    {
        successRedirect: "/records",
        failureRedirect: "/login"
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
   req.logout(function(err){
       if(err){ console.log(err); }
       res.redirect("/records");
   });
});

module.exports = router;
