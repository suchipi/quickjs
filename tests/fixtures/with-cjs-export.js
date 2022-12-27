export const four = 4;
export const five = 5;

export default function nine() {
  return four + five;
}

export const __cjsExports = Object.assign(() => nine(), {
  four,
  five,
});
