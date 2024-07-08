const express = require("express");
const { createMenu, getVendorMenus, updateMenu, deleteMenu, addCategory, addSubcategory, addItem } = require("../controllers/vendorController");
const menuRouter = express.Router();
menuRouter.post("/create", createMenu);//checked
menuRouter.get("/:vendorId/getMenu", getVendorMenus);//checked
menuRouter.put("/update/:id", updateMenu);
menuRouter.delete("/delete/:id", deleteMenu);

menuRouter.post("/:menuId/createCategory", addCategory);//checked
menuRouter.post("/:menuId/:categoryId/createSubCategory", addSubcategory);//checked
menuRouter.post("/:menuId/createItem", addItem);//checked
menuRouter.post("/:menuId/:categoryId/createItem", addItem);//checked
menuRouter.post("/:menuId/:categoryId/:subcategoryId/createItem", addItem);//checked
module.exports = menuRouter;
