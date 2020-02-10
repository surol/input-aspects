/**
 * @packageDocumentation
 * @module input-aspects
 */
import { noop } from 'call-thru';
import { eventSupplyOf } from 'fun-events';
import { InControl } from '../../control';
import { InConverter, intoConvertedAspects } from '../../converter';
import { InMode } from '../../data';
import { inModeByForm } from '../../data/modes';
import { InElement } from '../../element.control';
import { InElementControl } from '../element.impl';

/**
 * Form element control.
 *
 * It is connected to control to submit (form), but is not intended for submission itself, and has no value.
 *
 * It is used to update form element state. E.g. to make it read-only when {@link InSubmit.Flags.busy submitting}
 * the form.
 *
 * Form element control can be created by [[inFormElement]] function.
 *
 * @category Control
 * @typeparam Elt  A type of HTML form element.
 */
export type InFormElement<Elt extends HTMLElement = HTMLElement> = InElement<void, Elt>;

export namespace InFormElement {

  /**
   * Form element control options.
   */
  export interface Options {

    /**
     * Submitted control. Typically a {@link InContainer container}.
     */
    readonly form: InControl<any>;

    /**
     * Additional input aspects to apply. These are aspect converters to constructed control  from the
     * {@link inValueOf same-valued one}.
     */
    readonly aspects?: InConverter.Aspect<void> | readonly InConverter.Aspect<void>[];

    /**
     * Input modes to derive from submitted control.
     *
     * Applied to form element control by [[inModeByForm]].
     */
    modes?: {

      /**
       * Input mode to set when submit is not ready. E.g. when input is invalid. `on` (enabled) by default.
       */
      readonly notReady?: InMode.Value;

      /**
       * Input mode to set when submit is not ready _and_ the form is submitted. `on` (enabled) by default.
       */
      readonly invalid?: InMode.Value;

      /**
       * Input mode to set while submitting. `ro` (read-only) by default.
       */
      readonly busy?: InMode.Value;

    };

  }

}

/**
 * Creates form element control.
 *
 * @category Control
 * @param element  HTML element to create control for.
 * @param options  Form element control options.
 *
 * @returns New form element control.
 */
export function inFormElement<Elt extends HTMLElement>(
    element: Elt,
    options: InFormElement.Options,
): InFormElement<Elt> {

  const { form, aspects, modes } = options;
  const control = new InElementControl<void, Elt>(
      element,
      {
        aspects: [intoConvertedAspects(aspects)],
        get: noop,
        set: noop,
      },
  );

  eventSupplyOf(control).needs(form);
  control.aspect(InMode).derive(inModeByForm(form, modes));

  return control;
}
