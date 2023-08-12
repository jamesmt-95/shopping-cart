const express = require("express");

var db = require("../config/mongodb");
var collection = require("../config/collections");

//we should convert type:string id to type object
var ObjectId = require("mongodb").ObjectId;

module.exports = {
  // addProduct: (product, callback) => {
  //   db.get()
  //     .collection("productformData")
  //     .insertOne(product)
  //     .then((formData) => {
  //       // console.log(formData);
  //       callback(formData);
  //     });
  // }

  //converting the above to promise
  addProduct: (product) => {
    return new Promise(async (resolve, reject) => {
      product.price = Number(product.price);
      const status = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .insertOne(product);
      resolve(status);
      //Also we can write as follows (without await)
      // db.get()
      // .collection(collection.PRODUCT_COLLECTION)
      // .insertOne(product)
      // .then((status) => {
      //   resolve(status);
      // });
    });
  },
  getProducts: () => {
    //using promise
    return new Promise(async (resolve, reject) => {
      const prdCollection = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({})
        .toArray();
      resolve(prdCollection);
    });
    //Using normal Callback (admin:71:6)
    // getProducts: async (callback) => {
    // const prdCollection = await db
    //   .get()
    //   .collection(collection.PRODUCT_COLLECTION)
    //   .find({})
    //   .toArray();
    // callback(prdCollection);
    // });
  },
  deleteProduct: (id) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .deleteOne({ _id: ObjectId(id) })
        //ObjectId used to convert plain text id into Object
        .then((status) => {
          // console.log(status);
          resolve(status);
        });
    });
  },
  editProduct: (id) => {
    return new Promise(async (resolve, reject) => {
      const product = await db
        .get()
        .collection(collection.PRODUCT_COLLECTION)
        .find({ _id: ObjectId(id) })
        .toArray();
      resolve(product);
    });
  },
  updateProduct: (formData, prdId) => {
    formData.price = Number(formData.price);
    return new Promise(async (resolve, reject) => {
      db.get()
        .collection(collection.PRODUCT_COLLECTION)
        .updateOne(
          { _id: ObjectId(prdId) },
          {
            $set: {
              name: formData.name,
              category: formData.category,
              price: formData.price,
              description: formData.description,
            },
          }
        )
        .then((status) => {
          resolve(status);
        });
    });
  },
  getUserOrders: () => {
    return new Promise(async (resolve, reject) => {
      const userOrdersCollection = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: {
              status: "placed",
            },
          },
          {
            $project: {
              _id: 1,
              user: 1,
              userPaymentType: 1,
              totalCartAmount: 1,
              cartData: 1,
              date: 1,
              status: 1,
              totalItems: "$cartData".length,
              orderDate: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date",
                },
              },
            },
          },
          {
            $lookup: {
              from: collection.PRODUCT_COLLECTION,
              let: { product: "$cartData" },
              pipeline: [
                //or localField , foreignField
                {
                  $match: {
                    $expr: {
                      $in: ["$_id", "$$product.item"],
                    },
                  },
                },
              ],
              as: "userOrderDetails",
            },
          },
          {
            $lookup: {
              from: collection.USERDATA_COLLECTION,
              localField: "user",
              foreignField: "_id",
              as: "UserData",
            },
          },
          {
            $addFields: {
              user: {
                $arrayElemAt: ["$UserData", 0],
              },
            },
          },
          {
            $sort: {
              date: -1,
            },
          },
        ])
        .toArray();
      // console.log(userOrdersCollection);
      resolve(userOrdersCollection);
    });
  },
  approveUserOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      console.log(orderId);
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: ObjectId(orderId) },
          {
            $set: {
              status: "shipped",
            },
          }
        )
        .then((status) => {
          resolve(status);
        });
    });
  },
};
