/**
 * @packageDocumentation
 * @module @proc7ts/input-aspects
 */
import { noop } from '@proc7ts/call-thru';
import {
  EventReceiver,
  EventSupply,
  EventSupply__symbol,
  eventSupplyOf,
  OnEvent,
  trackValue,
  ValueTracker,
} from '@proc7ts/fun-events';
import { InAspect, InAspect__symbol } from '../../aspect';
import { inAspectSameOrBuild } from '../../aspect.impl';
import { InControl } from '../../control';
import { InElement } from '../../element.control';

/**
 * @internal
 */
const InFocus__aspect: InAspect<InFocus | null> = {

  applyTo<Value>(control: InControl<Value>): InAspect.Applied<Value, InFocus | null> {
    return inAspectSameOrBuild(control, InFocus, ctrl => {

      const element = ctrl.aspect(InElement);

      return element && new InControlFocus(element);
    });
  },

};

/**
 * Input focus aspect.
 *
 * This is a value tracker of element focus flag. Or `null` when [[InElement]] aspect is absent.
 *
 * @category Aspect
 */
export abstract class InFocus extends ValueTracker<boolean> {

  static get [InAspect__symbol](): InAspect<InFocus | null> {
    return InFocus__aspect;
  }

}

/**
 * @internal
 */
class InControlFocus extends InFocus {

  private readonly _it: ValueTracker<boolean>;

  constructor(inElement: InElement<any>) {
    super();

    const { element, events } = inElement;
    const owner: DocumentOrShadowRoot = element.getRootNode
        ? element.getRootNode() as unknown as DocumentOrShadowRoot
        : element.ownerDocument;

    this._it = trackValue(owner.activeElement === element);
    eventSupplyOf(this).needs(inElement);

    events.on('focus').to(() => this._it.it = true);
    events.on('blur').to(() => this._it.it = false);
    this.on({
      receive(ctx, newValue) {
        ctx.onRecurrent(noop);
        if (newValue) {
          element.focus();
        } else {
          element.blur();
        }
      },
    });
  }

  get [EventSupply__symbol](): EventSupply {
    return eventSupplyOf(this._it);
  }

  get it(): boolean {
    return this._it.it;
  }

  set it(value: boolean) {
    this._it.it = value;
  }

  on(): OnEvent<[boolean, boolean]>;
  on(receiver: EventReceiver<[boolean, boolean]>): EventSupply;
  on(receiver?: EventReceiver<[boolean, boolean]>): OnEvent<[boolean, boolean]> | EventSupply {
    return (this.on = this._it.on().F)(receiver);
  }

}
