const PORT = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

app.use(express.json());
app.use(cors());

// API Creation

app.get("/", (req, res) => {
  res.send("Express is working");
});

//Image Storage Engine

const storage = multer.diskStorage({
  destination: "./upload/images",
  filename: (req, file, cb) => {
    return cb(
      null,
      `${file.filename}_${Date.now()}${path.extname(file.originalname)}`
    );
  },
});
const upload = multer({ storage: storage });

//creating upload endpoint for image
app.use("/images", express.static("upload/images"));
app.post("/upload", upload.single("product"), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://wish-backend.onrender.com/images/${req.file.filename}`,
  });
});

// Schema for Creating Products
const Product = mongoose.model("Product", {
  id: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    require: true,
  },
  new_price: {
    type: Number,
    required: true,
  },
  old_price: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  available: {
    type: Boolean,
    default: true,
  },
});

app.post("/addproduct", async (req, res) => {
  let products = await Product.find({});
  let id;
  if (products.length > 0) {
    let last_product_array = products.slice(-1);
    let last_product = last_product_array[0];
    id = last_product.id + 1;
  } else {
    id = 1;
  }
  const product = new Product({
    id: id,
    name: req.body.name,
    image: req.body.image,
    category: req.body.category,
    new_price: req.body.new_price,
    old_price: req.body.old_price,
  });
  await product.save();
  console.log(product);
  res.json({
    success: 1,
    name: req.body.name,
  });
});

// API endpoint to Remove Product

app.post("/removeproduct", async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  console.log("removed");
  res.json({
    success: true,
    name: req.body.name,
  });
});

// API Endpoint for getting all products

app.get("/allproducts", async (req, res) => {
  const products = await Product.find({});
  console.log("All Products are Fetched");
  res.send(products);
});

// Schema creating for User model

const Users = mongoose.model("User", {
  name: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  cartData: {
    type: Object,
  },
  date: {
    type: Date,
    default: Date.now(),
  },
});

// Creating Endpoint for registering the user

app.post("/signup", async (req, res) => {
  let check = await Users.findOne({ email: req.body.email });
  if (check) {
    return res.status(400).json({
      success: false,
      errors: "existing user found with same email address",
    });
  }

  let cart = {};
  for (let i = 0; i < 300; i++) {
    cart[i] = 0;
  }

  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const data = {
    user: {
      id: user.id,
    },
  };

  const token = jwt.sign(data, "JWT_SECRET");
  res.status(200).json({
    success: true,
    name: req.body.username,
    token: token,
  });
});

// Creating endpoint for user login
app.post("/login", async (req, res) => {
  const user = await Users.findOne({ email: req.body.email });

  if (user) {
    const passCompare = req.body.password === user.password;
    if (passCompare) {
      const data = {
        user: {
          id: user.id,
        },
      };
      const token = jwt.sign(data, "JWT_SECRET");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, errors: "wrong Password" });
    }
  } else {
    res.json({ success: false, errors: "Wrong email Id" });
  }
});

//creating enpoint for newCollection
app.get("/newCollection", async (req, res) => {
  let products = await Product.find({});
  let newCollection = products.slice(1).slice(-8);
  console.log("New Collection fetched");
  res.send(newCollection);
});

// creating endpoint for popular in women section
app.get("/popularinwomen", async (req, res) => {
  let products = await Product.find({ category: "women" });
  let popular_in_women = products.slice(0, 4);
  console.log("Popular in women fetched");
  res.send(popular_in_women);
});

// creating middleware to fetch user
const fetchUser = (req, res, next) => {
  const token = req.header("auth-token");
  if (!token) {
    console.log("No token provided");
    return res
      .status(401)
      .send({ errors: "Please authenticate using a valid token" });
  }

  try {
    const data = jwt.verify(token, "JWT_SECRET");
    req.user = data.user;
    console.log("User authenticated", req.user);
    next();
  } catch (error) {
    console.log("Token verification failed", error.message);
    return res
      .status(401)
      .send({ errors: "Please authenticate using a valid token" });
  }
};

// creating endpoint for adding products in cartdata
app.post("/addtocart", fetchUser, async (req, res) => {
  let userData = await Users.findOne({ _id: req.user.id });
  userData.cartData[req.body.itemId] += 1;
  await Users.findOneAndUpdate(
    { _id: req.user.id },
    { cartData: userData.cartData }
  );
  res.json({ success: true, message: "Added" });
});

//creating endpoint to remove products from cartdata
app.post("/removefromcart", fetchUser, async (req, res) => {
  console.log("removed", req.body.itemId);
  let userData = await Users.findOne({ _id: req.user.id });
  if (userData.cartData[req.body.itemId] > 0)
    userData.cartData[req.body.itemId] -= 1;
  await Users.findByIdAndUpdate({ _id: req.user.id }, { cartData: userData });
  res.send({ success: true, message: "Removed" });
});

//created enpoint to get cartdData
app.post("/getcart", fetchUser, async (req, res) => {
  console.log("Get cart");
  let userData = await Users.findOne({ _id: req.user.id });
  res.json(userData.cartData);
});

//API endpoint to remove all products from cart

// API endpoint to remove all products from cart
// app.post("/orderplaced", fetchUser, async (req, res) => {
//   try {
//     console.log("All products from cart are removed");

//     let userData = await Users.findOne({ _id: req.user.id });
//     if (userData) {
//       for (let productId in userData.cartData) {
//         userData.cartData[productId] = 0;
//       }

//       await userData.save();

//       res.json({ success: true, message: "Cart cleared", userData });
//     } else {
//       res.status(404).json({ success: false, message: "User not found" });
//     }
//   } catch (error) {
//     console.error("Error clearing cart:", error);
//     res.status(500).json({ success: false, message: "Internal server error" });
//   }
// });

//PORT

app.listen(PORT, () => {
  console.log("server is running on " + PORT);
  mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDb connected successfully");
});
