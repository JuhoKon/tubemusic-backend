import User from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

require("dotenv").config();
const jwtSecret = process.env.JWTSECRET || "asd123";

export const auth = function (req: any, res: any, next: any) {
  const { email, password } = req.body;

  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ msg: "Please enter all fields" });
  }

  User.findOne({ email }).then((user: any) => {
    if (!user) {
      return res.status(400).json({ msg: "User doesn't exist" });
    }
    // password validation
    bcrypt.compare(password, user.password).then((isCorrect: any) => {
      if (!isCorrect)
        return res.status(400).json({ msg: "Invalid credentials" });
      // signing jwt
      jwt.sign(
        { id: user.id, role: user.role },
        jwtSecret,
        // get secret from config-file
        { expiresIn: "2h" }, // set to expire in 15mins
        (err, token) => {
          if (err) throw err;
          res.json({
            // respond with token and and user info
            token,
            user: {
              _id: user.id,
              name: user.name,
              email: user.email,
              age: user.age,
              role: user.role,
            },
          });
        }
      );
    });
  });
};
export const findUser = function (req: any, res: any, next: any) {
  // console.log(req.user);
  User.findById(req.user.id)
    .select("-password") // return everything but password
    .then((user) => res.json(user));
};
export const renew = function (req: any, res: any, next: any) {
  User.findById(req.user.id)
    .select("-password") // return everything but password
    .then((user: any) => {
      jwt.sign(
        { id: user.id, role: user.role },
        jwtSecret,
        // get secret from config-file
        { expiresIn: "240h" }, // set to expire in 10 days
        (err, token) => {
          if (err) throw err;
          res.json({
            // respond with token and and user info
            token,
            user: {
              _id: user.id,
              name: user.name,
              email: user.email,
              age: user.age,
              role: user.role,
            },
          });
        }
      );
    });
};
