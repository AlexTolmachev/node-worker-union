const Worker = require('../Worker');

const worker = new Worker();

// eslint-disable-next-line no-eval
const func = eval(worker.initialData);

worker.setMessageHandler(async (args, resolve, reject) => {
  try {
    resolve(await func(...args));
  } catch (e) {
    reject(e.message);
  }
});
