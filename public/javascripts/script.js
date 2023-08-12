//User
// const fetch = require("node-fetch");

//IIFE function to update qty btn, when it becomes 1
((func) => {
  func();
})(disableQtyBtn);

// ==================================== Admin Methods ====================================
// ==== Function to preview selected product image ====
const inputFile = document.querySelector("#inputFile");
const imgTarget = document.querySelector("#prdImgTarget");
if (inputFile) {
  inputFile.addEventListener("change", (e) => {
    imgTarget.src = URL.createObjectURL(e.target.files[0]);
  });
}

// ==== Approve User orders ====

const btnsApprove = document.querySelectorAll(
  "button[name='approve-userOrder']"
);

btnsApprove.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const {
      target: {
        dataset: { orderid: order },
      },
    } = e;

    console.log(order);

    const updateUserOrderStatus = async () => {
      const res = await fetch("/admin/approve-userOrder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order,
        }),
      });

      const data = await res.json();
      if (data.acknowledged === true) {
        window.location.href = "/admin/user-orders/";
        alert("Order Approved");
      }
    };

    const callupdateUserOrderStatus = async () => {
      await updateUserOrderStatus();
    };
    callupdateUserOrderStatus();
  });
});

// ==================================== User Methods ====================================
// Add to Cart
//=============Function to add items to cartData collection and then update the cart badge=============
const addtocartBtns = document.querySelectorAll("button.add-to-cart");

addtocartBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    // console.dir(e.target.dataset.prdid); (data-prdid)
    // Destructuring the e.target.dataset.prdid
    const {
      target: {
        dataset: { prdid: productId }, //assigning the value of prdid to productId
      },
    } = e;
    console.log(typeof productId, productId);
    //this is browser default fetch
    const resAddCart = async () => {
      try {
        //got error while passing as req.params.id, therefore changed to query
        const res = await fetch(`/user/add-to-cart?id=${productId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        //==== checks whether user logged in ====
        // console.log(res.status);
        if (res.status === 400) {
          //if user not signed in, then redirects to login page
          window.location.href = "/user/login";
        }
        //==== checks whether user logged in ====

        const data = await res.json();
        console.log(data); //updated cart count

        //If the above is success, then updating the cart badge
        const cartBadge = document.querySelector("span.badge.bg-secondary");
        if (cartBadge) {
          cartBadge.innerText = data;
        }
      } catch (err) {
        console.error(err);
      }
    };
    const callresAddCart = async () => {
      await resAddCart();
    };
    callresAddCart();
    //the fetch method isn't working, so using AJAX

    // $.ajax({
    //   url: `/add-to-cart/:${productId}`,
    //   method: "GET",
    //   timeout: 15000, // adjust the limit. currently its 15 seconds
    //   success: (response) => {
    //     console.log(response);
    //   },
    //   error: (err) => {
    //     console.log(err);
    //   },
    // });
  });
});

//btnCartQty - update cart items quantity
//=============Fetch to update the product quantity in cartData collection and then update the cart quantity in DOM=============
const btnQty = document.querySelectorAll("button#btnCartQty");

btnQty.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const {
      target: {
        dataset: { prdid: product, action: qty_action }, //assigning the values of prdid & action to diff variables
      },
    } = e;
    // OR
    // e.target.dataset.prdid
    console.log(`Product:${product} Method:${qty_action}`);
    let quantity = qty_action === "add" ? 1 : -1;

    // const updateCartQty = async () => {
    //   try {
    //     const res = await fetch(
    //       `/user/update-cart-quanyity?prdid=${product}&action=${qty_action}`,
    //       {
    //         method: "GET",
    //         headers: {
    //           "Content-Type": "application/json",
    //         },
    //       }
    //     );
    //     if (res.status === 400) {
    //       window.location.href = "/user/login";
    //     }
    //     const data = await res.json();
    //     const prdQtyInput = (e.target.parentElement.parentElement.querySelector(
    //       "input"
    //     ).value = data);
    //     // console.log(prdQtyInput);
    //   } catch (err) {
    //     console.error(err);
    //   }
    // };

    const updateCartQty = async () => {
      try {
        const res = await fetch(`/user/update-cart-quanyity`, {
          // method: "GET",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prdid: product,
            quantity: quantity,
          }),
        });
        if (res.status === 400) {
          window.location.href = "/user/login";
        }
        const data = await res.json();
        e.target.parentElement.parentElement.querySelector("input").value =
          data;
        disableQtyBtn();
        callgetTotalPrice();
        // console.log(prdQtyInput);
      } catch (err) {
        console.error(err);
      }
    };

    const callQtyMethod = async () => {
      await updateCartQty();
    };
    callQtyMethod();
  });
});

//AJAX
//=============Delete Cart Item and refreshes the page=============
const deleteCartBtn = document.querySelectorAll(
  "button[name='deleteCartItem']"
);
deleteCartBtn.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const {
      target: {
        dataset: { prdid: product },
      },
    } = e;
    // console.log(product);
    let productName = e.target.parentElement.parentElement.querySelector(
      "div.prd-details div.prd-name p"
    ).innerText;
    // console.log(productName);
    let permission = confirm(
      `Are you sure you want to remove ${productName} from cart?`
    );
    if (permission === true) {
      const removeFromCart = async () => {
        const res = await fetch(`/user/delete-cart-item/${product}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          //wee can also pass data using body
          // body: JSON.stringify({
          //   product: product,
          // }),
        });
        const data = await res.json();
        if (data.status === true) {
          window.location.href = "/user/cart";
        }
      };

      const callRemoveCart = async () => {
        await removeFromCart();
      };
      callRemoveCart();
    }
  });
});

//AJAX
//=============Function to procced payment with user address,selected payment method,totalAmount=============
const btnPayment = document.querySelector("#proceed-payment");
if (btnPayment) {
  btnPayment.addEventListener("click", (e) => {
    // alert(true);
    const {
      target: {
        dataset: { user: userId },
      },
    } = e;
    // Collecting user inputs from user
    const userAddress = document.querySelector(
      ".add-new-address #address"
    ).value;
    const userPIN = document.querySelector(".add-new-address #pin").value;
    const userPhone = document.querySelector(".add-new-address #phone").value;
    let userPaymentType = document.querySelector(
      "#payment-method input[type='radio']:checked"
    ).value;

    switch (userPaymentType) {
      case "cod":
        userPaymentType = "Pay on Delivery";
        break;
      case "credit-debit":
        userPaymentType = "Credit Card";
        break;
      case "net-banking":
        userPaymentType = "Net Banking";
        break;
      default:
        userPaymentType = "Invalid";
    }

    //convert a string to Number: parseInt,parseFloat,Number(), '11'* 1, + '11'
    const totalCartAmount =
      document.querySelector(".final-price-value #totalAmount").innerText * 1;

    if (!(userAddress === "" || userPIN === "" || userPhone === "")) {
      const orderObj = {
        userId,
        userAddress,
        userPIN,
        userPhone,
        userPaymentType,
        totalCartAmount,
      };
      //diff ways to loop through Object data/keys for...in,for...of
      // for (let data of Object.values(orderObj)) {
      //   if (data === "") {
      //     console.log(false);
      //   }
      // }
      // for (let data of Object.keys(orderObj)) {
      //   if (data === "") {
      //     console.log(false);
      //   }
      // }
      // for (let data in orderObj) {
      //   console.log(data); //prints keys/properties if the object
      //   console.log(orderObj[data]);
      // }
      console.log(orderObj);
      //fetch() to pass these data(order details) object to handle further process such as payment, order confirmation etc..
      const processOrder = async () => {
        const res = await fetch("/user/place-order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(orderObj),
        });
        const data = await res.json();
        console.log(data);
        if (data.status === true) {
          //paymentType:Pay on Delivery
          window.location.href = "/user/cod-confirmation";
        } else {
          //paymentType:Credit/Debit || NetBanking
          // window.location.href = "/user/cod-confirmation";
          console.log(data);
          razorpayHandler(data);
        }
      };
      const callprocessOrder = async () => {
        await processOrder();
      };
      callprocessOrder();
    } else {
      alert("Please Enter valid Details");
    }
  });
}

//=============Function to disable qty reduce btn, when the quantity becomes 1.=============
//This function is passed into IIFE as an argument
function disableQtyBtn() {
  const cartQtyinputs = document.querySelectorAll("input[name='cartQty']");
  cartQtyinputs.forEach((input) => {
    if (input.value === "1") {
      // btn.parentElement.querySelector(
      //   "button[name='reduceBtn']"
      // ).disabled = true;
      input.parentElement.querySelector(
        "button[name='reduceBtn']"
      ).style.visibility = "hidden";
    } else {
      // input.parentElement.querySelector(
      //   "button[name='reduceBtn']"
      // ).disabled = false;
      input.parentElement.querySelector(
        "button[name='reduceBtn']"
      ).style.visibility = "visible";
    }
  });
}

// (() => {})();

//=============Function to update the total price, when user increase or decrese the quantity=============
async function updateTotalPrice() {
  const res = await fetch(`/user/getTotalPrice`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  document.querySelector("span.price-value").innerHTML = `&#8377;${data}.00`;
  document.querySelector(
    "span.final-price-value"
  ).innerHTML = `&#8377;${data}.00`;
}

async function callgetTotalPrice() {
  await updateTotalPrice();
}
// callgetTotalPrice();

//Razorpay handler

function razorpayHandler(order) {
  //order contains order object from instance.orders.create(options, (err,order)=>{})
  //Note:amount(integer) is mandatory. The amount to be paid by the customer in currency subunits.
  //For example, if the amount is ₹100, enter 10000.
  var options = {
    key: "rzp_test_DMa7duKLfVQgLM", // Enter the Key ID generated from the Dashboard
    amount: order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
    currency: "INR",
    name: "Acme Corp",
    description: "Test Transaction",
    image: "https://example.com/your_logo",
    order_id: order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
    handler: function (response) {
      alert(response.razorpay_payment_id);
      alert(response.razorpay_order_id);
      alert(response.razorpay_signature);
      //a function to pass payment and order details to server
      verifyPayment(response, order);
    },
    prefill: {
      name: "James",
      email: "james.thk@example.com",
      contact: "9999999999",
    },
    notes: {
      address: "Razorpay Corporate Office",
    },
    theme: {
      color: "#3399cc",
    },
  };
  var rzp1 = new Razorpay(options);
  rzp1.open();
}

async function verifyPayment(response, order) {
  const res = await fetch("/user/verify-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      response,
      order,
    }),
  });

  const data = await res.json();
  // if (data.status === true) {
  console.log(data);
  if (data.acknowledged === true) {
    //order status updated successfully
    alert("Payment Successful");
    window.location.href = "/user/cod-confirmation";
  }
}
