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


//display add page
app.get("/add", function(req, res) {
  res.render("add");
});

//adds a new item to the receipt list
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

// display remove page
app.get("/remove", function(req, res) {
  res.render("remove");
});

//deletes selected item(s)
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

//displays the modify page
app.get("/modify", function(req, res) {
  res.render("modify");
});

//modify selected item(s)
app.post("/modify", function(req, res) {
  if (typeof(req.body.check) === "string") {
    const oneItemId = req.body.check;
    Receipt.findById(oneItemId, function(err, item) {
      if (err) {
        console.log(err);
      } else {
        console.log("The item by id is : " + item);
        res.render("modify", {
          receiptList: [item]
        });
      }
    });
  } else if (typeof(req.body.check) === "object") {
    const arrayItemId = req.body.check;

    console.log(arrayItemId);

    Receipt.find().where('_id').in(arrayItemId).exec(function(err, fullList) {
      if (err) {
        console.log(err);
      } else {
        res.render("modify", {
          receiptList: fullList
        });
      }
    });
  } else {
    res.redirect("/");
  }
});

//updates in the database the changed values
app.post("/submitModified", function(req, res) {
  console.log(req.body);
  let counter = 0;
  console.log(typeof(req.body.idItem));
  if (typeof(req.body.idItem) === "string") {
    Receipt.findByIdAndUpdate({
      _id: req.body.idItem
    }, {
      date: req.body.updatedDate,
      storeName: req.body.updatedStoreName,
      storeAddress: req.body.updatedStoreAddress,
      itemName: req.body.updatedItem,
      itemQuantity: req.body.updatedQuantity,
      price: req.body.updatedPrice
    }, function(err, result) {
      if (err) {
        console.log(err);
      } else {
        console.log(result);
      }
    });
  } else {
    req.body.idItem.forEach(id => {
      Receipt.findByIdAndUpdate({
        _id: id
      }, {
        date: req.body.updatedDate[counter],
        storeName: req.body.updatedStoreName[counter],
        storeAddress: req.body.updatedStoreAddress[counter],
        itemName: req.body.updatedItem[counter],
        itemQuantity: req.body.updatedQuantity[counter],
        price: req.body.updatedPrice[counter]
      }, function(err, result) {
        if (err) {
          console.log(err);
        } else {
          console.log(result);
        }
      });
      counter++;
    });
  }
  counter = 0;
  res.redirect("/");
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
