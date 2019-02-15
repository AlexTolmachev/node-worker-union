const os = require('os');
const { Worker } = require('worker_threads');
const generateRandomString = require('./utils/generateRandomString');

const cpuCoresCount = os.cpus().length;

module.exports = class WorkerPool {
  constructor({
    path,
    state = {},
    autoAllocation = false,
    minCount = 2,
    maxCount = cpuCoresCount,
    count = cpuCoresCount,
    messagesLimit = 10,
    eventHandler = () => {},
    initialData,
  }) {
    this.workerFilePath = path;
    this.initialData = initialData;

    this.autoAllocation = autoAllocation;
    this.messagesLimit = messagesLimit;
    this.defaultWorkersCount = count;
    this.minWorkersCount = minCount;
    this.maxWorkersCount = autoAllocation ? maxCount : count;

    this.workerMap = new Map();
    this.messageMap = new Map(); // messageId -> { resolve, reject }

    this.eventHandler = eventHandler;

    this.initializeState(state);
  }

  start() {
    const workerLoopLimit = this.autoAllocation ? this.minWorkersCount : this.defaultWorkersCount;

    for (let i = 0; i < workerLoopLimit; i++) {
      this.spawnWorker();
    }

    if (this.autoAllocation) setInterval(this.manageWorkersCount.bind(this), 1000);
  }

  reload() {
    for (const [workerId] of this.workerMap) {
      this.killWorker(workerId);
    }

    this.start();
  }

  initializeState(state) {
    const stateBuffer = new SharedArrayBuffer(Object.keys(state).length * 4);

    this.stateDataView = new DataView(stateBuffer);

    this.bufferAccessMap = Object.keys(state).reduce((map, key, i) => map.set(key, i), new Map());

    this.state = Object.keys(state).reduce((acc, key) => Object.defineProperty(acc, key, {
      get: () => Boolean(this.stateDataView.getUint8(this.bufferAccessMap.get(key))),
      set: value => this.stateDataView.setUint8(this.bufferAccessMap.get(key), value ? 1 : 0),
    }), {});
  }

  get currentWorkersCount() {
    return this.workerMap.size;
  }

  get overageMessageAmountPerWorker() {
    let totalMessagesCount = 0;

    for (const { messagesCount } of this.workerMap.values()) {
      totalMessagesCount += messagesCount;
    }

    return totalMessagesCount / this.currentWorkersCount;
  }

  manageWorkersCount() {
    const workers = this.currentWorkersCount;
    const messages = this.overageMessageAmountPerWorker;
    const min = this.minWorkersCount;
    const max = this.maxWorkersCount;

    if (workers === min) {
      if (messages > this.messagesLimit) {
        this.spawnWorker();
      }
    } else if (workers > min && workers < max) {
      if (messages > this.messagesLimit) {
        this.spawnWorker();

        return;
      }

      this.killWorker();
    } else if (workers === max) {
      if (messages <= this.messagesLimit) {
        this.killWorker();
      }
    }
  }

  spawnWorker() {
    if (this.currentWorkersCount >= this.maxWorkersCount) {
      console.warn('Maximum number of workers reached');

      return;
    }

    const worker = new Worker(this.workerFilePath, {
      workerData: {
        bufferAccessMap: this.bufferAccessMap,
        stateDataView: this.stateDataView,
        initialData: this.initialData,
      },
    });

    worker.on('message', this.handleMessage.bind(this));

    this.workerMap.set(worker.threadId, {
      isTerminating: false,
      messagesCount: 0,
      worker,
    });

    console.log(`Worker ${worker.threadId} spawned`);
  }

  killWorker(workerId) {
    if (this.currentWorkersCount === this.minWorkersCount) {
      console.warn('Minimum number of workers reached');

      return;
    }

    if (workerId !== undefined) {
      this.workerMap.get(workerId).worker.terminate();
      this.workerMap.delete(workerId);

      console.log(`Worker ${workerId} terminated`);

      return;
    }

    const targetWorkerId = this.getLeastLoadedWorkerId();

    this.workerMap.get(targetWorkerId).isTerminating = true;
  }

  handleMessage({
    isEvent = false,
    workerId,
    messageId,
    data,
    failed,
  }) {
    if (isEvent) {
      this.eventHandler(data);
      return;
    }

    const { resolve, reject } = this.messageMap.get(messageId);

    if (failed) reject(data);
    else resolve(data);

    const workerData = this.workerMap.get(workerId);

    workerData.messagesCount--;

    if (workerData.isTerminating && workerData.messagesCount === 0) {
      this.killWorker(workerId);
    }
  }

  getLeastLoadedWorkerId() {
    let leastCount = Infinity;
    let chosenWorkerId;

    for (const [workerId, { messagesCount, isTerminating }] of this.workerMap) {
      if (isTerminating && messagesCount === 0) {
        this.killWorker(workerId);

        continue;
      }

      if (leastCount > messagesCount) {
        leastCount = messagesCount;

        chosenWorkerId = workerId;
      }
    }

    return chosenWorkerId || this.workerMap.keys().next().value;
  }

  send(data) {
    const promiseMethods = {};

    const promise = new Promise((resolve, reject) => {
      promiseMethods.resolve = resolve;
      promiseMethods.reject = reject;
    });

    const messageId = generateRandomString();
    const workerId = this.getLeastLoadedWorkerId();

    this.messageMap.set(messageId, promiseMethods);
    const workerData = this.workerMap.get(workerId);

    workerData.worker.postMessage({ messageId, data });
    workerData.messagesCount++;

    return promise;
  }
};
