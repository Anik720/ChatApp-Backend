const User = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SendEmail = require("../helpers/sendEmail");
const os = require("os");
const cookie = require("cookie");
const matrix = require("matrix-js-sdk");

const matrixClient = matrix.createClient({
  baseUrl: 'https://matrix.restapi.run', // Replace with your Matrix server URL
});

module.exports.register = async (req, res) => {
  try {
    const { name, nickName, email, password, phone } = req.body;

    const user = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (user) {
      if (user.email === email) {
        return res.status(400).json({
          message: "Email already exists",
          success: false,
        });
      }
      if (user.phone === phone) {
        return res.status(400).json({
          message: "Phone number already exists",
          success: false,
        });
      }
    }

    const newUser = new User({
      name,
      nickName,
      email,
      password: await bcrypt.hash(password, 10),
      phone,
    });
    const currentUser = await newUser.save();

    // const mailOption = {
    //   to: email,
    //   subject: "Account Verification",
    //   text: `<h1>Hi ${name}</h1>
    //   <p>Thank you for registering with us</p>
    //   <p>Please click on the link below to verify your account</p>
    //   <a href="http://localhost:3000/verify/${newUser._id}">Verify Account</a>
    //   <p>Regards</p>
    //   <p>Team</p>`,
    // };

    // SendEmail(mailOption).then((result) => {
    //   console.log(result);
    //   console.log(`Email sent to ${email}`)
    // })







    return res.status(200).json({
      message:
        "Registretion successfully check your email for verification link and activate your account",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};
module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email: email,
    });


    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }



    if (user.status !== "active") {
      return res.status(400).json({
        message: `User is ${user.status} please verify your email`,
        success: false,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Password is incorrect",
        success: false,
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        name: user.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "6h",
        algorithm: "HS256",
      }
    );

    res.set(
      "Set-Cookie",
      cookie.serialize("authToken", `Bearer ${token}`, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        secure: false,
        domain: "localhost",
      })
    );


    return res.status(200).json({
      message: "Login successful",
      success: true,
      token,
      user: {
        name: user.name,
        email: user.email,
        type: user.type,
      },
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};
module.exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }
    return res.status(200).json({
      message: "User found",
      success: true,
      user,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.checknickName = async (req, res) => {
  try {
    const { nickName } = req.params;

    const user = await User.findOne({
      nickName: nickName,
    });

    if (user) {
      return res.status(400).json({
        message: "User name already exists",
        success: false,
      });
    }
    return res.status(200).json({
      message: "User name available",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "we can't find a user with that email",
        success: false,
      });
    }



    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        userId: user._id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    const resetUrl = `http://localhost:3000/reset-password/${token}`;

    const message = ` 
    <h1>You have requested a password reset</h1>
    <p>Please go to this link to reset your password</p>
    <a href=${resetUrl} clicktracking=off>Reset Password</a>
    `;
    try {
      await SendEmail({
        to: user.email,
        subject: "Password reset request",
        text: message,
      });
      user.resetPasswordToken = token;
      user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
      await user.save({ validateBeforeSave: false });

      return res.status(200).json({
        message: "password reset link sent to your email",
        success: true,
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({
        message: error.message,
        success: false,
      });
    }
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.resetPassword = async (req, res) => {
  const resetPasswordToken = req.params.token;

  try {
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Link is invalid or expired",
        success: false,
      });
    }

    user.password = await bcrypt.hash(req.body.password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({
      message: "Password reset success",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.guestRegister = async (req, res) => {
  try {
    const { name, nickName } = req.body;
    const user = await User.findOne({
      nickName: nickName,
    });
    if (user) {
      return res.status(400).json({
        message: "Nick Name already exists",
        success: false,
      });
    }
    const newUser = new User({
      name: name,
      nickName,
      type: "guest",
    });
    await newUser.save();

    const token = jwt.sign(
      {
        _id: newUser._id,
        name: newUser.name,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "6h",
      }
    );
    res.set(
      "Set-Cookie",
      cookie.serialize("authToken", `Bearer ${token}`, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/",
        secure: false,
        domain: "localhost",
      })
    );

    return res.status(200).json({
      message: "Guest Login successfully",
      success: true,
      token,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.verifyUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        message: "User not found",
        success: false,
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        message: "User already verified",
        success: false,
      });
    }
    user.isEmailVerified = true;
    user.status = "active";
    await user.save();
    return res.status(200).json({
      message: "User verified successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message,
      success: false,
    });
  }
};

module.exports.logout = async (req, res) => {
  try {
    const token = req.cookies.authToken
    res.set(
      "Set-Cookie",
      cookie.serialize("authToken", token, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
        path: "/",
        secure: false,
        domain: "localhost",
      })
    );

    return res.status(200).json({
      message: "Logout successfully",
      success: true,
    });
  } catch (error) {
    return res.status(400).json({
      message: "Something went wrong",
      success: false,

    });
  }
}
