import nodeSchedule from 'node-schedule';

import { IBotClient, ITask } from '../interfaces';
import { SensumSchemaError } from '../errors';

export class Task {
  name: ITask['name'];
  time: ITask['time'];
  run: ITask['run'];
  job?: ITask['job'];

  constructor({ name, time, run }: ITask) {
    if (!name) throw new SensumSchemaError('Missing task name.');
    if (!time) throw new SensumSchemaError('You must set a task time.');
    if (!run || typeof run !== 'function')
      throw new SensumSchemaError('You must set a run function.');

    this.name = name;
    // Cron or Date
    this.time = time;
    this.run = run || (() => {});
  }

  toString() {
    return `${this.name} (${this.time})`;
  }
}

export class Schedule {
  tasks: Task[];
  bot: IBotClient;

  constructor(bot: IBotClient, tasks: Task[]) {
    if (!bot) throw new Error('Missing client in Schedule constructor.');
    if (!tasks) throw new Error('Missing tasks in Schedule constructor.');

    this.bot = bot;
    this.tasks = tasks;
    this.tasks.forEach((t) => this.create(bot, t));
  }

  create(bot: IBotClient, newTask: Task) {
    const task = newTask;

    if (!task.name) {
      bot.emit('warn', `[Schedule] Task ${task} does not have a name. Ignoring it.`);
      return;
    }
    if (!task.time) {
      bot.emit('warn', `[Schedule] Task ${task} did not specify time. Ignoring it.`);
      return;
    }

    task.job = nodeSchedule.scheduleJob(task.time, (fireDate) =>
      safelyRun(this.bot, task, fireDate),
    );
  }
}

function safelyRun(bot: IBotClient, task: Task, fireDate: Date) {
  function errorHandler(err: Error) {
    err.stack = (`An error ocurred in the ${task.name} task.\n` + err.stack).replace(
      new RegExp(`${__dirname}/`, 'g'),
      './',
    );

    bot.emit('error', err);
  }

  try {
    (task.run(bot, fireDate) as any).catch(errorHandler);
  } catch (err) {
    if (err instanceof TypeError && /catch/.test(err.message)) {
      // This error is from running .catch() on a normal function. We can ignore.
    } else {
      errorHandler((err as Error));
    }
  }
}
