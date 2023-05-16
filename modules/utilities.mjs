// copies array values
export function copyArray(arr) {
    // assumes that array is rectangular
    if (Array.isArray(arr) && !Array.isArray(arr[0]))
        return arr.slice(0);
    let length = arr.length;
    let newArr = new Array(length);
    for (let i = 0; i < length; i++) {
        newArr[i] = copyArray(arr[i]);
    }
    return newArr;
}

export function getCoordinatesForCenteredSquare(widthOfFull, heightOfFull, radiusOfSquare) {
    let middleX = Math.floor(widthOfFull/2), middleY = Math.floor(heightOfFull/2);
    let sx = middleX - radiusOfSquare, ex = middleX + radiusOfSquare;
    let sy = middleY - radiusOfSquare, ey = middleY + radiusOfSquare;
    if (widthOfFull % 2 == 0) 
        ex--;
    if (heightOfFull % 2 == 0)
        ey--;
    return [sx, sy, ex, ey];
}
