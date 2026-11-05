import { deltaE, type Rgba, toOklab } from '../color';

/** A button on the page, as measured. */
export type ButtonSample = {
  /** Its fill (the first stop of a gradient), if it has one. */
  fill?: Rgba;
  text: Rgba;
  /** Px, a pill's capped at half its height. */
  radius: number;
  height: number;
  width: number;
  weight: number;
  /** It draws a box: a fill, a border or a shadow. */
  boxed: boolean;
  /** Its class or attributes say primary, CTA, submit… */
  primaryish: boolean;
  /** It matched the site adapter's primary-button selector. */
  hinted: boolean;
};

/** A filled, rounded box on the page: a card, a panel, a list. */
export type CardSample = {
  fill: Rgba;
  radius: number;
  area: number;
};

const median = (values: readonly number[]) => {
  const sorted = [...values].sort((x, y) => x - y);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const chroma = (color: Rgba) => {
  const { a, b } = toOklab(color);

  return Math.hypot(a, b);
};

/** Colors this close count as one. */
const SAME = 0.04;
/** A fill this far from the page and its cards stands out. */
const STANDS_OUT = 0.06;

type Cluster<T> = { color: Rgba; members: T[]; score: number };

const clusterBy = <T>(
  items: readonly T[],
  colorOf: (item: T) => Rgba,
  scoreOf: (item: T) => number,
): Cluster<T>[] => {
  const clusters: Cluster<T>[] = [];

  items.forEach((item) => {
    const color = colorOf(item);
    const cluster = clusters.find(
      (candidate) => deltaE(candidate.color, color) < SAME,
    );

    if (cluster) {
      cluster.members.push(item);
      cluster.score += scoreOf(item);
    } else {
      clusters.push({ color, members: [item], score: scoreOf(item) });
    }
  });

  return clusters.sort((x, y) => y.score - x.score);
};

/**
 * The page's primary button: among filled buttons whose fill stands out
 * from `grounds` (the page and its cards), the color with the most weight.
 * Each button weighs by its fill's chroma, its size, a primary-sounding
 * class, and above all the site adapter's selector. A neutral winner
 * (Aave's black) is as good as a colored one.
 */
export const pickAccent = (
  buttons: readonly ButtonSample[],
  grounds: readonly Rgba[],
): { fill: Rgba; count: number } | undefined => {
  const filled = buttons.filter(
    (button): button is ButtonSample & { fill: Rgba } =>
      !!button.fill &&
      button.fill.a > 0.5 &&
      grounds.every((ground) => deltaE(button.fill!, ground) > STANDS_OUT),
  );

  const [best] = clusterBy(
    filled,
    (button) => button.fill,
    (button) =>
      1 +
      chroma(button.fill) * 4 +
      (button.primaryish ? 3 : 0) +
      (button.hinted ? 20 : 0) +
      Math.min(2, (button.width * button.height) / 5000),
  );

  return best && { fill: best.color, count: best.members.length };
};

/**
 * The buttons painted in `color`: how the page writes on its accent (the
 * first one's text and weight), whichever source named the accent. A design
 * system's primary often comes without a matching text variable.
 */
export const paintedIn = (
  buttons: readonly ButtonSample[],
  color: Rgba,
): { text: Rgba; weight: number; count: number } | undefined => {
  const painted = buttons.filter(
    (button) =>
      !!button.fill && button.fill.a > 0.5 && deltaE(button.fill, color) < SAME,
  );

  const [first] = painted;

  return (
    first && { text: first.text, weight: first.weight, count: painted.length }
  );
};

/** Icon buttons and links don't say how the page shapes its buttons. */
const isControl = (button: ButtonSample) =>
  button.boxed &&
  button.height >= 28 &&
  button.height <= 64 &&
  button.width >= 48;

/** How the page shapes its buttons: their median corner radius (999 for pills). */
export const controlShape = (
  buttons: readonly ButtonSample[],
): { radius: number; count: number } | undefined => {
  const controls = buttons.filter(isControl);

  if (!controls.length) {
    return undefined;
  }

  const pills = controls.filter(
    (button) => button.radius >= button.height / 2 - 1,
  );

  const radius =
    pills.length > controls.length / 2
      ? 999
      : median(controls.map((button) => button.radius));

  return { radius, count: controls.length };
};

/**
 * The page's cards: the fill covering the most area among filled, rounded
 * boxes that differ from the page, and their median corner radius.
 */
export const cardSurface = (
  cards: readonly CardSample[],
  page: Rgba,
): { fill: Rgba; radius: number; count: number } | undefined => {
  const raised = cards.filter(
    (card) =>
      card.fill.a > 0.9 && card.radius > 0 && deltaE(card.fill, page) > 0.008,
  );

  const [best] = clusterBy(
    raised,
    (card) => card.fill,
    (card) => card.area,
  );

  if (!best) {
    return undefined;
  }

  return {
    fill: best.color,
    radius: median(best.members.map((card) => card.radius)),
    count: best.members.length,
  };
};
