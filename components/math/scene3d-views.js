/* Camera directions for the snap-view buttons, in maths coordinates (z up).
   Top and Front are nudged off the exact axis: looking straight down the up
   axis leaves the orbit controls with no defined "right", and they spin. */
export const VIEW_DIRECTIONS = {
    iso: [6, -7, 5],
    top: [0, -0.001, 1],
    front: [0, -1, 0.001],
    side: [1, 0, 0.001],
};

export const VIEW_LABELS = { iso: 'Iso', top: 'Top', front: 'Front', side: 'Side' };
