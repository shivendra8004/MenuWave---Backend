const express = require("express");
const {
    createMenu,
    getVendorMenus,
    updateMenu,
    deleteMenu,
    addCategory,
    addSubcategory,
    addItem,
    deleteCategory,
    deleteSubcategory,
    deleteVendorItem,
    updateItem,
} = require("../controllers/vendorController");
const menuRouter = express.Router();
menuRouter.post("/create", createMenu); //checked
menuRouter.get("/:vendorId/getMenu", getVendorMenus); //checked
menuRouter.put("/update/:id", updateMenu);
menuRouter.delete("/deletemenu/:id", deleteMenu); //checked

menuRouter.post("/:menuId/createCategory", addCategory); //checked
menuRouter.delete("/:menuId/deletecategory/:categoryId", deleteCategory);

menuRouter.post("/:menuId/:categoryId/createSubCategory", addSubcategory); //checked
menuRouter.delete("/:menuId/:categoryId/deletesubcategory/:subcategoryId", deleteSubcategory);

menuRouter.post("/:menuId/createItem", addItem); //checked
menuRouter.post("/:menuId/:categoryId/createItem", addItem); //checked
menuRouter.post("/:menuId/:categoryId/:subcategoryId/createItem", addItem); //checked

menuRouter.put("/updateitem/:itemId", updateItem);
menuRouter.delete("/:menuId/deleteitem/:itemId", deleteVendorItem);
menuRouter.delete("/:menuId/:categoryId/deleteitem/:itemId", deleteVendorItem);
menuRouter.delete("/:menuId/:categoryId/:subcategoryId/deleteitem/:itemId", deleteVendorItem);
module.exports = menuRouter;
