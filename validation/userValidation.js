const Joi = require("joi");

const registerUserSchema = Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Confirm password must match password'
    }),
    refreshToken : Joi.string(),
    marketPlaceIds: Joi.array()
    .items(Joi.string().required())
    .min(1)
    .required()
});

const loginUserSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});

const validateRegisterUser = (req, res, next) => {
    const { error } = registerUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ isSuccess: false, error: error.details[0].message });
    }
    next();
};

const validateLoginUser = (req, res, next) => {
    const { error } = loginUserSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ isSuccess: false, error: error.details[0].message });
    }
    next();
};

module.exports = { validateRegisterUser, validateLoginUser };