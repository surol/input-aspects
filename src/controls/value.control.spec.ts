import { EventSupply } from 'fun-events';
import { InControl } from '../control';
import { inValue } from './value.control';
import Mock = jest.Mock;

describe('InValue', () => {

  let control: InControl<string>;

  beforeEach(() => {
    control = inValue('old');
  });

  describe('it', () => {
    it('has initial value', () => {
      expect(control.it).toBe('old');
    });
    it('updates value', () => {
      control.it = 'new';
      expect(control.it).toBe('new');
    });
  });

  describe('read', () => {

    let receiver: Mock;
    let supply: EventSupply;

    beforeEach(() => {
      receiver = jest.fn();
      supply = control.read(receiver);
    });

    it('sends current value', () => {
      expect(receiver).toHaveBeenCalledWith('old');
    });
    it('sends updated value', () => {
      control.it = 'new';
      expect(receiver).toHaveBeenCalledWith('new');
    });
    it('receives nothing when done', () => {

      const done = jest.fn();

      supply.whenOff(done);

      control.done('reason');
      expect(done).toHaveBeenCalledWith('reason');
      expect(supply.isOff).toBe(true);
    });
  });

  describe('on', () => {

    let receiver: Mock;
    let supply: EventSupply;

    beforeEach(() => {
      receiver = jest.fn();
      supply = control.on(receiver);
    });

    it('sends value update', () => {
      control.it = 'new';
      expect(receiver).toHaveBeenCalledWith('new', 'old');
      control.it = 'third';
      expect(receiver).toHaveBeenCalledWith('third', 'new');
    });
    it('receives nothing when done', () => {

      const done = jest.fn();

      supply.whenOff(done);

      control.done('reason');
      expect(done).toHaveBeenCalledWith('reason');
      expect(supply.isOff).toBe(true);
    });
  });
});