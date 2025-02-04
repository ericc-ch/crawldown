# Basic usage - threads.js

Source: https://threads.js.org/usage

Basics
------

A trivial worker example to demo the two most important functions provided by threads.js: `spawn()` and `expose()`.

    // master.js
    import { spawn, Thread, Worker } from "threads"
    
    async function main() {
      const add = await spawn(new Worker("./workers/add"))
      const sum = await add(2, 3)
    
      console.log(`2 + 3 = ${sum}`)
    
      await Thread.terminate(add)
    }
    
    main().catch(console.error)
    

    // workers/add.js
    import { expose } from "threads/worker"
    
    expose(function add(a, b) {
      return a + b
    })
    

### spawn()

The return value of `add()` in the master code depends on the `add()` return value in the worker:

If the function returns a promise or an observable, then in the master code you will receive a promise or observable that proxies the one returned by the thread function.

If the function returns a primitive value, expect the master thread function to return a promise resolving to that value.

### expose()

Use `expose()` to make either a function or an object callable from the master thread.

In case of exposing an object, `spawn()` will asynchronously return an object exposing all the object’s functions, following the same rules as functions directly `expose()`\-ed.

Using workers
-------------

### Function worker

This is one of two kinds of workers. A function worker exposes a single function that can be called from the master thread.

    // master.js
    import { spawn, Thread, Worker } from "threads"
    
    const fetchGithubProfile = await spawn(new Worker("./workers/fetch-github-profile"))
    const andywer = await fetchGithubProfile("andywer")
    
    console.log(`User "andywer" has signed up on ${new Date(andywer.created_at).toLocaleString()}`)
    
    await Thread.terminate(fetchGithubProfile)
    

    // workers/fetch-github-profile.js
    import fetch from "isomorphic-fetch"
    import { expose } from "threads/worker"
    
    expose(async function fetchGithubProfile(username) {
      const response = await fetch(`https://api.github.com/users/${username}`)
      return response.json()
    })
    

### Module worker

This is the second kind of worker. A module worker exposes an object whose values are functions. Use it if you want your worker to expose more than one function.

    // master.js
    import { spawn, Thread, Worker } from "threads"
    
    const counter = await spawn(new Worker("./workers/counter"))
    await counter.increment()
    await counter.increment()
    await counter.decrement()
    
    console.log(`Counter is now at ${await counter.getCount()}`)
    
    await Thread.terminate(counter)
    

    // workers/counter.js
    import { expose } from "threads/worker"
    
    let currentCount = 0
    
    const counter = {
      getCount() {
        return currentCount
      },
      increment() {
        return ++currentCount
      },
      decrement() {
        return --currentCount
      }
    }
    
    expose(counter)
    

### Error handling

Works fully transparent - the promise in the master code’s call will be rejected with the error thrown in the worker, also yielding the worker error’s stack trace.

    // master.js
    import { spawn, Thread, Worker } from "threads"
    
    const counter = await spawn(new Worker("./workers/counter"))
    
    try {
      await counter.increment()
      await counter.increment()
      await counter.decrement()
    
      console.log(`Counter is now at ${await counter.getCount()}`)
    } catch (error) {
      console.error("Counter thread errored:", error)
    } finally {
      await Thread.terminate(counter)
    }
    

Blob workers
------------

Sometimes you need to ship master and worker code in a single file. There is an alternative way to create a worker for those situations, allowing you to inline the worker code in the master code.

The `BlobWorker` class works just like the regular `Worker` class, but instead of taking a path to a worker, the constructor takes the worker source code as a binary blob.

There is also a convenience function `BlobWorker.fromText()` that creates a new `BlobWorker`, but allows you to pass a source string instead of a binary buffer.

Here is a webpack-based example, leveraging the `raw-loader` to inline the worker code. The worker code that we load using the `raw-loader` is the content of bundles that have been created by two previous webpack runs: one worker build targetting node.js, one for web browsers.

    import { spawn, BlobWorker } from "threads"
    import MyWorkerNode from "raw-loader!../dist/worker.node/worker.js"
    import MyWorkerWeb from "raw-loader!../dist/worker.web/worker.js"
    
    const MyWorker = process.browser ? MyWorkerWeb : MyWorkerNode
    
    const worker = await spawn(BlobWorker.fromText(MyWorker))
    // Now use this worker as always
    

Bundle this module and you will obtain a stand-alone bundle that has its worker inlined. This is particularly useful for libraries using threads.js.

TypeScript
----------

### Type-safe workers

When using TypeScript you can declare the type of a `spawn()`\-ed worker:

    // master.ts
    import { spawn, Thread, Worker } from "threads"
    
    type HashFunction = (input: string) => Promise<string>
    
    const sha512 = await spawn<HashFunction>(new Worker("./workers/sha512"))
    const hashed = await sha512("abcdef")
    

It’s also easy to export the type from the worker module and use it when `spawn()`\-ing:

    // master.ts
    import { spawn, Thread, Worker } from "threads"
    import { Counter } from "./workers/counter"
    
    const counter = await spawn<Counter>(new Worker("./workers/counter"))
    console.log(`Initial counter: ${await counter.getCount()}`)
    
    await counter.increment()
    console.log(`Updated counter: ${await counter.getCount()}`)
    
    await Thread.terminate(counter)
    

    // counter.ts
    import { expose } from "threads/worker"
    
    let currentCount = 0
    
    const counter = {
      getCount() {
        return currentCount
      },
      increment() {
        return ++currentCount
      },
      decrement() {
        return --currentCount
      }
    }
    
    export type Counter = typeof counter
    
    expose(counter)
    

### TypeScript workers in node.js

You can spawn `*.ts` workers out-of-the-box without prior transpiling if [ts-node](https://github.com/TypeStrong/ts-node) is installed.

If the path passed to `new Worker()` resolves to a `*.ts` file, threads.js will check if `ts-node` is available. If so, it will create an in-memory module that wraps the actual worker module and initializes `ts-node` before running the worker code. _It is likely you will have to increase the THREADS\_WORKER\_INIT\_TIMEOUT environment variable (milliseconds, default 10000) to account for the longer ts-node startup time if you see timeouts spawning threads._

In case `ts-node` is not available, `new Worker()` will attempt to load the same file, but with a `*.js` extension. It is then in your hands to transpile the worker module before running the code.

### TypeScript workers in webpack

When building your app with webpack, the module path will automatically be replaced with the path of the worker’s resulting bundle file.

---


# Observables - threads.js

Source: https://threads.js.org/usage-observables

Basics
------

### Returning observables

You can return observables in your worker. It works fully transparent - just subscribe to the returned observable in the master code. The returned observable is based on the [`zen-observable`](https://github.com/zenparsing/zen-observable) implementation.

    // master.js
    import { spawn, Thread, Worker } from "threads"
    
    const counter = await spawn(new Worker("./workers/counter"))
    
    counter().subscribe(newCount => console.log(`Counter incremented to:`, newCount))
    

    // workers/counter.js
    import { Observable } from "observable-fns"
    import { expose } from "threads/worker"
    
    function startCounting() {
      return new Observable(observer => {
        for (let currentCount = 1; currentCount <= 10; currentCount++) {
          observer.next(currentCount)
        }
        observer.complete()
      })
    }
    
    expose(startCounting)
    

### Hot observables

Note that in contrast to the default Observable behavior, the observable returned here is “hot”. That means that if you subscribe to it twice, the second subscription will mirror the first one, yielding the same values without subscribing to the data source a second time.

It will **not** replay values from the past, in case the second subscriber subscribes after the first one has already received values.

Observable subjects
-------------------

As described earlier, we can always return observables from our workers. While observables usually isolate the code that create observable events from the surrounding code, we do provide a way to trigger updates to the observable “from the outside”.

Using `Subject` we can create objects that implement the `Observable` interface, allowing other code to `.subscribe()` to it, while also exposing `.next(value)`, `.complete()` and `.error(error)`, so we can trigger those observable updates “from outside”.

In a nutshell:

    const observable = new Observable(observer => {
      // We can call `.next()`, `.error()`, `.complete()` only here
      // as they are only exposed on the `observer`
      observer.complete()
    })
    
    const subject = new Subject()
    subject.complete()
    // We are free to call `.next()`, `.error()`, `.complete()` from anywhere now
    // Beware: With great power comes great responsibility! Don't write spaghetti code.
    

Subscribing still works the same:

    const subscriptionOne = observable.subscribe(/* ... */)
    subscriptionOne.unsubscribe()
    
    const subscriptionTwo = subject.subscribe(/* ... */)
    subscriptionTwo.unsubscribe()
    

To get a plain observable that proxies all values, errors, completion of the subject, but does not expose the `.next()`, … methods, use `Observable.from()`:

    // The returned observable will be read-only
    return Observable.from(subject)
    

Streaming results
-----------------

We can easily use observable subjects to stream results as they are computed.

    // master.js
    import { spawn, Thread, Worker } from "threads"
    
    const minmax = await spawn(new Worker("./workers/minmax"))
    
    minmax.values().subscribe(({ min, max }) => {
      console.log(`Min: ${min} | Max: ${max}`)
    })
    
    await minmax.add(2)
    await minmax.add(3)
    await minmax.add(4)
    await minmax.add(1)
    await minmax.add(5)
    await minmax.finish()
    
    await Thread.terminate(minmax)
    

    // minmax.js
    import { Observable, Subject } from "threads/observable"
    import { expose } from "threads/worker"
    
    let max = -Infinity
    let min = Infinity
    
    let subject = new Subject()
    
    const minmax = {
      finish() {
        subject.complete()
        subject = new Subject()
      },
      add(value) {
        max = Math.max(max, value)
        min = Math.min(min, value)
        subject.next({ max, min })
      },
      values() {
        return Observable.from(subject)
      }
    }
    
    expose(minmax)
    

And there we go! A simple worker that keeps track of the minimum and maximum value passed to it, yielding observable updates we can subscribe to. The updated values will be streamed as they happen.

---


# Thread pools - threads.js

Source: https://threads.js.org/usage-pool

Pool basics
-----------

A `Pool` allows you to create a set of workers and queue worker calls. The queued tasks are pulled from the queue and executed as previous tasks are finished.

Use it if you have a lot of work to offload to workers and don’t want to drown them in a pile of work at once, but run those tasks in a controlled way with limited concurrency.

    import { spawn, Pool, Worker } from "threads"
    
    const pool = Pool(() => spawn(new Worker("./workers/multiplier")), 8 /* optional size */)
    
    pool.queue(async multiplier => {
      const multiplied = await multiplier(2, 3)
      console.log(`2 * 3 = ${multiplied}`)
    })
    
    await pool.completed()
    await pool.terminate()
    

Note that `pool.queue()` will schedule a task to be run in a deferred way. It might execute straight away or it might take a while until a new worker thread becomes available.

Pool creation
-------------

    interface PoolOptions {
      concurrency?: number
      maxQueuedJobs?: number
      name?: string
      size?: number
    }
    
    function Pool(threadFactory: () => Thread, size?: number): Pool
    function Pool(threadFactory: () => Thread, options?: PoolOptions): Pool
    

The first argument passed to the `Pool()` factory must be a function that spawns a worker thread of your choice. The pool will use this function to create its workers.

The second argument is optional and can either be the number of workers to spawn as a `number` or an options object (see `PoolOptions`):

*   `options.concurrency`: number of tasks to run simultaneously per worker, defaults to one
*   `options.maxQueuedJobs`: maximum number of tasks to queue before throwing on `.queue()`, defaults to unlimited
*   `options.name`: give the pool a custom name to use in the debug log, so you can tell multiple pools apart when debugging
*   `options.size`: number of workers to spawn, defaults to the number of CPU cores

Scheduling tasks
----------------

    let pool: Pool<ThreadType>
    type TaskFunction<ThreadType, T> = (thread: ThreadType) => Promise<T> | T
    
    pool.queue<T>(task: TaskFunction<ThreadType, T>): Promise<T>
    

The promise returned by `pool.queue()` resolves or rejects when the queued task function has been run and resolved / rejected. That means _you should usually not `await` that promise straight away_ when calling `pool.queue()`, since the code after this line will then not be run until the task has been run and completed.

Whenever a pool worker finishes a job, the next pool job is de-queued (that is the function you passed to `pool.queue()`). It is called with the worker as the first argument. The job function is supposed to return a promise - when this promise resolves, the job is considered done and the next job is de-queued and dispatched to the worker.

The promise returned by `pool.completed()` will resolve once the scheduled callbacks have been executed and completed. A failing job will make the promise reject. Use `pool.settled()` if you need a promise that resolves without an error even if a task has failed.

Handling task results
---------------------

Track a pooled task via the object that the `pool.queue()` promise resolves to. You can `await pool.queue()` to obtain the job’s result. Be aware, though, that if you `await` the result directly on queueing, you will only queue another job after this one has finished. You might rather want to `pool.queue().then()` to defer handling the outcome and keep queueing tasks uninterruptedly.

    import { spawn, Pool, Worker } from "threads"
    
    const pool = Pool(() => spawn(new Worker("./workers/crytpo")))
    const task = pool.queue(crypto => crypto.encrypt("some-password"))
    
    task.then(result => {
      // do something with the result 
    })
    
    await pool.completed()
    await pool.terminate()
    

Cancelling a queued task
------------------------

You can cancel queued tasks, too. If the pool has already started to execute the task, you cannot cancel it anymore, though.

    const task = pool.queue(multiplierWorker => multiplierWorker(2, 3))
    task.cancel()
    

Pool termination
----------------

    // Terminate gracefully
    pool.terminate()
    
    // Force-terminate pool workers
    pool.terminate(true)
    

By default the pool will wait until all scheduled tasks have completed before terminating the workers. Pass `true` to force-terminate the pool immediately.

Waiting for tasks to complete
-----------------------------

The pool comes with two methods that allow `await`\-ing the completion of all tasks.

The first one is `pool.completed()`. It returns a promise that resolves once all tasks have been executed and there are no more tasks left to run. If a task fails, the promise will be rejected.

The second one is `pool.settled()`. It also returns a promise that resolves when all tasks have been executed, but it will also resolve instead of reject if a task fails. The returned promise resolves to an array of errors.

As outlined before, pool tasks provide a Promise-like `.then()` method. You can use it to await the completion of a subset of a pool’s queued tasks only.

    // (Created a pool and queued other pool tasks before…)
    
    const myTasks: QueuedTask[] = []
    
    for (let input = 0; input < 5; input++) {
      const task = pool.queue(worker => worker.work(input))
      myTasks.push(task)
    }
    
    await Promise.all(myTasks)
    console.log("All worker.work() tasks have completed. Other pool tasks might still be running.")

---


# Advanced - threads.js

Source: https://threads.js.org/usage-advanced

Transferable objects
--------------------

Use `Transfer()` to mark [transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers#Passing_data_by_transferring_ownership_\(transferable_objects\)) like ArrayBuffers to be transferred to the receiving thread. It can speed up your code a lot if you are working with big pieces of binary data.

`Transfer()` comes in two flavors:

*   `Transfer(myBuffer: Transferable)`
*   `Transfer(arrayOrObjectContainingBuffers: any, [myBuffer]: Transferable[])`

Use it when calling a thread function or returning from a thread function:

    // master.js
    import { spawn, Transfer, Worker } from "threads"
    
    const xorBuffer = await spawn(new Worker("./workers/arraybuffer-xor"))
    const resultBuffer = await xorBuffer(Transfer(testData), 127)
    

    // workers/arraybuffer-xor.js
    import { expose, Transfer } from "threads/worker"
    
    expose(function xorBuffer(buffer, value) {
      const view = new Uint8Array(buffer)
      view.forEach((byte, offset) => view.set([byte ^ value], offset))
      return Transfer(buffer)
    })
    

Without `Transfer()` the buffers would be copied on every call and every return. Using `Transfer()` their ownership is transferred to the other thread instead only, to make sure it is accessible in a thread-safe way. This is a much faster operation.

You can use transferable objects with observables, too.

    import { expose, Observable, Transfer } from "threads/worker"
    import { DataSource } from "./my-data-source"
    
    expose(function streamBuffers() {
      return new Observable(observer => {
        const datasource = new DataSource()
        datasource.on("data", arrayBuffer => observer.next(Transfer(arrayBuffer)))
        return () => datasource.close()
      })
    })
    

Task queue
----------

It is a fairly common use case to have a lot of work that needs to be done by workers, but is just too much to be run efficiently at once. You will need to schedule tasks and have them dispatched and run on workers in a controlled fashion.

Threads.js does not provide a distinct task queue implementation, but it comes with [thread pools](/usage-pool) that covers the task queue functionality and more. Create a `Pool` and `.queue()` tasks to be dispatched to workers as they finish previous tasks.

Thread events
-------------

Every spawned thread emits events during its lifetime that you can subscribe to. This can be useful for debugging.

    import { spawn, Thread, Worker } from "threads"
    
    const myThread = await spawn(new Worker("./mythread"))
    
    Thread.events(myThread).subscribe(event => console.log("Thread event:", event))
    

There is a specialized function to subscribe only to thread error events:

    Thread.errors(myThread).subscribe(error => console.log("Thread error:", error))
    

Custom message serializers
--------------------------

Usually you can only pass values between threads that can be processed by the [Structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm). That means you cannot pass functions and if you pass an instance of some class, you will on the other end receive a plain object that’s no longer an instance of that class.

You can however define and register custom serializers to provide support for passing instances of classes and other complex data that would not work out-of-the-box.

First you need to implement your serializer. Fortunately, this is pretty straight-forward.

    import { SerializerImplementation } from "threads"
    
    interface SerializedMyClass {
      __type: "$$MyClass"
      state: string
    }
    
    class MyClass {
      state: string
    
      constructor(initialState: string) {
        this.state = initialState
      }
    
      doStuff() {
        // Do fancy things
      }
    
      serialize(): SerializedMyClass {
        return {
          __type: "$$MyClass",
          state: this.state
        }
      }
    
      static deserialize(message: SerializedMyClass) {
        return new MyClass(message.state)
      }
    }
    
    const MySerializer: SerializerImplementation = {
      deserialize(message, defaultHandler) {
        if (message && message.__type === "$$MyClass") {
          return MyClass.deserialize(message as any)
        } else {
          return defaultHandler(message)
        }
      },
      serialize(thing, defaultHandler) {
        if (thing instanceof MyClass) {
          return thing.serialize()
        } else {
          return defaultHandler(thing)
        }
      }
    }
    

Finally, register your serializer in both the main thread and the worker. Register it early, before you `spawn()` or `expose()` anything.

    import { registerSerializer } from "threads"
    // also exported from the worker sub-module:
    // import { registerSerializer } from "threads/worker"
    
    registerSerializer(MySerializer)
    

You can also register multiple serializers. Just call `registerSerializer()` multiple times – make sure to register the same serializers in the worker and main thread.

The registered serializers will then be chained. The serializer that was registered at last is invoked first. If it does not know how to serialize the data, it will call its fallback handler which is the second-to-last serializer and so forth.

    import { registerSerializer } from "threads"
    
    registerSerializer(SomeSerializer)
    registerSerializer(AnotherSerializer)
    
    // threads.js will first try to use AnotherSerializer, will fall back to SomeSerializer,
    // eventually falls back to passing the data as is if no serializer can handle it
    

Debug logging
-------------

We are using the [`debug`](https://github.com/visionmedia/debug) package to provide opt-in debug logging. All the package’s debug messages have a scope starting with `threads:`, with different sub-scopes:

*   `threads:master:messages`
*   `threads:master:spawn`
*   `threads:master:thread-utils`
*   `threads:pool:${poolName || poolID}`

Set it to `DEBUG=threads:*` to enable all the library’s debug logging. To run its tests with full debug logging, for instance:

---

