import CustomerModel from "../models/CustomerModel.js";

export const createCustomer = async (req, res) => {
  const { name, phone, email, address } = req.body;
  const userId = req.user.id;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }
    if (!name) {
      return res
        .status(400)
        .json({ message: "Please enter a valid name.", success: false });
    }
    if (name.length < 3) {
      return res
        .status(400)
        .json({ message: "Please enter a valid name.", success: false });
    }
    if (phone) {
      if (!/^[6-9]\d{9}$/.test(phone)) {
        return res.status(400).json({
          message: "Please enter a valid phone number.",
          success: false,
        });
      }
    }
    if (email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({
          message: "Please enter a valid email.",
          success: false,
        });
      }
    }
    if (address) {
      if (address.length < 5) {
        return res
          .status(400)
          .json({ message: "Please enter a valid address.", success: false });
      }
    }

    const customer = await CustomerModel.findOne({ userId, name });

    if (customer) {
      return res.status(400).json({
        message: "Customer already exists. Please use an different name.",
        success: false,
      });
    }

    const newCustomer = new CustomerModel({
      name,
      phone,
      email,
      address,
      userId,
    });

    await newCustomer.save();

    return res.status(201).json({
      message: "New customer created successfully.",
      success: true,
      newCustomer,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
export const customerProfile = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.id;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }
    if (!customerId) {
      return res
        .status(400)
        .json({ message: "Invalid customer id", success: false });
    }

    const customer = await CustomerModel.findOne({ userId, _id: customerId });

    if (!customer) {
      return res.status(404).json({
        message: "Failed to find any customer.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Customer profile fetched successfully.",
      success: true,
      customer,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
export const fetchAllCustomers = async (req, res) => {
  const userId = req.user.id;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }

    const customers = await CustomerModel.find({ userId });

    return res.status(200).json({
      message: "All customers fetched successfully.",
      success: true,
      customers,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
export const updateCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { customerId } = req.params;
    const { name, phone, email, address } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized user.",
        success: false,
      });
    }

    if (!customerId) {
      return res.status(400).json({
        message: "Invalid customer ID.",
        success: false,
      });
    }

    const updates = {};

    // Name validation
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length < 3) {
        return res.status(400).json({
          message: "Name must contain at least 3 characters.",
          success: false,
        });
      }
      const existingCustomer = await CustomerModel.findOne({
        _id: { $ne: customerId },
        name: name.trim(),
        userId,
      });
      if (existingCustomer) {
        return res.status(400).json({
          message: "Customer already exist. Please any different name",
          success: false,
        });
      }

      updates.name = name.trim();
    }

    // Phone validation
    if (phone !== undefined) {
      if (
        phone !== "" &&
        (typeof phone !== "string" || !/^[6-9]\d{9}$/.test(phone.trim()))
      ) {
        return res.status(400).json({
          message: "Please enter a valid 10-digit Indian mobile number.",
          success: false,
        });
      }

      updates.phone = phone === "" ? "" : phone.trim();
    }

    // Email validation
    if (email !== undefined) {
      if (
        email !== "" &&
        (typeof email !== "string" ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      ) {
        return res.status(400).json({
          message: "Please enter a valid email address.",
          success: false,
        });
      }

      updates.email = email === "" ? "" : email.trim().toLowerCase();
    }

    // Address validation
    if (address !== undefined) {
      if (
        address !== "" &&
        (typeof address !== "string" || address.trim().length < 5)
      ) {
        return res.status(400).json({
          message: "Address must contain at least 5 characters.",
          success: false,
        });
      }

      updates.address = address === "" ? "" : address.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "Please provide at least one field to update.",
        success: false,
      });
    }

    const updatedCustomer = await CustomerModel.findOneAndUpdate(
      { _id: customerId, userId },
      { $set: updates },
      { new: true, runValidators: true },
    );

    if (!updatedCustomer) {
      return res.status(404).json({
        message: "Customer not found.",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Customer updated successfully.",
      success: true,
      updatedCustomer,
    });
  } catch (error) {
    console.error("Update customer error:", error);

    return res.status(500).json({
      message: "Internal server error.",
      success: false,
    });
  }
};
export const deleteCustomer = async (req, res) => {
  const { customerId } = req.params;
  const userId = req.user.id;
  try {
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized user", success: false });
    }
    if (!customerId) {
      return res
        .status(400)
        .json({ message: "Invalid customer id", success: false });
    }

    const deletedCustomer = await CustomerModel.findOneAndDelete({
      userId,
      _id: customerId,
    });
    if (!deletedCustomer) {
      return res.status(404).json({
        message: "Customer not found.",
        success: false,
      });
    }
    return res.status(200).json({
      message: "Customer profile deleted successfully.",
      success: true,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Internal server error.", success: false });
  }
};
