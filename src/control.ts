/**
 * @module input-aspects
 */
import { noop, valueProvider } from 'call-thru';
import { EventEmitter, OnEvent, trackValue, ValueTracker } from 'fun-events';
import { InAspect, InAspect__symbol } from './aspect';

/**
 * User input control.
 *
 * Maintains input value and various aspects of the user input, such as input focus, validity, etc.
 *
 * @category Control
 * @typeparam Value  Input value type.
 */
export abstract class InControl<Value> extends ValueTracker<Value> {

  /**
   * @internal
   */
  private readonly _aspects = new Map<InAspect<any, any>, InAspect.Applied<any, any>>();

  /**
   * Input value.
   */
  abstract it: Value;

  /**
   * Retrieves an aspect instance applied to this control.
   *
   * If the given `aspect` is not applied yet, then applies it first.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   * @param aspectKey  A key of aspect to apply to this control.
   *
   * @returns An applied aspect instance.
   */
  aspect<Instance, Kind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<Instance, Kind>,
  ): InAspect.Application.Instance<Instance, Value, Kind> {
    return this._aspect(aspectKey[InAspect__symbol]).instance;
  }

  /**
   * Performs additional setup of this control.
   *
   * @param setup  A function that accepts this control as its only parameter to configure it.
   *
   * @returns `this` control instance.
   */
  setup(setup: (this: void, control: this) => void): this;

  /**
   * Performs additional setup of this control's aspect.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   * @param aspectKey  A key of aspect to set up.
   * @param setup  A function that accepts the aspect and this control as parameters to configure them.
   *
   * @returns `this` control instance.
   */
  setup<Instance, Kind extends InAspect.Application.Kind>(
      aspectKey: InAspect.Key<Instance, Kind>,
      setup?: (this: void, aspect: InAspect.Application.Instance<Instance, Value, Kind>, control: this) => void,
  ): this;

  setup<Instance, Kind extends InAspect.Application.Kind>(
      aspectKeyOrSetup: InAspect.Key<Instance, Kind> | ((this: void, control: this) => void),
      aspectSetup: (
          this: void,
          aspect: InAspect.Application.Instance<Instance, Value, Kind>,
          control: this,
      ) => void = noop,
  ): this {
    if (isAspectKey(aspectKeyOrSetup)) {
      aspectSetup(this.aspect(aspectKeyOrSetup), this);
    } else {
      aspectKeyOrSetup(this);
    }
    return this;
  }

  /**
   * Converts this control to another one with value of different type.
   *
   * The converted control's value bound to this one and wise versa.
   *
   * @typeparam To  Converted input value type.
   * @param set  Value conversion function accepting this control's value an returning converted one.
   * @param get  Reverse value conversion function accepting converted value and returning this control's one.
   *
   * @returns Converted control.
   */
  convert<To>(
      set: (this: void, value: Value) => To,
      get: (this: void, value: To) => Value,
  ): InControl<To>;

  /**
   * Converts this control to another one with value of different type potentially depending on various input aspects.
   *
   * @typeparam To  Converted input value type.
   * @param by  Input control converter.
   *
   * @returns Converted control.
   */
  convert<To>(by: InControl.Converter<Value, To>): InControl<To>;

  convert<To>(
      setOrBy: ((this: void, value: Value) => To) | InControl.Converter<Value, To>,
      get?: (this: void, value: To) => Value,
  ): InControl<To> {

    let by: InControl.Converter<Value, To>;

    if (!get) {
      by = setOrBy as InControl.Converter<Value, To>;
    } else {
      by = valueProvider({ set: setOrBy as (value: Value) => To, get });
    }

    return new InConverted(this, by);
  }

  /**
   * @internal
   */
  _aspect<Instance, Kind extends InAspect.Application.Kind>(
      aspect: InAspect<Instance, Kind>
  ): InAspect.Application.Result<Instance, Value, Kind> {

    const existing = this._aspects.get(aspect);

    if (existing) {
      return existing as InAspect.Application.Result<Instance, Value, Kind>;
    }

    const applied = this._applyAspect(aspect) || aspect.applyTo(this);

    this._aspects.set(aspect, applied);

    return applied as InAspect.Application.Result<Instance, Value, Kind>;
  }

  /**
   * Applies the given aspect to this control in a custom way.
   *
   * @typeparam Instance  Aspect instance type.
   * @typeparam Kind  Aspect application kind.
   * @param _aspect  An aspect to apply.
   *
   * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. using
   * `InAspect.applyTo()` method).
   */
  protected _applyAspect<Instance, Kind extends InAspect.Application.Kind>(
      _aspect: InAspect<Instance, Kind>
  ): InAspect.Application.Result<Instance, Value, Kind> | undefined {
    return;
  }

}

function isAspectKey<Instance, Kind extends InAspect.Application.Kind>(
    value: any,
): value is InAspect.Key<Instance, Kind> {
  return InAspect__symbol in value;
}

export namespace InControl {

  /**
   * Input control converter.
   *
   * It is a function called by `InControl.convert()` method to construct value converters.
   *
   * This function should not access converted control value as the one does not exist at calling time.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export type Converter<From, To> =
  /**
   * @param from  Original input control.
   * @param to  Converted input control.
   *
   * @returns A tuple containing value conversion function and reverse value conversion function.
   */
      (
          this: void,
          from: InControl<From>,
          to: InControl<To>,
      ) => Converters<From, To>;

  /**
   * Value converters.
   *
   * @typeparam From  Original input value type.
   * @typeparam To  Converted input value type.
   */
  export interface Converters<From, To> {

    /**
     * Applies the given aspect to converted control in a custom way.
     *
     * @typeparam Instance  Aspect instance type.
     * @typeparam Kind  Aspect application kind.
     * @param aspect  An aspect to apply.
     *
     * @returns Either applied aspect instance or `undefined` to apply the aspect in standard way (i.e. by converting
     * it from corresponding aspect of original control).
     */
    readonly applyAspect?: <Instance, Kind extends InAspect.Application.Kind>(
        this: this,
        aspect: InAspect<Instance, Kind>
    ) => InAspect.Application.Result<Instance, To, Kind> | undefined;

    /**
     * Converts original value.
     *
     * @param value  Original value to convert.
     *
     * @returns New value of converted control.
     */
    set(this: void, value: From): To;

    /**
     * Restores an original control value by converted one.
     *
     * @param value  A converted value to restore the original one by.
     *
     * @returns New value of original control.
     */
    get(this: void, value: To): From;

  }

  /**
   * A value type of the given input control type.
   *
   * @typeparam Control  Input control type.
   */
  export type ValueType<Control extends InControl<any>> = Control extends InControl<infer Value> ? Value : never;

}

class InConverted<From, To> extends InControl<To> {

  readonly on: OnEvent<[To, To]>;
  private readonly _it: ValueTracker<[To, number]>;
  protected readonly _applyAspect: <Instance, Kind extends InAspect.Application.Kind>(
      this: this,
      aspect: InAspect<Instance, Kind>
  ) => InAspect.Application.Result<Instance, To, Kind> | undefined;

  constructor(
      src: InControl<From>,
      by: InControl.Converter<From, To>,
  ) {
    super();

    let lastRev = 0;
    let backward: From | undefined;

    const on = new EventEmitter<[To, To]>();

    this.on = on.on;

    const converters = by(src, this);
    const { applyAspect } = converters;

    this._applyAspect = applyAspect
        ? function<Instance, Kind extends InAspect.Application.Kind>(
            this: InConverted<From, To>,
            aspect: InAspect<Instance, Kind>,
        ) {
          return (
              applyAspect.call(converters, aspect) || convertAspect.call(this, aspect)
          ) as InAspect.Application.Result<Instance, To, Kind> | undefined;
        }
        : convertAspect;

    this._it = trackValue([converters.set(src.it), 0]);
    this._it.on(([newValue], [oldValue]) => {
      if (newValue !== oldValue) {
        on.send(newValue, oldValue);
      }
    }).whenDone(reason => on.done(reason));
    src.on(value => {
      if (value !== backward) {
        this._it.it = [converters.set(value), ++lastRev];
      }
    }).whenDone(reason => this.done(reason));
    this._it.on(([value, rev]) => {
      if (rev !== lastRev) {
        lastRev = rev;
        backward = converters.get(value);
        try {
          src.it = backward;
        } finally {
          backward = undefined;
        }
      }
    });

    function convertAspect<Instance, Kind extends InAspect.Application.Kind>(
        this: InConverted<From, To>,
        aspect: InAspect<Instance, Kind>,
    ): InAspect.Application.Result<Instance, To, Kind> | undefined {

      const applied: InAspect.Applied<any, any> = src._aspect(aspect);

      return applied.convertTo<Instance>(this as any) as InAspect.Application.Result<Instance, To, Kind> | undefined;
    }
  }

  get it(): To {
    return this._it.it[0];
  }

  set it(value: To) {

    const [prevValue, prevRev] = this._it.it;

    if (value !== prevValue) {
      this._it.it = [value, prevRev + 1];
    }
  }

  done(reason?: any): this {
    this._it.done(reason);
    return this;
  }

}
