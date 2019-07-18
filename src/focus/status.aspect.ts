import { itsEach, mapIt } from 'a-iterable';
import {
  AfterEvent,
  AfterEvent__symbol,
  afterEventFromAll,
  afterEventFromEach,
  afterEventOf,
  EventKeeper,
  trackValue,
  ValueTracker
} from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { inAspectValue } from '../aspect.impl';
import { InContainer } from '../container';
import { InControl } from '../control';
import { InElement } from '../element.control';
import { InFocus } from './focus.aspect';

const InStatus__aspect: InAspect<InStatus> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<InStatus> {
    return inAspectValue(new InControlStatus(control));
  }

};

/**
 * Aggregate status aspect of user input.
 *
 * Collects and reports input status flags. Like whether the input ever had focus or being altered.
 *
 * Supports input elements and containers. For the rest of input controls always sends default status flags.
 *
 * Implements `EventKeeper` interface by sending collected status flags to receivers.
 */
export abstract class InStatus implements EventKeeper<[InStatus.Flags]> {

  static get [InAspect__symbol](): InAspect<InStatus> {
    return InStatus__aspect;
  }

  /**
   * An `AfterEvent` registrar of status flags receivers.
   *
   * The `[AfterEvent__symbol]` property is an alias of this one.
   */
  abstract readonly read: AfterEvent<[InStatus.Flags]>;

  get [AfterEvent__symbol](): AfterEvent<[InStatus.Flags]> {
    return this.read;
  }

  /**
   * Marks the input as touched.
   *
   * @param touched Whether to mark the input as touched or not. `true` by default. When `false` the input would be
   * marked as non-edited too. Setting to `false` affects only edited flag when input has focus.
   *
   * @returns `this` aspect instance.
   */
  abstract markTouched(touched?: boolean): this;

  /**
   * Marks the input as edited by user.
   *
   * @param edited Whether to mark the input as edited by user. `true` by default, in which case the input will be
   * marked as touched as well.
   *
   * @returns `this` aspect instance.
   */
  abstract markEdited(edited?: boolean): this;

}

export namespace InStatus {

  /**
   * A flags representing aggregated input status.
   */
  export interface Flags {

    /**
     * Whether the input has focus currently.
     */
    readonly hasFocus: boolean;

    /**
     * Whether the input had focus already.
     *
     * This flag can be set using `InStatus.markTouched()`.
     */
    readonly touched: boolean;

    /**
     * Whether the input have been edited by user.
     *
     * This flag can be set using `InStatus.markEdited()`.
     */
    readonly edited: boolean;

  }

}

const defaultFlags: InStatus.Flags = {
  hasFocus: false,
  touched: false,
  edited: false,
};

class InControlStatus extends InStatus {

  private readonly _flags = trackValue<InStatus.Flags>(defaultFlags);

  get read() {
    return this._flags.read;
  }

  constructor(control: InControl<any>) {
    super();

    let flags: AfterEvent<[InStatus.Flags]>;
    const container = control.aspect(InContainer);

    if (container) {
      flags = containerFlags(container);
    } else {
      flags = elementFlags(this._flags, control);
    }

    this._flags.by(flags);
  }

  markTouched(touched = true): this {

    const flags = this._flags.it;

    if (!touched) {
      if (flags.touched) {
        // Try to reset touched.
        // Still touched if in focus. Not edited anyway.
        this._flags.it = { ...flags, touched: flags.hasFocus, edited: false };
      }
    } else if (!flags.touched) {
      // Do not modify if already touched.
      this._flags.it = { ...flags, touched };
    }

    return this;
  }

  markEdited(edited = true): this {

    const flags = this._flags.it;

    if (edited) {
      if (!flags.edited) {
        // Touched if edited
        this._flags.it = { ...flags, touched: true, edited };
      }
    } else if (flags.edited) {
      // Assume not edited
      this._flags.it = { ...flags, edited };
    }

    return this;
  }

}

function elementFlags(
    origin: ValueTracker<InStatus.Flags>,
    control: InControl<any>,
): AfterEvent<[InStatus.Flags]> {

  const element = control.aspect(InElement);
  const focus = control.aspect(InFocus);

  return afterEventFromAll({
    hasFocus: focus || afterEventOf(false),
    edited: element ? element.input.keep.thru(({ event }) => !!event) : afterEventOf(false),
  }).keep.thru(
      ({ hasFocus: [hasFocus], edited: [edited] }) => updateFlags(origin.it, hasFocus, edited),
  );
}

function updateFlags(flags: InStatus.Flags, hasFocus: boolean, edited: boolean): InStatus.Flags {
  if (hasFocus) {
    flags = { ...flags, hasFocus, touched: true };
  } else {
    flags = { ...flags, hasFocus };
  }
  if (edited) {
    flags = { ...flags, edited, touched: true };
  }
  return flags;
}

function containerFlags(container: InContainer<any>): AfterEvent<[InStatus.Flags]> {
  return container.controls.read.keep.dig_(
      snapshot => afterEventFromEach(...controlStatuses(snapshot)),
  ).keep.thru(
      combineFlags
  );
}

function controlStatuses(snapshot: InContainer.Snapshot): Iterable<InStatus> {
  return mapIt(snapshot, c => c.aspect(InStatus));
}

function combineFlags(...flags: [InStatus.Flags][]): InStatus.Flags {

  const result: { -readonly [K in keyof InStatus.Flags]: InStatus.Flags[K] } = {
    hasFocus: false,
    touched: false,
    edited: false,
  };

  itsEach(
      flags,
      (([{ hasFocus, touched, edited }]) => {
            if (touched) {
              result.touched = true;
            }
            if (hasFocus) {
              result.hasFocus = result.touched = true;
            }
            if (edited) {
              result.edited = result.touched = true;
            }
          }
      )
  );

  return result;
}
