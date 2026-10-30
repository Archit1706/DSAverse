# Digit CNN

The small convolutional network behind DSAverse's "A CNN Reads a Digit" page,
run in the browser with `lib/ml/digitCnn.js`.

| File | Contents |
|---|---|
| `model.json` | Layout, input normalisation, tensor offsets and test accuracy |
| `weights.bin` | float16 tensors in PyTorch layout (`[out, in, kh, kw]` and `[out, in]`) |
| `samples.json` | 40 MNIST test digits (uint8, 28×28) with their labels |

**Model.** 28×28 → conv 3×3 (8 channels) → ReLU → max-pool 2 → conv 3×3
(16 channels) → ReLU → max-pool 2 → dense 32 → ReLU → dense 10. 26,698
parameters, small enough to draw every feature map. 99.0% accuracy on the
MNIST test set. Trained on the 60,000 MNIST training digits with small random
rotations, shifts and zooms, because digits drawn with a mouse are less tidy
than MNIST's.

**How it was made.** Dev-only:

```bash
python scripts/ml/train_digit_cnn.py
```

`scripts/ml/fixtures/digit-cnn-reference.json` holds PyTorch logits for the
parity test; the JS forward pass matches them to 5e-7.

**Data and licence.** The MNIST database of handwritten digits is by Yann
LeCun, Corinna Cortes and Christopher J. C. Burges, and is available under the
Creative Commons Attribution-Share Alike 3.0 licence
(https://creativecommons.org/licenses/by-sa/3.0/). `samples.json` contains 40
digits from its test set and is distributed under that same licence. The
weights were trained on MNIST.
