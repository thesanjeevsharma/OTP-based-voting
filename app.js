var express = require("express"),
    bodyParser = require("body-parser"),
    mongoose = require("mongoose"),
    passport = require("passport"),
    localStrategy = require("passport-local").Strategy,
    passportLocalMongoose = require("passport-local-mongoose"),
    request = require("request"),
    flash = require("connect-flash");
    
var User = require("./models/user");
    
mongoose.connect("mongodb://localhost/evoting", {useNewUrlParser: true} );

var app = express(); 
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended : true}));
app.use(require("express-session")({
    secret : "8989",
    resave : false,
    saveUninitialized : false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.use(flash());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next(); 
});

var otp;
var verified = false;

//=========
// DB Init
//=========

var artistSchema = new mongoose.Schema({
   name : String,
   image : String,
   votes : Number,
});

var Artist = mongoose.model("Artist", artistSchema);

var ellie = new Artist({
   name : "Ellie Goulding",
   image : "https://images-eu.ssl-images-amazon.com/images/I/51UXVe5kYFL._SS500.jpg",
   votes : 0
});

ellie.save(function(err, artist){
    if(err){
        console.log(err);
    } else {
        console.log(artist);
    }
});

var sia = new Artist({
    name : "Sia",
    image : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEpHW6ueIQ_08Bd28OAIqtZcJhYRmR7xEVEcYlgKM_03sdUNMA",
    votes : 0
});

sia.save(function(err, artist){
    if(err){
        console.log(err);
    } else {
        console.log(artist);
    }
});

//==========
//ROUTES
//==========

app.get("/", function(req, res){
    verified = false;
    req.logout();
    res.render("home");
})

app.get("/thanks", function(req, res) {
    res.render("thanks")
})

app.get("/otp", isLoggedInUser, function(req, res){
    otp = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(req.user.username,"logged in!");
    console.log("OTP sent:",otp);
    // YOUR API KEY BELOW
    var url = "http://2factor.in/API/V1/YOUR_KEY/SMS/+91" +  req.user.phone + "/" + otp;
    request(url, function (error, response, body) {
        if(!error && response.statusCode == 200){
            console.log('body:', body);
            res.render("otp",{ phone : req.user.phone });
        } else {
            console.log("error:",error);
        }
    });
});

app.post("/otp", function(req, res){
    if(otp == req.body.otp){
        verified = true;
        res.redirect("/vote")
    } else {
        req.logout();
        req.flash("error", "OTP verification failed!");
        res.redirect("/loginUser");
    }
});

app.get("/vote", isVerified, function(req, res){
    Artist.find({}, function(err, artists){
        if(err){
            console.log(err);
        } else {
            console.log(artists);
            res.render("vote", {artists : artists});    
        }
    });
});

app.post("/vote", isVerified, function(req, res) {
   var vote = req.body.vote;
   if(vote == "ELE"){
       Artist.find({ name : 'Ellie Goulding' }, function(err, artist){
           if(err){
               console.log(err);
           } else {
               var current_votes = artist[0].votes;
               var id = artist[0]._id;
               console.log("Current Votes:",current_votes);
               Artist.findByIdAndUpdate({ _id : id }, { votes : current_votes + 1 }, {new : true} ,function(err, artist){
                   if(err){
                       console.log("Problem in Voting:", err)
                   } else {
                        console.log("Voted for Ellie!");
                        res.redirect("/thanks");    
                   }
               });
           }
   });
   } else {
        Artist.find({ name : 'Sia' }, function(err, artist){
           if(err){
               console.log(err);
           } else {
               var current_votes = artist[0].votes;
               var id = artist[0]._id;
               console.log("Current Votes:",current_votes);
               Artist.findByIdAndUpdate({ _id : id }, { votes : current_votes + 1 }, {new : true} ,function(err, artist){
                   if(err){
                       console.log("Problem in Voting:", err)
                   } else {
                       console.log("Voted for Sia!");
                        res.redirect("/thanks");    
                   }
               });
           }
   });
   }
});

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("Server running for E-Voting App...");
})
 
//Auth Routes

app.get("/register", isLoggedInAdmin,function(req, res){
    User.find({}, function(err, users){
        if(err){
            console.log("/register error:",err);
        } else {
            //console.log(users);
            Artist.find({}, function(err, artists){
                if(err){
                    console.log("/register error:",err);
                } else {
                    res.render("register", {users : users, artists : artists});       
                }
            })
        }
    });
});

app.post("/register", function(req, res){
   User.register(new User({username : req.body.username, phone : req.body.phone}), req.body.password, function(err, user){
     if(err){
         console.log(err);
         return res.redirect('register');
     }  else {
         console.log("User added!");
         return res.redirect('register');
     }
   });
});

app.get("/loginUser", function(req, res){
   res.render("login", {message : req.flash("error")});
});

app.post("/loginUser", passport.authenticate('local', {
    successRedirect : '/otp',
    failureRedirect : '/loginUser'
}),function(req, res){
    req.flash('error',"Credentials Incorrect!");
});

app.get("/loginAdmin", function(req, res){
   res.render("loginAdmin");
});

app.post("/loginAdmin", passport.authenticate('local', {
    successRedirect : '/register',
    failureRedirect : '/loginAdmin'
}),function(req, res){
});

app.get("/removeUser/:id", isLoggedInAdmin,function(req, res){
    var id = req.params.id;
    User.find({ _id: id }).remove(function(err, user){
        if(err){
            console.log(err);
            return res.redirect('/register');
        } else {
            console.log(user);
            return res.redirect('/register');   
        }
    });
});

app.get("/logout", function(req, res){
    verified = false;
    req.logout();
    res.redirect("/");
});


function isLoggedInUser(req, res, next){
    if (req.isAuthenticated()){
        return next();
    }
    res.redirect('/loginUser');
}

function isVerified(req, res, next){
    if (req.isAuthenticated() && verified){
        return next();
    }
    req.logout();
    res.redirect('/');
}

function isLoggedInAdmin(req, res, next){
    if (req.isAuthenticated() && req.user.username == 'root'){
        return next();
    }
    console.log("Error in Admin Login func: ", req.user);
    res.redirect('/loginAdmin');
}

app.get("*", function(req, res){
    verified = false;
    req.logout();
    res.redirect("/loginUser");
});