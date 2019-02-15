# worker-union

Every Node.JS developer is aware of the single-threaded nature of this platform
where everything except your Javascript code runs in parallel..
But what if I tell you that it has become possible to run JS in parallel as well?

The worker_threads module has been added to node.js v10.5.0,
which allows javascript to be executed in separate threads within a single Node.JS process.
Yes, no spawn, exec, fork, cluster and other parodies on multithreading!

Worker-union allows you to take advantage of worker_threads,
while eliminating the need to manually manage messaging,
the number of threads, load balancing between them, and so on.

Just write logic, the rest will be done by promise-powered worker-union 🤓

Let’s jump into it?

## Requirements

Since module 'worker_threads' was added only in __Node.JS v10.5.0__,
you cannot use 'worker-union' in earlier versions.

Also, when you start your application, you will need to use `--experimental-worker` flag
(ex. `node --experimental-worker index.js`)

## Install

```bash
npm i -S worker-union
```

## Workerify

You can save yourself from the boilerplate at all, using the `workerify`!
Just pass on your function and get an asynchronous wrapper.
The code of the function itself will be executed in the Worker Pool.

```javascript
const workerify = require('worker-union/workerify');

const parseJSON = value => JSON.parse(value);

const asyncParseJSON = workerify(parseJSON);

asyncParseJSON('{"foo":"bar"}').then(result => result.foo); // -> bar
```

It is important to know that your function must be serializable.
You can easily verify this using `func.toString()` method. If you want to workerify the native Node.JS function,
for example _JSON.parse()_ (when you call `func.toString()` you see `[native code]`), then wrap it as in the example above.

By default, _worker-union_ will allocate for your function the number of threads
equal to the number of cores of your processor. If you want to tune the WorkerPool settings by yourself,
pass them as second argument to `workerify` function:

```javascript
const asyncFn = workerify(fn, {
  count: 4,
});
```

## Basic usage of WorkerPool

In this example, work with the worker on the __"request-response"__ principle will be demonstrated.

__Project structure:__

```
. your-project-directory
└── node_modules
└── index.js
└── worker.js
```

__index.js:__
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

__worker.js__
```javascript
const Worker = require('worker-union/worker');

new Worker((message, resolve) => resolve('pong'));
```

__Result:__
```bash
node --experimental-worker index.js
# -> pong
```

## Another WorkerPool example

And in this example it will be shown that the worker can send messages to the main thread __without requests__.

__Project structure:__

```
. your-project-directory
└── node_modules
└── index.js
└── worker.js
```

__index.js:__
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

__worker.js__
```javascript
const Worker = require('worker-union/worker');

const worker = new Worker();

setInterval(() => worker.emit('Hello!'), 1000); // send 'Hello' to main thread every second
```

__Result:__
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
