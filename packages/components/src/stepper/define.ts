import { define } from '@kerno/core';
import { KStepper, KStepperStep } from './stepper.js';

define('k-stepper', KStepper);
define('k-stepper-step', KStepperStep);

declare global {
  interface HTMLElementTagNameMap {
    'k-stepper': KStepper;
    'k-stepper-step': KStepperStep;
  }
}
