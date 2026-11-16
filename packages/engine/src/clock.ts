export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
