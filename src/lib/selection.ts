import type { Food } from './foods';

// Hands a picked food from the search list to the amount sheet without serializing it into the URL.
let picked: Food | null = null;

export function setPickedFood(f: Food): void {
  picked = f;
}

export function getPickedFood(): Food | null {
  return picked;
}
