import { SensumSchemaError } from '../errors';
import { IBotClient, IBotEvents } from '../interfaces';

export class EventHandler<K extends keyof IBotEvents> {
  name: string;
  run: SensumEventHandler<K>;
  enabled?: boolean = true;

  constructor({
    name,
    run,
    enabled = true,
  }: {
    name: K;
    run: SensumEventHandler<K>;
    enabled: boolean;
  }) {
    if (!name) throw new SensumSchemaError('Missing event name.');
    if (!run || typeof run !== 'function')
      throw new SensumSchemaError('You must set a run function.');

    this.name = name;
    this.run = run;
    this.enabled = enabled;
  }

  toggle() {
    this.enabled = !this.enabled;
  }
}

export type SensumEventHandler<K extends keyof IBotEvents> = (
  bot: IBotClient,
  ...args: IBotEvents[K]
) => void;

export const wrapEventHandler =
  (bot: IBotClient, handler: any) =>
  (...args: any[]) => {
    if (handler.enabled) {
      handler.run(bot, ...args);
    }
  };
