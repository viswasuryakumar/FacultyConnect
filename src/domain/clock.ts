import type { Clock } from './types';

let clock: Clock = () => new Date();
export const now = (): Date => new Date(clock().getTime());
export const setClock = (replacement?: Clock): void => {
  clock = replacement ?? (() => new Date());
};
