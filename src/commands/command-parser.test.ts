import { Conditions } from "./command-runner";

describe('command parser', () => {
  describe('validate prefix', () => {
    const defaultPrefix = '>';
    const customPrefixesMap = new Map([['a guild id', { prefix: '$' }]]);

    test('should be defined', () => {
      expect(Conditions._validatePrefix).toBeDefined();
    });

    test('return truthy if correct default prefix', () => {
      const message = { content: '>hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix)).toBeTruthy();
    });
    test('return truthy if correct custom prefix', () => {
      const message = { guild: { id: 'a guild id' }, content: '$hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix, customPrefixesMap)).toBeTruthy();
    });
    test('return false if wrong default prefix', () => {
      const message = { content: '!hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix)).toBeFalsy();
    });
    test('return false if wrong custom prefix', () => {
      const message = { guild: { id: 'a guild id' }, content: '-hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix, customPrefixesMap)).toBeFalsy();
    });
    test('return false if uses default prefix and has custom prefix', () => {
      const message = { guild: { id: 'a guild id' }, content: '>hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix, customPrefixesMap)).toBeFalsy();
    });
    test('return prefix if correct prefix', () => {
      const message = { guild: { id: 'a guild id' }, content: '>hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix)).toEqual('>');
    });
    test('return custom prefix if correct custom prefix', () => {
      const message = { guild: { id: 'a guild id' }, content: '$hello there' };
      expect(Conditions._validatePrefix(message as any, defaultPrefix, customPrefixesMap)).toEqual('$');
    });
  });

  // describe('split arguments', () => {
  //   test('should be defined', () => {
  //     expect(splitCommandAndArguments).toBeDefined();
  //   });

  //   test('empty string should yield empty command and args', () => {
  //     expect(splitCommandAndArguments('', '>')).toEqual({ command: '', args: [] });
  //   });

  //   test('valid string with command only should yield the command and empty args', () => {
  //     expect(splitCommandAndArguments('>simple', '>')).toEqual({ command: 'simple', args: [] });
  //   });
  //   test('valid string with command and 1 arg should yield the command and 1 arg', () => {
  //     expect(splitCommandAndArguments('>simple command', '>')).toEqual({
  //       command: 'simple',
  //       args: ['command'],
  //     });
  //   });
  //   test('valid string with command and 2 args should yield the command and 2 args', () => {
  //     expect(splitCommandAndArguments('>simple command here', '>')).toEqual({
  //       command: 'simple',
  //       args: ['command', 'here'],
  //     });
  //   });
  //   // spliArguments is used internally and only after prefix validation.
  //   test('valid string with wrong prefix should yield wrong command and 3 args', () => {
  //     expect(splitCommandAndArguments('simple command here', '>')).toEqual({
  //       command: 'imple',
  //       args: ['command', 'here'],
  //     });
  //   });
  // });
});
