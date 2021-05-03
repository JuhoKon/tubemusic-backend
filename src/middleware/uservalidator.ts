const { body, validationResult } = require("express-validator");
const userValidationRules = () => {
  return [
    // username must be an email
    body("name", "Name has to be longer than 3 characters.").isLength({
      min: 3,
    }),
    body("name", "Name can't have whitespaces in it.").custom(
      (value: any) => !/\s/.test(value)
    ),
    body("email", "Invalid email address.").isEmail(),
    // password must be at least 5 chars long
    body("password", "Password needs to be 8 characters long.").isLength({
      min: 8,
    }),
    body("role").isLength({ min: 2 }),
  ];
};

const uservalidate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors: any = [];
  errors
    .array()
    .map((err: any) => extractedErrors.push({ [err.param]: err.msg }));
  return res.status(422).json({
    error: extractedErrors,
  });
};

export { userValidationRules, uservalidate };
