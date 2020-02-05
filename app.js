//jshint esversion:6

//importing libraries
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");

//initializing app and using public directory for css
const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

//using ejs for public and views directories containing ejs files
app.set('view engine', 'ejs');

//connect to MongoDB and create database
mongoose.connect("mongodb://localhost:27017/receiptDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

//structure of an object in the database receiptDB
const receiptsSchema = {
  date: String,
  storeName: String,
  storeAddress: String,
  itemName: String,
  itemQuantity: Number,
  price: Number
};

//create receipt model
const Receipt = mongoose.model("Receipt", receiptsSchema);

app.get("/", function(req, res) {
  Receipt.find({}, function(err, foundReceipt) {
    res.render("home", {
      receiptList: foundReceipt
    });
  });
});


app.get("/add", function(req, res) {
  res.render("add");
});

app.post("/add", function(req, res) {
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
    newItem.save();
    res.redirect("/");
    console.log("saved in db");
  }

});

app.get("/remove", function(req, res) {
  res.render("remove");
});

app.post("/remove", function(req, res) {
  if (typeof(req.body.check) === "string") {
    const oneItemId = req.body.check;
    Receipt.findByIdAndRemove(oneItemId, function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("Item deleted");
      }
    });
  } else if (typeof(req.body.check) === "object") {
    const arrayItemId = req.body.check;
    arrayItemId.forEach(itemId => {
      Receipt.findByIdAndRemove(itemId, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Item deleted");
        }
      });
    });
  }
  res.redirect("/");
});

app.get("/modify", function(req, res) {
  console.log("Code comes here");
  res.render("modify");
});

app.post("/modify", function(req, res) {
  if (typeof(req.body.check) === "string") {
    const oneItemId = req.body.check;
    Receipt.findById(oneItemId, function(err, item){
      if(err){
        console.log(err);
      }else{
        console.log("The item by id is : " + item);
        res.render("modify", {
          receiptList: [item]
        });
      }
    });
    // res.render("modify", {
    //   itemId: oneItemId
    // });
  } else if (typeof(req.body.check) === "object") {
    const arrayItemId = req.body.check;

    console.log(arrayItemId);

    Receipt.find().where('_id').in(arrayItemId).exec(function(err, fullList){
      if(err){
        console.log(err);
      } else {
        res.render("modify", {
          receiptList: fullList
        });
      }
    });

    // res.render("modify", {
    //   receiptList: arrayItemId
    // });
  } else {
    res.redirect("/");
  }
  // console.log(req.body);
  // res.render("modify");
});

app.post("/submitModified", function(req, res){
  console.log(req.body);
  res.redirect("/");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
