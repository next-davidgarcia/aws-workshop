
module.exports.check = async function(req) {
    try {
        req.response({ code: 200 });
    } catch (error) {
        req.error({ error });
    }
};
