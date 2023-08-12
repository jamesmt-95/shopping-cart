var express = require("express");
var router = express.Router();

var prdHelper = require("../helpers/product-helpers");
var userHelper = require("../helpers/user-helper");

var collection = require("../config/collections");
// const { response } = require("../app");
const { reset } = require("nodemon");
const { response } = require("../app");

// the following function will act as a middleware to verify whether the user is loggedin or not
// we will use this middleware in routers sunch as cart, account etc to ensure user.
const verifyLogin = (req, res, next) => {
  //next - It passes control to the next matching route
  if (req.session.loggedIn === true) {
    next();
  } else {
    res.redirect("/user/login");
  }
};

/* GET home page. */
router.get("/", async (req, res, next) => {
  //checking cart collection to update the cart badge (users header - partials)
  let cartCount = null;
  //checking whether user loggedIn
  if (req.session.user) {
    cartCount = await userHelper.getCartCount(req.session.user._id);
  }

  let user = req.session.user;
  // Fetch products
  prdHelper.getProducts().then((products) => {
    res.render("views-user/view-products", {
      title: "Home",
      admin: false,
      products,
      user,
      cartCount,
    });
  });
});

//signup GET
router.get("/user/signup", (req, res) => {
  res.render("views-user/signup", { admin: false, title: "Sign Up" });
});

//Signup POST
router.post("/user/signup", (req, res) => {
  userHelper.signupHandler(req.body).then((status) => {
    console.log(status.insertedId.toString());
    res.render("views-user/login");
  });
});

//login GET
router.get("/user/login", (req, res) => {
  // console.log(req.session.logError);
  if (req.session.loggedIn === true) {
    // res.render("views");
    res.redirect("/");
  } else {
    res.render("views-user/login", {
      admin: false,
      title: "Login",
      logError: req.session.logError,
    });
    //once redirects to login then the logError will be cleared, so that user wont seen that msg again once he refreshes the page.
    req.session.logError = null;
  }
});

//Login POST
router.post("/user/login", (req, res) => {
  // ===== using Callback =====
  // userHelper.loginHandler(req.body, (response) => {
  //   console.log(response.insertedId.toString());
  // });

  // ===== using Promise =====
  userHelper
    .loginHandler(req.body)
    .then((response) => {
      if (response.status === true) {
        //setup the session varaible
        req.session.loggedIn = true; //response.status
        req.session.user = response.user;
        console.dir(response.user);
        res.redirect("/");
      }
    })
    .catch((err) => {
      console.log(`Error -  ${err}`);
      //redirect to error
      req.session.logError = err;
      res.redirect("/user/login");
      // res.render("views-user/login", { message: err });
    });
});

//Logout
router.get("/user/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/user/login"); //or homepage
});

// Add to cart - AJAX (No page refresh)
// AJAX method to add the items to cart, update the cart badge and cartdata collection
router.get("/user/add-to-cart", (req, res) => {
  //request from public\javascripts\script.js:63:1
  // const prdId = req.params.id;
  // console.log(typeof req.params.id);
  if (!req.session.user) {
    res.status(400).send("User not found");
  }
  console.log(`Product ID:${req.query.id}`); //got issues with req.params.id therefore used req.query.id
  userHelper
    .addToCart(req.query.id, req.session.user._id) //we are saving cart items with user id
    .then(async (status) => {
      //if the above returns a promise
      // res.redirect("/"); or we can redirect to cart page
      // res.json(status);
      console.dir(status);
      if (req.session.user) {
        let cartItemsCount = await userHelper.getCartCount(
          req.session.user._id
        );
        res.json(cartItemsCount);
      }
    })
    .catch((err) => {
      res.status(505).send(err); //or res.send(505)
    });
});
//Get user cart items
router.get("/user/cart", verifyLogin, (req, res) => {
  //we can use 'verifyLogin' middleware to check whether user is logged in
  userHelper.fetchCartItems(req.session.user._id).then((data) => {
    console.dir(data);
    // method to get total price of items (item price * quantity)
    userHelper.getTotalAmount(req.session.user._id).then((totalPrice) => {
      console.log(`Total: ${totalPrice}`);
      res.render("views-user/user-cart", {
        title: "Your Cart",
        admin: false,
        user: req.session.user,
        products: data,
        totalPrice: totalPrice,
        //need to update this?????
      });
    });
  });
});
// update cart quantity (AJAX)
// router.post("/user/update-cart-quanyity", verifyLogin, (req, res) => { //prev. the fetch method was GET
router.post("/user/update-cart-quanyity", verifyLogin, (req, res) => {
  if (!req.session.user) {
    res.status(400).send("User not found");
  }
  //GET req
  // const product = req.query.prdid;
  // const action = req.query.action;

  //POST req
  console.dir(req.body);
  const product = req.body.prdid;
  const quantity = req.body.quantity; //using ternary operator from script.js
  //server side update
  userHelper
    .updateCartQty(product, quantity, req.session.user._id)
    .then((status) => {
      //client side update - if qty updated successfully, then update the qty input field
      console.log(status);
      userHelper
        .getEachPrdCount(req.session.user._id, product)
        .then((response) => {
          // console.log(Object.entries(response[0]));
          console.log(response);
          res.json(response); //response - updated item quantity
        });
    });
});

//part of update cart quantity
//method to update the total price, the same method is included in the /user/cart
router.get("/user/getTotalPrice", verifyLogin, async (req, res) => {
  let totalPrice = await userHelper.getTotalAmount(req.session.user._id);
  // console.log(`Total: ${totalPrice}`);
  res.json(totalPrice);
});

//Delete Item - AJAX
router.delete("/user/delete-cart-item/:id", (req, res) => {
  //we can also use req.body
  // console.log(req.body);
  const productId = req.params.id;
  console.log(productId);
  userHelper.removeFromCart(req.session.user._id, productId).then((status) => {
    console.log(status);
    // res.redirect("/user/cart");
    res.json({ status: true });
  });
});

//user order-details (proceeding from cart page)
// (From cart page to Checkout)
router.get("/user/delivery-details", verifyLogin, (req, res) => {
  userHelper.getTotalAmount(req.session.user._id).then((totalPrice) => {
    res.render("views-user/delivery-details", {
      admin: false,
      title: "Checkout",
      user: req.session.user,
      totalPrice: totalPrice,
    });
  });
});

//fetch with place order (AJAX)
//from checkout to order confirmation
router.post("/user/place-order", verifyLogin, async (req, res) => {
  console.log(req.body);
  //we need to fetch current cart details to process order.
  // userHelper.getCartDetailsForOrder(req.session.user._id).then((cartData) => {
  // });
  const cartData = await userHelper.getCartDetailsForOrder(
    //cartData.cartItems
    req.session.user._id
  );
  // const cartData = await userHelper.getCartDetailsForOrder(req.body.userId);
  // Note: we required totalPrice in the placeOrder(), for that we can use userHelper.getTotalAmount(req.session.user._id)
  // but its already in req.body (retrieved totalAmount from DOM) object
  userHelper
    .processUserOrder(req.body, cartData, req.session.user._id)
    .then((orderId) => {
      // res.json(response);
      if (req.body.userPaymentType === "Pay on Delivery") {
        res.json({ status: true });
      } else {
        //Razorpay integration
        userHelper
          .generateRazorpayOrder(orderId, req.body.totalCartAmount)
          .then((order) => {
            res.json(order);
          });
      }
    });
});

router.get("/user/cod-confirmation", verifyLogin, (req, res) => {
  //input details(recent order) from ordercart collection
  res.render("views-user/order-confirmation", {
    title: "Order confirmation",
    admin: false,
    user: req.session.user,
  });
});

router.get("/user/my-orders", verifyLogin, async (req, res) => {
  // const data = await userHelper.getOrdersList(req.session.user.id);
  userHelper.getOrdersList(req.session.user._id).then((data) => {
    // console.log(data[0]._id);
    res.render("views-user/user-orders", {
      title: "My Orders",
      admin: false,
      user: req.session.user,
      myOrders: data,
    });
  });
});

router.post("/user/verify-payment", verifyLogin, (req, res) => {
  // console.log(req.body.response);
  console.log(req.body);
  //we need to verify payment
  userHelper.verifyPaymentSignature(req.body).then((response) => {
    if (response.status === true) {
      //If Paymnet is SuccessFul, then change the order status from 'pending' to 'completed'
      userHelper.changeOrderStatus(req.body.order.receipt).then((status) => {
        res.json(status);
        // console.log(response);
      });
    }
  });
});

//Search product - Form
router.post("/user/search-product", (req, res) => {
  // console.log(req.body.userSearch);
  userHelper.searchProduct(req.body.userSearch).then((searchData) => {
    console.log(searchData);
    res.render("views-user/view-products", {
      admin: false,
      title: "Search Results",
      products: searchData,
    });
  });
});

module.exports = router;

// User Methods
// Get Products - GET (Homepage)
// Signup - GET
// Signup - POST
// Login - GET
// Login - POST
// logout
// Add to cart (AJAX)
// Get Cart Items (aggregate - $match, $unwind, $project, $lookup)
// update Cart quantity & Total Price(AJAX) & updated quantity
// Delete cart item
// Process order
//razor pay & verify payment
