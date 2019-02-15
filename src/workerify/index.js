const path = require('path');
const WorkerPool = require('../WorkerPool');

const workerPath = path.join(__dirname, 'worker.js');

/* eslint-disable no-param-reassign */
module.exports = (func, options = {}) => {
  delete options.initialData;
  delete options.path;

  const pool = new WorkerPool({
    initialData: func.toString(),
    path: workerPath,
    ...options,
  });

  pool.start();

  return (...args) => pool.send(args);
};
