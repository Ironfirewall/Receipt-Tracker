//jshint esversion:6

//importing libraries
const express = require("express");
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require("body-parser");
const ejs = require("ejs");
const flash = require('connect-flash');
const _ = require("lodash");
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

//libraries for user authentication
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


//initializing app and using public directory for css
const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//using ejs for public and views directories containing ejs files
app.set('view engine', 'ejs');

//initialize sessions for authentication
app.use(session({
  secret: "Password required for authenticating receipt tracker app",
  resave: false,
  saveUninitialized: false
}));

//initialize passport and use it with session
app.use(passport.initialize());
app.use(passport.session());

//connect to MongoDB and create database
mongoose.connect("mongodb://localhost:27017/receiptDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//remove a warning due to passportLocalMongoose
mongoose.set("useCreateIndex", true);

//structure of an object in the database receiptDB
const receiptsSchema = {
  date: String,
  storeName: String,
  storeAddress: String,
  itemName: String,
  itemQuantity: Number,
  price: Number
};

//structure for new user
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  itemList: [receiptsSchema]
});

//adding passportLocalMongoose as a plugin
userSchema.plugin(passportLocalMongoose);


//create user model
const User = mongoose.model("User", userSchema);

//use to create cookies
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//create receipt model
const Receipt = mongoose.model("Receipt", receiptsSchema);

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
    }
  });
});

app.get("/", function(req, res) {
  if(req.isAuthenticated()){
    res.render("home", {
      receiptList: req.user.itemList
    });
    //the next few lines of code are used for global DB for testing
    // Receipt.find({}, function(err, foundReceipt) {
    //   res.render("home", {
    //     receiptList: foundReceipt
    //   });
    // });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function(req, res){
  res.render("login");
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);
      res.redirect("/login");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});





//////////////////// FIX FRONT END FIRST, THEN TIE DATABASE TO USER, use mongoose subdocuments


//display add page
app.get("/add", function(req, res) {
  if(req.isAuthenticated()){
    console.log(req.user.username);
    res.render("add");
  } else {
    res.redirect("/login");
  }

});

//adds a new item to the receipt list
app.post("/add", function(req, res) {
  if(req.isAuthenticated()){
    const newItem = new Receipt({
      date: req.body.newDate,
      storeName: req.body.newStore,
      storeAddress: req.body.newAddress,
      itemName: req.body.newItem,
      itemQuantity: req.body.newQuantity,
      price: req.body.newPrice
    });
    if (newItem.date === "" && newItem.storeName === "" && newItem.storeAddress === "" && newItem.itemName === "" && newItem.itemQuantity === null && newItem.price === null) {
      res.redirect("/add");
      console.log("nothing has been inputted");
    } else {
      req.user.itemList.push(newItem);
      req.user.save(function(err){
        if(err){
          console.log(err);
        }
      });
      //next line of code saves in global DB
      // newItem.save();
      res.redirect("/");
      console.log("saved in db");
    }
  } else {
    res.redirect("/login");
  }
});

function sortByFrequency(array, variable) {
    var frequency = {};

    array.forEach(function(value) { frequency[value[variable]] = 0; });
    var uniques = array.filter(function(value) {
        return ++frequency[value[variable]] == 1;
    });
    return [uniques.sort(function(a, b) {
        return frequency[b[variable]] - frequency[a[variable]];
    }), frequency];
}

//displays the profile page
app.get("/profile", function(req, res){
  if(req.isAuthenticated()){
    let mostStoreVisitedArray = "";
    let mostStoreVisitedFrequency = "";
    let mostVisitedStore = "";
    let mostItemBoughtArray = "";
    let mostItemBoughtFrequency = "";
    let mostItemBought = "";
    if(req.user.itemList.length !== 0){
      mostStoreVisitedArray = [].concat(req.user.itemList);
      mostStoreVisitedArray = sortByFrequency(mostStoreVisitedArray, "storeName");
      mostStoreVisitedFrequency = mostStoreVisitedArray[1];
      mostVisitedStore = mostStoreVisitedFrequency[mostStoreVisitedArray[0].storeName];
      mostItemBoughtArray = [].concat(req.user.itemList);
      mostItemBoughtArray = sortByFrequency(mostItemBoughtArray, "itemName");
      mostItemBoughtFrequency = mostItemBoughtArray[1];
      mostItemBought = mostItemBoughtFrequency[mostItemBoughtArray[0].itemName];
    }
    res.render("profile", {
      mostStoreVisitedArray: mostStoreVisitedArray,
      mostStoreVisitedFrequency: mostStoreVisitedFrequency,
      mostVisitedStore: mostVisitedStore,
      mostItemBoughtArray: mostItemBoughtArray,
      mostItemBoughtFrequency: mostItemBoughtFrequency,
      mostItemBought: mostItemBought,
      username: req.user.username
    });
  } else {
    res.redirect("/login");
  }
});

// display remove page
app.get("/remove", function(req, res) {
  if(req.isAuthenticated()){
    res.render("remove");
  } else {
    res.redirect("/login");
  }

});

//deletes selected item(s)
app.post("/remove", function(req, res) {
  if(req.isAuthenticated()){
    if (typeof(req.body.check) === "string") {
      const oneItemId = req.body.check;
      req.user.itemList.id(oneItemId).remove();
      req.user.save(function(err){
        if(err){
          console.log(err);
        } else {
          console.log("Item Deleted");
        }
      });
      // Receipt.findByIdAndRemove(oneItemId, function(err) {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     console.log("Item deleted");
      //   }
      // });
    } else if (typeof(req.body.check) === "object") {
      const arrayItemId = req.body.check;
      arrayItemId.forEach(itemId => {
        req.user.itemList.id(itemId).remove();
      });
        req.user.save(function(err){
          if(err){
            console.log(err);
          } else {
            console.log("Item Deleted");
          }
        });
        // Receipt.findByIdAndRemove(itemId, function(err) {
        //   if (err) {
        //     console.log(err);
        //   } else {
        //     console.log("Item deleted");
        //   }
        // });


      // });
    }
    res.redirect("/");
  } else {
    res.redirect("/login");
  }

});

//displays the modify page
app.get("/modify", function(req, res) {
  if(req.isAuthenticated()){
    res.render("modify");
  } else {
    res.redirect("/login");
  }

});

//modify selected item(s)
app.post("/modify", function(req, res) {
  if(req.isAuthenticated()){
    if (typeof(req.body.check) === "string") {
      const oneItemId = req.body.check;
      // Receipt.findById(oneItemId, function(err, item) {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     console.log("The item by id is : " + item);
      //     res.render("modify", {
      //       receiptList: [item]
      //     });
      //   }
      // });
      res.render("modify", {
        receiptList: [req.user.itemList.id(oneItemId)]
      });
    } else if (typeof(req.body.check) === "object") {
      const arrayItemId = req.body.check;
      let arrayItem = [];

      arrayItemId.forEach(itemId => {
        arrayItem.push(req.user.itemList.id(itemId));
      });
      res.render("modify", {
        receiptList: arrayItem
      });

      // console.log(arrayItemId);
      //
      // Receipt.find().where('_id').in(arrayItemId).exec(function(err, fullList) {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     res.render("modify", {
      //       receiptList: fullList
      //     });
      //   }
      // });
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/login");
  }

});

//updates in the database the changed values
app.post("/submitModified", function(req, res) {
  if(req.isAuthenticated()){
    console.log(req.body);
    let counter = 0;
    console.log(typeof(req.body.idItem));
    if (typeof(req.body.idItem) === "string") {
      req.user.itemList.id(req.body.idItem).date = req.body.updatedDate;
      req.user.itemList.id(req.body.idItem).storeName = req.body.updatedStoreName;
      req.user.itemList.id(req.body.idItem).storeAddress = req.body.updatedStoreAddress;
      req.user.itemList.id(req.body.idItem).itemNamename = req.body.updatedItem;
      req.user.itemList.id(req.body.idItem).itemQuantity = req.body.updatedQuantity;
      req.user.itemList.id(req.body.idItem).price = req.body.updatedPrice;

      req.user.save(function(err){
        if(err){
          console.log(err);
        } else {
          console.log("Item Deleted");
        }
      });
      // Receipt.findByIdAndUpdate({
      //   _id: req.body.idItem
      // }, {
      //   date: req.body.updatedDate,
      //   storeName: req.body.updatedStoreName,
      //   storeAddress: req.body.updatedStoreAddress,
      //   itemName: req.body.updatedItem,
      //   itemQuantity: req.body.updatedQuantity,
      //   price: req.body.updatedPrice
      // }, function(err, result) {
      //   if (err) {
      //     console.log(err);
      //   } else {
      //     console.log(result);
      //   }
      // });




      } else {
        req.body.idItem.forEach(id => {
        req.user.itemList.id(id).date = req.body.updatedDate[counter];
        req.user.itemList.id(id).storeName = req.body.updatedStoreName[counter];
        req.user.itemList.id(id).storeAddress = req.body.updatedStoreAddress[counter];
        req.user.itemList.id(id).itemName = req.body.updatedItem[counter];
        req.user.itemList.id(id).itemQuantity = req.body.updatedQuantity[counter];
        req.user.itemList.id(id).price = req.body.updatedPrice[counter];
        // Receipt.findByIdAndUpdate({
        //   _id: id
        // }, {
        //   date: req.body.updatedDate[counter],
        //   storeName: req.body.updatedStoreName[counter],
        //   storeAddress: req.body.updatedStoreAddress[counter],
        //   itemName: req.body.updatedItem[counter],
        //   itemQuantity: req.body.updatedQuantity[counter],
        //   price: req.body.updatedPrice[counter]
        // }, function(err, result) {
        //   if (err) {
        //     console.log(err);
        //   } else {
        //     console.log(result);
        //   }
        // });
        counter++;
      });
      req.user.save(function(err){
        if(err){
          console.log(err);
        } else {
          console.log("Item Deleted");
        }
      });
    }
    counter = 0;
    res.redirect("/");
  } else {
    res.redirect("/login");
  }

});




//Here will go the RESTfull API

// get all items
app.get("/rest", function(req, res) {
  Receipt.find(function(err, foundItems) {
    if (err) {
      res.send(err);
    } else {
      res.send(foundItems);
    }
  });
});

// post an item to the database
app.post("/rest", function(req, res) {
  const newItem = new Receipt({
    date: req.body.newDate,
    storeName: req.body.newStore,
    storeAddress: req.body.newAddress,
    itemName: req.body.newItem,
    itemQuantity: req.body.newQuantity,
    price: req.body.newPrice
  });
  newItem.save(function(err) {
    if (err) {
      res.send(err);
    } else {
      res.send("Posted Successfully");
    }
  });
});

//delete all items
app.delete("/rest", function(req, res) {
  Receipt.deleteMany(function(err) {
    if (err) {
      res.send(err);
    } else {
      res.send("Deleted all items");
    }
  });
});

//get a specific item
app.get("/rest/:itemName", function(req, res) {
  Receipt.findOne({
    itemName: req.params.itemName
  }, function(err, singleItem) {
    if (singleItem) {
      res.send(singleItem);
    } else {
      res.send("Item not found");
    }
  });
});

//overwrite all fields of the item
app.put("/rest/:itemName", function(req, res) {
  Receipt.update({
    itemName: req.params.itemName
  }, {
    date: req.body.newDate,
    storeName: req.body.newStore,
    storeAddress: req.body.newAddress,
    itemName: req.body.newItem,
    itemQuantity: req.body.newQuantity,
    price: req.body.newPrice
  }, {
    overwrite: true
  }, function(err) {
    if (err) {
      res.send(err);
    } else {
      res.send("Updated item");
    }
  });
});

//update some fields of the item
app.patch("/rest/:itemName", function(req, res) {
  Receipt.update({
    itemName: req.params.itemName
  }, {
    $set: req.body
  }, function(err) {
    if (err) {
      res.send(err);
    } else {
      res.send("Updated fields of the item");
    }
  });
});

//deletes single item
app.delete("/rest/:itemName", function(req, res) {
  Receipt.deleteOne({
    itemName: req.params.itemName
  }, function(err) {
    if (err) {
      res.send(err);
    } else {
      res.send("Deleted single item");
    }
  });
});


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
