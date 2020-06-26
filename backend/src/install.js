const { install } = require('./models');

async function init() {
    try {
        const error = await install();
        const code = error === true ? 1 : 0;
        process.exit(code);
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}

init();
