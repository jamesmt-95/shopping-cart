const db = require("../config/mongodb"); 
const ObjectId = require("mongodb").ObjectId;
const collection = require("../config/collections");
// collections.USERDATA_COLLECTION
const bcrypt = require("bcrypt");
// bcrypt is a password-hashing function designed by Niels Provos and David Mazières, based on the Blowfish cipher and presented at USENIX in 1999
// The bcrypt hashing function allows us to build a password security platform that scales with computation power and always hashes every password with a salt.
//https://heynode.com/blog/2020-04/salt-and-hash-passwords-bcrypt/
//salt Round
var saltRounds = 10;
//https://stackoverflow.com/questions/46693430/what-are-salt-rounds-and-how-are-salts-stored-in-bcrypt

//Razorpay instance as global
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_DMa7duKLfVQgLM",
  key_secret: "UBFmdfR5P1yoVfydU5RL7ejr",
});

module.exports = {
  signupHandler: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.password = await bcrypt.hash(userData.password, saltRounds);
      db.get()
        .collection(collection.USERDATA_COLLECTION)
        .insertOne(userData)
        .then((status) => {
          resolve(status);
        });
    });
  },
  loginHandler: (loginData) => {
    //for a practise, I used callback method to write this loginHandler
    // loginHandler: (loginData, callback) => {
    // db.get()
    //   .collection(collection.USERDATA_COLLECTION)
    //   .insertOne(loginData)
    //   .then((data) => {
    //     callback(data);
    //   });

    //rewriting the above using Promise
    console.log(loginData);
    return new Promise(async (resolve, reject) => {
      let response = {};

      let checkUser = await db
        .get()
        .collection(collection.USERDATA_COLLECTION)
        .findOne({ email: { $eq: loginData.email } });

      if (checkUser) {
        // bcrypt.compare('user entered pass','pass from db')
        bcrypt
          .compare(loginData.password, checkUser.password)
          .then((status) => {
            if (status) {
              //true
              //checking for whether status is true
              //   console.log(`${checkUser.email} : ${checkUser.password}`);
              response.status = true;
              response.user = checkUser;
              resolve(response);
              //   console.log("Login Success");
            } else {
              reject(`Password doesn't match`);
              //   console.log("Login Failed");
            }
          });
      } else {
        reject(`No user found`);
      }
    });
  },
  //AJAX Methods
  addToCart: (prdid, userid) => {
    return new Promise(async (resolve, reject) => {
      console.log(typeof prdid);
      //first we need to check if user cart is exists
      let checkUserCart = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        .findOne({ user: { $eq: ObjectId(userid) } });

      const prdObject = {
        item: ObjectId(prdid),
        quantity: 1,
      };

      if (checkUserCart) {
        //Get the index of the product, if it's already added in cart
        const prdExist = checkUserCart.cartItems.findIndex(
          (x) => x.item.equals(ObjectId(prdid))
          // Why .equals?
          // ObjectIDs are objects(Non-Primitive) so if you just compare them with == you're comparing their references.
          // If you want to compare their values you need to use the ObjectID.equals
        );
        // checkUserCart.cartItems.forEach((element) => {
        //   if (element.item.equals(ObjectId(prdid))) {
        //     console.log("True");
        //   }
        // });

        console.log(prdExist);
        if (prdExist != -1) {
          // which means product already exists in the cart
          // index -1 means not found, 0 or >0 means product found in the cart
          db.get()
            .collection(collection.CARTDATA_COLLECTION)
            .updateOne(
              //https://www.tutorialspoint.com/mongodb-syntax-for-updating-an-object-inside-an-array-within-a-document
              { user: ObjectId(userid), "cartItems.item": ObjectId(prdid) },
              {
                $inc: {
                  //increment
                  // Use the positional $ operator
                  // positional $ operator which identifies the element in the cartItems array to update without explicitly specifying its position in the array i.e. instead of knowing the position in advance and updating the element
                  "cartItems.$.quantity": +1, //+1 || 1 || -1
                },
              } //prev: ObjectId(prdid), now prdid is collected from event.target.dataset.prdid
            )
            .then((status) => {
              resolve(status);
            });
        } else {
          //Updating the cart
          db.get()
            .collection(collection.CARTDATA_COLLECTION)
            .updateOne(
              { user: ObjectId(userid) },
              { $push: { cartItems: prdObject } } //prev: ObjectId(prdid), now prdid is collected from event.target.dataset.prdid
            )
            .then((status) => {
              resolve(status);
            });
        }
      } else {
        //creating an object cart and inserting this object into userCart collection (collection.CARTDATA_COLLECTION)
        const userCartObj = {
          user: ObjectId(userid), //initially checking for this, if true update the cart
          // cartItems: [ObjectId(prdid)], updating this to include cart quantity
          cartItems: [prdObject],
        };
        db.get()
          .collection(collection.CARTDATA_COLLECTION)
          .insertOne(userCartObj)
          .then((status) => {
            resolve(status);
          });
      }
    });
  },
  fetchCartItems: (userid) => {
    return new Promise(async (resolve, reject) => {
      // const cartList = await db
      //   .get()
      //   .collection(collection.CARTDATA_COLLECTION)
      //   .find({ user: ObjectId(userid) }, { _id: 1, user: 0, cartItems: 1 })
      //   .toArray();
      const cartItemsList = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        //MongoDB Aggregations operations process data records and return computed results.
        //check mongodb/notes.txt for more aggregate ooperators and ex's.
        .aggregate([
          //stage - 1
          {
            //aggregate pipeline - An aggregation pipeline consists of one or more stages that process documents
            $match: { user: ObjectId(userid) },
          },
          //stage - 2
          {
            //we can use $lookup to join two documents, but in this case cartItems is an array, so diff approach
            // $lookup: {
            //   from: "productData",
            //   localField: "",
            //   foreignField: "",
            //   as: "",
            // },
            //Join Condition and Subqueries on a Joined Collection - https://hevodata.com/learn/mongodb-lookup/
            $lookup: {
              // from: "productData", - name of the collection,
              from: collection.PRODUCT_COLLECTION,
              let: { products: "$cartItems" }, //products - a variable, $ccartItems - array in db that stores cart data
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$products"],
                    },
                  },
                },
              ],
              as: "cartData", //this will contains the matched product data
            },
          },
        ])
        .toArray();
      // console.dir(cartList);
      // resolve(cartList[0].cartData); // or use $project in aggreagte

      //data structure has been modified to track quantity of each item in the cart. So aggregate method also
      const cartList = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userid) },
          },
          //$unwind - It's used to deconstruct an array field in a document and create separate output documents for each item in the array.
          { $unwind: "$cartItems" },
          {
            $project: {
              //$project stage is extremely useful for showing only the fields you need. Here,
              item: "$cartItems.item",
              quantity: "$cartItems.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item", //'item' holds product id
              foreignField: "_id",
              as: "productCartList",
            },
          },
          //adding the following $project to get the total price(item price * cart quantity)
        ])
        .toArray();
      console.log(cartList);
      resolve(cartList); // or use $project in aggreagte
    });
  },
  getCartCount: (userid) => {
    return new Promise(async (resolve, reject) => {
      let cartCount = 0;
      const checkCart = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        .findOne({ user: { $eq: ObjectId(userid) } });
      if (checkCart) {
        cartCount = checkCart.cartItems.length; //cartItems is an array
      }
      resolve(cartCount);
    });
  },
  updateCartQty: (product, quantity, user) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CARTDATA_COLLECTION)
        .updateOne(
          { user: ObjectId(user), "cartItems.item": ObjectId(product) },
          {
            $inc: {
              "cartItems.$.quantity": quantity,
            },
          }
        )
        .then((status) => {
          resolve(status);
        });
    });
  },
  //Once you increase or decrease the cart quantity the following function will return the updated quantity of the particular product
  getEachPrdCount: (userid, prdid) => {
    console.log(userid, prdid);
    return new Promise(async (resolve, reject) => {
      //I have tried the following query(with $elemMatch) in MongoDB Compass, and it properly showing the result with only the matched item. But here in this code, it returns all the items from the cartItems array.
      //By God's grace=> Therefore, Used forEach to iterate through each cartItems, and checks for incoming product id, if it found qty variable will be updated.
      const prdQty = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        .findOne(
          { user: ObjectId(userid) },
          {
            cartItems: { $elemMatch: { item: ObjectId(prdid) } },
          }
        );
      // console.log(prdQty.cartItems[0]);
      let cartQty = 0;
      prdQty.cartItems.forEach((x) => {
        if (x.item.equals(ObjectId(prdid))) {
          cartQty = x.quantity;
        }
      });
      resolve(cartQty);
    });
  },
  removeFromCart: (userid, product) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CARTDATA_COLLECTION)
        .updateOne(
          {
            user: ObjectId(userid),
          },
          {
            $pull: {
              cartItems: {
                item: ObjectId(product),
              },
            },
          }
        )
        .then((status) => {
          resolve(status);
        })
        .catch((err) => {
          reject(err);
        });
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      const totalAmountList = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        .aggregate([
          {
            $match: { user: ObjectId(userId) },
          },
          //$unwind - It's used to deconstruct an array field in a document and create separate output documents for each item in the array.
          { $unwind: "$cartItems" },
          {
            $project: {
              //$project stage is extremely useful for showing only the fields you need. Here,
              item: "$cartItems.item",
              quantity: "$cartItems.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "item", //'item' holds product id
              foreignField: "_id",
              as: "productCartList",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: {
                $arrayElemAt: ["$productCartList", 0],
              },
            },
          },
          {
            //using $group to get total sum from all the items
            // $project: {
            $group: {
              _id: null,
              totalAmount: {
                $sum: {
                  $multiply: ["$quantity", "$product.price"],
                },
              },
            },
          },
          //adding the following $project to get the total price(item price * cart quantity)
        ])
        .toArray();
      console.log(totalAmountList[0]);
      if (totalAmountList) {
        resolve(totalAmountList[0].totalAmount);
      } else {
        reject(0);
      }
    });
  },
  getCartDetailsForOrder: (userId) => {
    return new Promise(async (resolve, reject) => {
      const cartData = await db
        .get()
        .collection(collection.CARTDATA_COLLECTION)
        .findOne({ user: ObjectId(userId) });
      resolve(cartData);
    });
  },
  processUserOrder: (orderData, cartData, userId) => {
    return new Promise(async (resolve, reject) => {
      //first we need to check whether user is exists, if exists then push 'orderObject' otherwise insert 'orderDetailsObject'

      // const orderDetailsObject = {...orderData} using "spread operator" we can copy an object to another
      const orderDetailsObject = {
        user: ObjectId(userId),
        userAddress: orderData.userAddress,
        userPIN: orderData.userPIN,
        userPhone: orderData.userPhone,
        userPaymentType: orderData.userPaymentType,
        totalCartAmount: orderData.totalCartAmount,
        cartData: cartData.cartItems,
        status:
          orderData.userPaymentType === "Pay on Delivery"
            ? "placed"
            : "pending",
        date: new Date(),
      };
      //Inserting Order object to order collection
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderDetailsObject)
        .then((status) => {
          //once order details inserted then we can delete cart collection with user id
          db.get()
            .collection(collection.CARTDATA_COLLECTION)
            .deleteOne({ user: ObjectId(userId) })
            .then((response) => {
              // console.log(response);  { acknowledged: true, deletedCount: 1 }
              resolve(status.insertedId.toString());
            });
        });
    });
  },
  getOrdersList: (userId) => {
    console.log(userId);
    return new Promise(async (resolve, reject) => {
      const ordersData = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              user: ObjectId(userId),
            },
          },
          {
            $project: {
              userAddress: 1,
              userPIN: 1,
              userPhone: 1,
              status: 1,
              userPaymentType: 1,
              totalCartAmount: 1,
              cartData: 1,
              date: 1, //keeping this for sorting
              orderDate: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" },
              },
            },
          },
          //using $lookup with pipelne
          // {
          //   $lookup: {
          //     from: collection.PRODUCT_COLLECTION,
          //     let: { product: "$cartData.item" },
          //     pipeline: [
          //       {
          //         $match: {
          //           $expr: {
          //             $in: ["$_id", "$$product"], //or $$product.item (product :'$cartData) //second argument should be an array
          //           },
          //         },
          //       },
          //     ],
          //     as: "cartDetails",
          //   },
          // },

          //easiest way
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              localField: "cartData.item", //FieldPath field(local & foreign) names may not start with '$'
              foreignField: "_id",
              as: "cartDetails",
            },
          },
          {
            $addFields: {
              idString: { $toString: "$_id" }, //not using
            },
          },
          {
            $sort: {
              date: -1, //recent order should appear first
            },
          },
        ])
        .toArray();
      // console.log("aggregrate");
      console.log(ordersData);
      resolve(ordersData);
    });
  },
  generateRazorpayOrder: (orderId, totalCartAmount) => {
    //Note: totalCartAmount is passed from AJAX, otherwise we find it from order collection using received order id
    return new Promise((resolve, reject) => {
      //https://razorpay.com/docs/payments/server-integration/nodejs/payment-gateway/build-integration/#11-install-razorpay-nodejs-sdk
      // install razorpay module
      // var instance = new Razorpay({
      //   key_id: "YOUR_KEY_ID",
      //   key_secret: "YOUR_KEY_SECRET",
      // });
      var options = {
        // amount: 50000, // amount in the smallest currency unit
        amount: totalCartAmount * 100,
        currency: "INR",
        // receipt: "order_rcptid_11",
        receipt: orderId,
      };

      instance.orders.create(options, function (err, order) {
        console.log(order);
        if (!err) resolve(order);
        else console.log(err);
      });
    });
  },
  verifyPaymentSignature: (paymentObject) => {
    console.log(paymentObject);
    //payment object contains order and handler response
    return new Promise((resolve, reject) => {
      const crypto = require("crypto");
      const expectedSignature = crypto
        .createHmac(
          "sha256",
          "UBFmdfR5P1yoVfydU5RL7ejr" //razorpay secret(declred in the instance)
        )
        .update(
          paymentObject.response.razorpay_order_id +
            "|" +
            paymentObject.response.razorpay_payment_id
        )
        .digest("hex");

      console.log(
        "signature received ",
        paymentObject.response.razorpay_signature
      );
      console.log("signature generated ", expectedSignature);

      if (paymentObject.response.razorpay_signature === expectedSignature) {
        console.log("Payment successful");
        resolve({ status: true });
      } else {
        reject("Payment Failed");
      }
    });
  },
  changeOrderStatus: (orderId) => {
    console.log(`OrderId` + orderId);
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: "placed",
            },
          }
        )
        .then((status) => {
          resolve(status);
        });
    });
  },
  searchProduct: (keyword) => {
    return new Promise(async (resolve, reject) => {
      //step 1 - create index
      //To run legacy text search queries, you must have a text index on your collection.
      //MongoDB provides text indexes to support text search queries on string content.
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .createIndex({ name: "text", description: "text" });

      //step 2 - search query
      const searchResult = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ $text: { $search: keyword } })
        .toArray();

      resolve(searchResult);
    });
  },
};
