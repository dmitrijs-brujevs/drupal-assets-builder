import { sharedValue } from "../shared.js";

export function openModal(element) {
  element.hidden = false;
  element.dataset.shared = sharedValue;
}
