import { InAspect, InAspect__symbol } from './in-aspect';
import { InControl } from './in-control';
import { InElement__aspect } from './in-element.aspect';

/**
 * Input element control.
 *
 * It is also available as aspect of itself and converted controls. It is not available as aspect of other controls.
 *
 * An input element control can be constructed using `inElt()` function.
 */
export abstract class InElement extends InControl {

  /**
   * The input element this control is based on.
   *
   * Note that this is not always a HTML input element. E.g. this may be an enclosing element for `InHost` control.
   * Typically this the element to apply styles to.
   */
  abstract readonly element?: any;

  static get [InAspect__symbol](): InAspect<'default', InElement | null> {
    return InElement__aspect;
  }

}
