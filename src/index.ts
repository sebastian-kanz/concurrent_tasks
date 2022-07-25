// helper function to start the next task based on the input parameter.
async function startNextTask(iterator: AsyncGenerator<string, void, unknown>) {
  return {result: await iterator.next(), iterator: iterator};
}

// Runs a [maxConcurrency] tasks in parallel. Tasks are provided as an iterator
async function* runTasks(
  maxConcurrency: number,
  taskIterator: IterableIterator<() => Promise<string>>
) {
  // Create an array of workers (working on the tasks) of the size of the concurrency. Every worker has access to all tasks.
  // Sharing the iterator ensures that a task is only run once by one worker.
  const workers: AsyncGenerator<string, void, unknown>[] = new Array(
    maxConcurrency
  );

  // Give all workers access to all tasks
  for (let i = 0; i < maxConcurrency; i++) {
    workers[i] = (async function* () {
      for (const task of taskIterator) yield await task();
    })();
  }

  // there are as many active tasks as workers. This also starts the first tasks.
  const activeTasks = new Map(
    workers.map(iterator => [iterator, startNextTask(iterator)])
  );

  // do work until no avtive task is left
  while (activeTasks.size) {
    // If any promise (active task) resolves, start a new task and yield the resolved value
    const {result, iterator} = await Promise.race(activeTasks.values());
    if (result.done) {
      // No more tasks to run
      activeTasks.delete(iterator);
    } else {
      activeTasks.set(iterator, startNextTask(iterator));
      yield result.value;
    }
  }
}

// mock function to simulate a download. Randomness simulates different file sizes to download
async function getData(url: string): Promise<string> {
  // This console.log shows, that all tasks are started in order
  console.log(`start ${url}`);
  await new Promise(cb => setTimeout(cb, 100));
  return url;
}

// mock function to simulate a download. Randomness simulates different file sizes to download
async function getDataRandom(url: string): Promise<string> {
  // This console.log shows, that all tasks are started in order
  console.log(`start ${url}`);
  const max = 100;
  const min = 10;
  const delay = Math.floor(Math.random() * (max - min)) + min;
  await new Promise(cb => setTimeout(cb, delay));
  return url;
}

async function runInParallel(
  urls: string[],
  concurrency: number
): Promise<string[]> {
  // Generate tasks to run in parallel
  const tasks: (() => Promise<string>)[] = [];
  for (const url in urls) {
    tasks.push(async () => await getData(url));
    // To simulate different durations for downloading data, comment in the following instead of the above
    // tasks.push(async () => await getDataRandom(url));
  }

  // Run tasks
  const result: string[] = [];
  for await (const value of runTasks(concurrency, tasks.values())) {
    // This console.log shows the actual order of the finished tasks
    console.log(value);
    result.push(value);
  }
  return result;
}

// Entry point
(async () => {
  const start = Date.now();
  const result = await runInParallel(
    ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    10
  );
  const duration = Date.now() - start;
  console.log(result.toString());
  console.log('Duration: ' + (duration / 1000).toString() + 's');
})();
