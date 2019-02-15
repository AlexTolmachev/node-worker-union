const workerThreads = require('worker_threads');

if (!workerThreads.isMainThread) {
  const {
    workerData: {
      bufferAccessMap,
      stateDataView,
      initialData,
    },
    parentPort,
    threadId: workerId,
  } = workerThreads;

  module.exports = class Worker {
    constructor(handler) {
      this.initialData = initialData;

      this.state = new Proxy({}, {
        get: (target, key) => Boolean(stateDataView.getUint8(bufferAccessMap.get(key))),
        set: (target, key, value) => stateDataView.setUint8(bufferAccessMap.get(key), value ? 1 : 0),
      });

      if (handler !== undefined) {
        this.setMessageHandler(handler);
      }
    }

    emit(data) {
      parentPort.postMessage({
        isEvent: true,
        workerId,
        data,
      });
    }

    setMessageHandler(fn) {
      parentPort.on('message', async ({ messageId, data }) => {
        const resolve = response => parentPort.postMessage({
          failed: false,
          data: response,
          messageId,
          workerId,
        });

        const reject = error => parentPort.postMessage({
          failed: true,
          data: error,
          messageId,
          workerId,
        });

        try {
          await fn(data, resolve, reject);
        } catch (e) {
          reject(e.message);
        }
      });
    }
  };
} else {
  throw new Error('This module should only be used in your worker file. You cannot use it in the main thread.');
}
