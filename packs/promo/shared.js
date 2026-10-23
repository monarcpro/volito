// Promo pieces: offers, prices, codes and calls to action, in the brand's surface (bold styles get ink
// outlines and hard shadows).
/** True when the brand draws ink outlines and hard shadows. */
function boldSurface($) { return $.style.surface === "bold"; }
/** A filled shape path with the brand's outline and hard shadow when it has them. */
function shapeFill($, d, fill) {
  const k = $.k;
  if (!boldSurface($)) return $.path(d, { fill: fill, shadow: "md" });
  return '<g transform="translate(' + 8 * k + " " + 8 * k + ')">' + $.path(d, { fill: $.c.ink }) + "</g>" + $.path(d, { fill: fill, stroke: $.c.ink, sw: 4 * k });
}
/** Money: "$1,299" or "1,299 €" (currency after when it is a word or ends with a space). */
function money(cur, n, dec) {
  const v = Number(n).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return /^[A-Za-z]{2,}$/.test(cur) ? v + " " + cur : cur + v;
}
