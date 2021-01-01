import md5 from "md5";


export function roundTo(n, digits) {
    if (digits === undefined) {
        digits = 0;
    }

    let multiplicator = Math.pow(10, digits);
    n = parseFloat((n * multiplicator).toFixed(11));
    let test =(Math.round(n) / multiplicator);
    return +(test.toFixed(digits));
}


const _scr = "6f4c63a7-30f5-4e30-b150-53714ad8bd6d";
export function getSecureHeaderValue(url) {
    let x = url.split("://", 2)[1];

    return md5(_scr + x.slice(x.indexOf("/")));
}
