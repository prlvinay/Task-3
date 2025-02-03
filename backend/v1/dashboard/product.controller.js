const knex = require("knex");
const knexConfig = require("./../../knexfile");
const CustomError = require("../../utils/CustomError");
const asyncErrorHandler = require("../../utils/asyncErrorHandler");
const encryptData = require("../../middlewares/encrypt");
const db = knex(knexConfig);

const deleteProduct = asyncErrorHandler(async (req, res, next) => {
  const { productId } = req.params;
  try {
    await db("products")
      .where("product_id", productId)
      .update({ status: "99" });
    console.log("Product soft deleted successfully with ID:", productId);

    await db("product_to_vendor")
      .where("product_id", productId)
      .update({ status: "99" });
    console.log("Soft Deleted vendor associations for product ID:", productId);
    res.json(
      encryptData({
        message: "Product soft deleted successfully",
      })
    );
  } catch (error) {
    console.error("Error soft deleting product:", error);
    return next(CustomError("Error deleting product", 500));
  }
});

// //product?category_naem=?&status=?&..
// const getAllProducts = asyncErrorHandler(async (req, res, next) => {
//   try {
//     const {
//       product_name,
//       category_name,
//       status,
//       page = 1,
//       limit = 10,
//     } = req.query;
//     const offset = (page - 1) * limit;

//     const productsData = db("products as p")
//       .select(
//         "p.product_id",
//         "p.product_name",
//         "p.product_image",
//         "p.status",
//         "p.created_at",
//         "p.quantity_in_stock",
//         "p.unit_price",
//         "c.category_name",
//         db.raw("GROUP_CONCAT(v.vendor_name) as vendor_name"),
//         db.raw("GROUP_CONCAT(v.vendor_id ) as vendor_id")
//       )
//       .leftJoin("categories as c", "p.category_id", "c.category_id")
//       .leftJoin("product_to_vendor as pv", "p.product_id", "pv.product_id")
//       .leftJoin("vendors as v", "pv.vendor_id", "v.vendor_id");

//     if (product_name) {
//       productsData.where("p.product_name", "like", `%${product_name}%`);
//     }
//     if (category_name) {
//       productsData.where("c.category_name", "like", `%${category_name}%`);
//     }
//     if (status) {
//       productsData.where("p.status", status);
//     } else {
//       productsData.whereIn("p.status", ["0", "1", "2"]);
//     }
//     productsData.limit(limit).offset(offset);
//     productsData.groupBy("p.product_id");
//     productsData.orderBy("c.category_name", "asc");

//     const products = await productsData;

//     //pagination logic
//     const pagginationData = db("products as p")
//       .leftJoin("categories as c", "p.category_id", "c.category_id")
//       .leftJoin("product_to_vendor as pv", "p.product_id", "pv.product_id")
//       .leftJoin("vendors as v", "pv.vendor_id", "v.vendor_id");

//     if (product_name) {
//       pagginationData.where("p.product_name", "like", `%${product_name}%`);
//     }
//     if (category_name) {
//       pagginationData.where("c.category_name", "like", `%${category_name}%`);
//     }
//     if (status) {
//       pagginationData.where("p.status", status);
//     } else {
//       pagginationData.whereIn("p.status", ["0", "1", "2"]);
//     }

//     const result = await pagginationData.count("p.product_id as count");
//     const totalCount = result[0].count;

//     const totalPage = Math.ceil(totalCount / limit);

//     return res.status(200).json(
//       encryptData({
//         data: products,
//         paggination: {
//           totalCount,
//           currentPage: parseInt(page),
//           totalPage,
//           perPage: parseInt(limit),
//         },
//       })
//     );
//   } catch (error) {
//     console.log(error, "while featching the data");
//     return next(CustomError("Internal Server error", 500));
//   }
// });

const getAllProducts1 = asyncErrorHandler(async (req, res) => {
  const { page = 1, limit = 5, search = "", filters = "{}" } = req.query;
  const parsedFilters = JSON.parse(filters);
  // const parsedFilters = filters;
  //console.log("filter", parsedFilters);
  //console.log(search);
  // let parsedFilters = filters;
  const offset = (page - 1) * limit;

  let query = db("products as p")
    .select(
      "p.product_id",
      "p.product_name",
      "p.product_image",
      "p.status as product_status",
      "p.quantity_in_stock",
      "p.unit_price",
      "p.created_at",
      "c.category_name",
      db.raw("GROUP_CONCAT(v.vendor_id) as vendor_id"),
      db.raw("GROUP_CONCAT(v.vendor_name) as vendor_names")
    )
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .leftJoin("product_to_vendor as ptv", "p.product_id", "ptv.product_id")
    .leftJoin("vendors as v", "ptv.vendor_id", "v.vendor_id")
    .whereNot("p.status", "99");

  if (search && search.trim()) {
    query = query.andWhere((builder) => {
      builder
        .orWhere("p.product_name", "like", `%${search}%`)
        .orWhere("c.category_name", "like", `%${search}%`)
        .orWhere("v.vendor_name", "like", `%${search}%`);
    });
  }
  if (parsedFilters.status) {
    query = query.andWhere("p.status", parsedFilters.status);
  }
  if (parsedFilters.vendorName) {
    query = query.andWhere("v.vendor_name", "like", `%${search}%`);
  }
  if (parsedFilters.productName) {
    query = query.andWhere("p.product_name", "like", `%${search}%`);
  }
  if (parsedFilters.categoryName) {
    query = query.andWhere("c.category_name", "like", `%${search}%`);
  }

  query = query.limit(limit).offset(offset);

  query = query.groupBy("p.product_id");
  const products = await query;

  // Total count query for pagination
  let totalCountQuery = db("products as p")
    .countDistinct("p.product_id as total")
    .leftJoin("categories as c", "p.category_id", "c.category_id")
    .leftJoin("product_to_vendor as ptv", "p.product_id", "ptv.product_id")
    .leftJoin("vendors as v", "ptv.vendor_id", "v.vendor_id")
    .whereNot("p.status", "99");

  if (search && search.trim()) {
    totalCountQuery.andWhere((builder) => {
      builder
        .orWhere("p.product_name", "like", `%${search}%`)
        .orWhere("c.category_name", "like", `%${search}%`)
        .orWhere("v.vendor_name", "like", `%${search}%`);
    });
  }
  if (parsedFilters.status) {
    totalCountQuery = totalCountQuery.andWhere(
      "p.status",
      parsedFilters.status
    );
  }

  if (parsedFilters.vendorName) {
    totalCountQuery = totalCountQuery.andWhere(
      "v.vendor_name",
      "like",
      `%${search}%`
    );
  }
  if (parsedFilters.productName) {
    totalCountQuery = totalCountQuery.andWhere(
      "p.product_name",
      "like",
      `%${search}%`
    );
  }
  if (parsedFilters.categoryName) {
    totalCountQuery = totalCountQuery.andWhere(
      "c.category_name",
      "like",
      `%${search}%`
    );
  }

  const totalCountResult = await totalCountQuery;
  const totalCount = totalCountResult[0].total;
  const totalPages = Math.ceil(totalCount / limit);
  res.json(
    encryptData({
      data: products,
      pagination: {
        totalCount,
        currentPage: page,
        totalPages,
        perPage: limit,
      },
    })
  );
});

const updateimage = asyncErrorHandler(async (req, res, next) => {
  const { id, image } = req.body;
  try {
    const res1 = await db("products")
      .where("product_id", id)
      .update({ product_image: image });
    console.log("image", res1);
    res.status(200).json(
      encryptData({
        message: "succesfully updated",
      })
    );
  } catch (err) {
    console.log(err);
    return next(CustomError("error", 400));
  }
});

//1 2 11 20 (page-1*limt)

const postproduct = asyncErrorHandler(async (req, res) => {
  const {
    productName,
    category,
    quantity,
    unit,
    status,
    productImage,
    vendor,
  } = req.body;
  console.log(req.body);

  try {
    const [productId] = await db("products").insert(
      {
        product_name: productName,
        category_id: category,
        quantity_in_stock: quantity,
        product_image: productImage,
        unit_price: unit,
        status: status,
      },
      ["product_id"]
    );
    console.log("Inserted product ID:", productId);

    const vendorData = vendor.map((vendorId) => ({
      vendor_id: vendorId,
      product_id: productId,
      status: "1",
    }));

    await db("product_to_vendor").insert(vendorData);
    console.log("Vendor associations added successfully.");

    const products = await db("products as p")
      .select(
        "p.product_id",
        "p.product_name",
        "p.status",
        "p.quantity_in_stock as quantity",
        "p.unit_price as unit",
        "c.category_name as category",
        db.raw('GROUP_CONCAT(v.vendor_name SEPARATOR ", ") as vendors')
      )
      .leftJoin("categories as c", "p.category_id", "c.category_id")
      .leftJoin("product_to_vendor as pv", "p.product_id", "pv.product_id")
      .leftJoin("vendors as v", "pv.vendor_id", "v.vendor_id")
      .where("p.status", "!=", 99)
      .groupBy("p.product_id");

    res.json(
      encryptData({
        //message: "successfull",
        data: products,
      })
    );
  } catch (error) {
    console.error("Error inserting product and vendors:", error);
  }
});
const putproduct = asyncErrorHandler(async (req, res, next) => {
  const {
    product_id,
    productName,
    status,
    quantity,
    unit,
    category_name,
    vendor,
  } = req.body;
  console.log("edit", req.body);
  // const product_id=req.user;
  // console.log(req.user);

  try {
    const edit = await db("products")
      .update({
        product_name: productName,
        quantity_in_stock: quantity,
        unit_price: unit,
        status: status,
      })
      .where({ product_id: product_id });
    console.log(edit);

    console.log("updated product ID:", product_id);
    await db("product_to_vendor").where({ product_id: product_id }).del();

    const vendorAssociations = vendor.map((vendorId) => ({
      product_id: product_id,
      vendor_id: vendorId,
      status: "1",
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await db("product_to_vendor").insert(vendorAssociations);

    console.log(
      "Vendor associations added successfully for product ID:",
      product_id
    );
    res
      .status(200)
      .json(encryptData({ message: "Product Edited Successfyully" }));
  } catch (error) {
    console.error("Error inserting product and vendors:", error);
  }
});

module.exports = {
  postproduct,
  deleteProduct,
  getAllProducts1,
  updateimage,
  putproduct,
};
