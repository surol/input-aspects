/**
 * @module input-aspects
 */
import { NextArgs, nextArgs, noop } from 'call-thru';
import { AfterEvent, afterEventFromAll } from 'fun-events';
import { InAspect, InAspect__symbol } from '../aspect';
import { InControl } from '../control';
import { InMode } from './mode.aspect';

/**
 * A data aspect of the input.
 *
 * Represents input control data that will be submitted.
 *
 * Input data is typically the same as control value with respect to {@link InMode input mode}. I.e. when input mode is
 * `off` the data is `undefined`.
 *
 * An aspect interface is an `AfterEvent` registrar of input data receivers.
 *
 * @category Aspect
 * @typeparam Value  Input value type.
 */
export type InData<Value> = AfterEvent<[InData.DataType<Value>?]>;

const InData__symbol: Aspect = {

  applyTo<Value>(control: InControl<Value>): Applied<Value> {

    const instance: InData<Value> = afterEventFromAll({
      value: control,
      mode: control.aspect(InMode),
    }).keep.thru(
        ({ value: [value], mode: [mode] }) => dataByValue(value, mode),
    );

    return {
      instance,
      convertTo: noop,
    };
  }

};

function dataByValue<Value, NextReturn>(
    value: Value,
    mode: InMode.Value,
): NextArgs<[InData.DataType<Value>?], NextReturn> {
  return InMode.hasData(mode) ? nextArgs(value as InData.DataType<Value>) : nextArgs();
}

/**
 * Input data aspect.
 */
interface Aspect extends InAspect<InData<any>, 'data'> {

  applyTo<Value>(control: InControl<Value>): Applied<Value>;

}

/**
 * An input data aspect applied to control.
 */
interface Applied<Value> extends InAspect.Applied<InData<Value>, InData<any>> {

  convertTo<To>(target: InControl<To>): Applied<To> | undefined;

}

export const InData = {

  get [InAspect__symbol](): InAspect<InData<any>, 'data'> {
    return InData__symbol;
  }

};

/**
 * @category Aspect
 */
export namespace InData {

  /**
   * Input data type.
   *
   * This is either a partial value (for the object), or the value itself (for everything else).
   *
   * @typeparam Value  Input value type.
   */
  export type DataType<Value> =
      | (Value extends object ? { [K in keyof Value]?: DataType<Value[K]> } : Value)
      | undefined;

}

declare module '../aspect' {

  export namespace InAspect.Application {

    export interface Map<OfInstance, OfValue> {

      /**
       * Input data aspect application type.
       */
      data(): InData<OfValue>;

    }

  }

}