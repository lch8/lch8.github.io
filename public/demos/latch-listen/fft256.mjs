export const NFFT = 256;
export const WINDOW = Float64Array.from({length: NFFT}, (_, i) =>
  0.5 - 0.5 * Math.cos(2 * Math.PI * i / (NFFT - 1)));
const reverse = Uint16Array.from({length: NFFT}, (_, i) => {
  let n = i, v = 0;
  for (let k = 0; k < 8; k++, n >>= 1) v = (v << 1) | (n & 1);
  return v;
});
const cos = Float64Array.from({length: NFFT / 2}, (_, i) => Math.cos(-2 * Math.PI * i / NFFT));
const sin = Float64Array.from({length: NFFT / 2}, (_, i) => Math.sin(-2 * Math.PI * i / NFFT));

function butterflies(re, im) {
  for (let span = 2; span <= NFFT; span *= 2) {
    const half = span / 2, step = NFFT / span;
    for (let base = 0; base < NFFT; base += span) {
      for (let j = 0; j < half; j++) {
        const a = base + j, b = a + half, k = j * step;
        const u = cos[k] * re[b] - sin[k] * im[b];
        const v = sin[k] * re[b] + cos[k] * im[b];
        re[b] = re[a] - u; im[b] = im[a] - v;
        re[a] += u; im[a] += v;
      }
    }
  }
}

// Input is unpermuted. Output is the unnormalised forward DFT.
export function forward(x, offset, re, im, window = WINDOW) {
  for (let i = 0; i < NFFT; i++) {
    re[reverse[i]] = window ? x[offset+i] * window[i] : x[offset+i];
    im[reverse[i]] = 0;
  }
  butterflies(re, im);
}

// Evaluate N · Re{IFFT(X conj(H) W)} for a real input and real template.
// The conjugated product gives the inverse via the forward butterflies.
export function correlation(xr, xi, hr, hi, weights, re, im) {
  let norm = 0;
  for (let k=0; k<NFFT; k++) {
    const weight=weights[k], j=reverse[k];
    re[j]=(xr[k]*hr[k]+xi[k]*hi[k])*weight;
    im[j]=(xr[k]*hi[k]-xi[k]*hr[k])*weight;
    norm+=(hr[k]*hr[k]+hi[k]*hi[k])*weight;
  }
  butterflies(re, im);
  // Both the numerator above and the template energy here use DFT sums.
  return Math.sqrt(norm);
}
