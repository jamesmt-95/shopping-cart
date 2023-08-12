var express = require("express");
var router = express.Router();
var path = require("path");

//get product helper
var prdHelper = require("../helpers/product-helpers");

/* GET admin listing. */

const adminVerifyLogin = (req, res, next) => {
  if (req.session.admin === true) {
    next();
  } else {
    // res.redirect("/admin/login"); //need to work on it
    res.send("You do not have permission! Login First");
  }
};

router.get("/", function (req, res, next) {
  //============ Alternate to Admin Login ============
  req.session.admin = true; //Instead of Admin Login

  // res.send('respond with a resource');
  // res.render("index", { admin: true });
  const products = [
    {
      name: "Galaxy A53 5G",
      image:
        "https://images.samsung.com/is/image/samsung/p6pim/levant/2202/gallery/levant-galaxy-a53-5g-a536-sm-a536ezkhmea-thumb-531473465?$160_160_PNG$",
      category: "Mobile",
      description:
        "Galaxy A53 5G premium features including fast charging, Super AMOLED Infinity-U display, rear camera, and more.",
    },
    {
      name: "Galaxy A33 5G",
      image:
        "https://images.samsung.com/is/image/samsung/p6pim/levant/sm-a336ezkgmea/gallery/levant-galaxy-a33-5g-a336-sm-a336ezkgmea-thumb-531528696?$160_160_PNG$",
      category: "Mobile",
      description:
        "Galaxy A33 5G premium features including fast charging, Super AMOLED Infinity-U display, rear camera, and more.",
    },
    {
      name: "Galaxy A52s 5G",
      image:
        "https://images.samsung.com/is/image/samsung/p6pim/levant/sm-a528bzkhmeb/gallery/levant-galaxy-a52s-5g-a528-sm-a528bzkhmeb-thumb-504527826?$160_160_PNG$",
      category: "Mobile",
      description:
        "Galaxy A52s 5G premium features including fast charging, Super AMOLED Infinity-U display, rear camera, and more.",
    },
    {
      name: "Galaxy A22 5G",
      image:
        "https://images.samsung.com/is/image/samsung/p6pim/levant/sm-a226blvvmeb/gallery/levant-galaxy-a22-5g-a226-sm-a226blvvmeb-thumb-493432868?$160_160_PNG$",
      category: "Mobile",
      description:
        "Galaxy A22 5G premium features including fast charging, Super AMOLED Infinity-U display, rear camera, and more.",
    },
  ];

  //Using promise...then
  prdHelper.getProducts().then((products) => {
    // console.log(products);
    res.render("views-admin/view-products", {
      admin: true,
      title: "Admin | View Products",
      products,
    });
  });

  //Using normal callback (product-helpers:49:8)
  // prdHelper.getProducts((products) => {
  //   // console.log(products);
  //   res.render("views-admin/view-products", {
  //     admin: true,
  //     title: "Admin | View Products",
  //     products,
  //   });
  // });

  // res.render("views-admin/view-products", {
  //   admin: true,
  //   title: "View Products",
  //   products,
  // });
});

// Add product

router.get("/add-product", adminVerifyLogin, (req, res, next) => {
  res.render("views-admin/add-product", {
    admin: true,
    title: "Admin | Add Product",
  });
});

//form submit data
router.post("/add-product", (req, res, next) => {
  // console.log(req.body); //POST Method
  // res.send(JSON.stringify(req.body));

  // When we are using file type & enctype='multipart/formdata' the req.body returns null. so we need to use a module called express-fileupload
  // console.log(req.files.image); //where image is the input name
  // prdHelper.addProduct(req.body, (result) => { callback method
  prdHelper.addProduct(req.body).then((response) => {
    // console.log(Object.keys(result));
    //we should also upload the image, so it's better to save that image in a separate folder with document id
    let image = req.files.image;
    let _id = response.insertedId.toString();
    image.mv("./public/images/product-images/" + _id + ".jpg", (err) => {
      if (!err) {
        res.render("views-admin/add-product", {
          admin: true,
          title: "Admin | Add Product",
        });
      }
    });
  });
});

// Delete Product (anchor tag)
router.get("/delete-product/:id", adminVerifyLogin, (req, res) => {
  let delPrdId = req.params.id;
  console.log(delPrdId);
  prdHelper.deleteProduct(delPrdId).then((status) => {
    console.log(status);
    res.redirect("/admin/");
  });
});

//edit product (anchor tag)
router.get("/edit-product/:id", adminVerifyLogin, (req, res) => {
  let editPrdId = req.params.id;
  prdHelper.editProduct(editPrdId).then((product) => {
    console.dir(product);
    res.render("views-admin/edit-product", {
      admin: true,
      title: "Admin | Edit Product",
      product,
    });
  });
});

//update product form (form method:POST)
router.post("/edit-product/:id", (req, res) => {
  //we need to access particular id of the product to update
  let editPrdId = req.params.id;
  prdHelper.updateProduct(req.body, editPrdId).then((status) => {
    console.log(status);
    res.redirect("/admin/");
    if (req.files.image) {
      let image = req.files.image;
      image.mv("./public/images/product-images/" + editPrdId + ".jpg");
    }
  });
});

router.get("/user-orders", (req, res) => {
  //the following helper func is already used to fetch user orders. But writing a separate func here to practice more.
  prdHelper.getUserOrders().then((data) => {
    res.render("views-admin/view-user_orders", {
      admin: true,
      title: "Admin | User Orders",
      userOrders: data,
    });
  });
});

//Approve User Orders - \public\javascripts\script.js (AJAX)
router.patch("/approve-userOrder", adminVerifyLogin, (req, res) => {
  console.log(req.body.orderId);
  prdHelper.approveUserOrder(req.body.orderId).then((status) => {
    console.log(status);
    res.json(status);
  });
  // res.json({ status: true });
});
module.exports = router;

// Admin Methods
// 1. Get Products - GET (Home Page)
// 2. Add Product - GET
// 3. Add Product - POST
// 4. Delete Product
// 5. Edit Product - GET
// 6. Update Product - PATCH
// 7. Get User Orders -
// 8. Approve User Orders - (JS File -AJAX)
