/**
 * The same chart as LossChart, under the name the Machine Learning and Neural
 * Networks pages import. It used to pad a near-flat y range before LossChart's
 * tick loop could hang on it; LossChart now widens flat ranges itself, so
 * there is nothing left to add. New pages can use either name.
 *
 *   <TrainingCurve logY series={[{ name: 'loss', color, points }]} height={130} />
 */
export { default } from './LossChart';
