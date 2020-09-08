module.exports.CustomError = (message, code = 500) => {
    const err = new Error(message);
    err.code = code;
    return err;
};
