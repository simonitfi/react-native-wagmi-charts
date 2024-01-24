/**
 * @worklet
 */

export function precalculate(x: number[], y: number[]) {
    const n = x.length;
    const m = new Array(n);
    const slope = new Array(n - 1);
    const diff = new Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
        diff[i] = x[i + 1] - x[i];
        slope[i] = (y[i + 1] - y[i]) / diff[i];
    }
    m[0] = slope[0];
    m[1] = (slope[0] + slope[1]) / 2;
    for (let i = 2; i < n; i++) {
        const w1 = Math.abs(slope[i - 2] - slope[i - 1]);
        const w2 = i < n - 1 ? Math.abs(slope[i - 1] - slope[i]) : 0;
        if (w1 + w2 === 0) {
            m[i] = (slope[i - 1] + slope[i]) / 2;
        } else {
            m[i] = (w2 * slope[i - 2] + w1 * slope[i]) / (w1 + w2);
        }
    }
    m[n - 1] = slope[n - 2]; // Set the last slope to be the same as the second last
    return { m, slope, diff };
}

export function akimaCubicInterpolation(x: number[], y: number[], xI: number | number[], precalculated: { m: number[]; slope: number[]; diff: number[]; }) {
    'worklet'
    const binarySearch = (arr: number[], target: number) => {
        let left = 0;
        let right = arr.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (arr[mid] === target) {
                return mid;
            } else if (arr[mid] < target) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }
        return right;
    };
    const { m, diff } = precalculated;
    const n = x.length;
    // If xI is a single number, convert it to an array
    if (!Array.isArray(xI)) {
        xI = [xI];
    }
    const yI = new Array(xI.length);
    for (let i = 0; i < xI.length; i++) {
        let j = binarySearch(x, xI[i]);
        if (j === n - 1) {
            yI[i] = y[n - 1];
        } else {
            const t = (xI[i] - x[j]) / diff[j];
            if (
                (y[j + 1] > y[j] && y[j] < y[j - 1]) ||
                (y[j + 1] < y[j] && y[j] > y[j - 1])
            ) {
                // Use linear interpolation when y is decreasing then increasing or vice versa
                yI[i] = y[j] + t * (y[j + 1] - y[j]);
            } else {
                const h00 = 2 * t * t * t - 3 * t * t + 1;
                const h10 = t * t * t - 2 * t * t + t;
                const h01 = -2 * t * t * t + 3 * t * t;
                const h11 = t * t * t - t * t;
                yI[i] =
                    h00 * y[j] +
                    h10 * m[j] * diff[j] +
                    h01 * y[j + 1] +
                    h11 * m[j + 1] * diff[j];
            }
        }
    }
    // If xI was originally a single number, return a single number
    if (yI.length === 1) {
        return yI[0];
    }
    return yI;
}