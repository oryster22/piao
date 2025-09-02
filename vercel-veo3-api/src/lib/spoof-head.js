/**
 * Add any extra headers you want to spoof.
 * Keep minimal by default.
 */
function SpoofHead() {
  return {
    "sec-ch-ua": '"Chromium";v="114", "Not:A-Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"'
  };
}
export default SpoofHead;
