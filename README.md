# worker-union

Every Node.JS developer is aware of the single-threaded nature of this platform where everything except your Javascript code runs in parallel.. But what if I tell you that it has become possible to run JS in parallel as well?

The worker_threads module has been added to node.js v10.5.0, which allows javascript to be executed in separate threads within a single Node.JS process. Yes, no spawn, exec, fork, cluster and other parodies on multithreading!

Worker-union allows you to take advantage of worker_threads, while eliminating the need to manually manage messaging, the number of threads, load balancing between them, and so on.

Just write logic, the rest will be done by promise-powered worker-union 🤓

Let’s jump into it?

## Install

```bash
npm i -S worker-union
```

## Requirements

Since module 'worker_threads' was added only in **Node.JS v10.5.0**, you cannot use 'worker-union' in earlier versions.

Also, when you start your application, you will need to use `--experimental-worker` flag (ex. `node --experimental-worker index.js`)

## Basic usage

In this example, work with the worker on the **"request-response"** principle will be demonstrated.

**Project structure:**

```
. your-project-directory
└── node_modules
└── index.js
└── worker.js
```

**index.js:**
```javascript
const path = require('path');
const WorkerPool = require('worker-union');

const pool = new WorkerPool({
  path: path.resolve('worker.js'), // absolute path to worker source code
  count: 1,
});

pool.start();

pool.send('ping').then(response => console.log(response));
```

**worker.js**
```javascript
const Worker = require('worker-union/worker');

new Worker((message, resolve) => resolve('pong'));
```

**Result:**
```bash
node --experimental-worker index.js
# -> pong
```

## Another usage example

And in this example it will be shown that the worker can send messages to the main thread **without requests**.

**Project structure:**

```
. your-project-directory
└── node_modules
└── index.js
└── worker.js
```

**index.js:**
```javascript
const path = require('path');
const WorkerPool = require('worker-union');

const pool = new WorkerPool({
  path: path.resolve('worker.js'),
  count: 1,
  eventHandler: message => console.log(`Recieved message from worker: ${message}`),
});

pool.start();

// we doesn't send any data here
```

**worker.js**
```javascript
const Worker = require('worker-union/worker');

const worker = new Worker();

setInterval(() => worker.emit('Hello!'), 1000); // send 'Hello' to main thread every second
```

**Result:**
```bash
node --experimental-worker index.js
# -> Received message from worker: Hello!
# -> Received message from worker: Hello!
# -> Received message from worker: Hello!
# -> Received message from worker: Hello!
```

## Advanced features

A description of all the features of the library, such as automatic thread allolocation, shared-memory state etc., will be ready soon. Stay tuned!

## License

MIT.
