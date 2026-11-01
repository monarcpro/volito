function frame(t, $) {
  var p = $.data, W = $.W, H = $.H;
  var amount = $.clamp(Number(p.amount)), vig = $.clamp(Number(p.vignette));
  var freq = { fine: 0.95, medium: 0.7, coarse: 0.45 }[p.size] || 0.7;
  var s = "";
  if (amount > 0) {
    // Grey noise, pushed light and dark around the middle, at a low opacity: specks lighter and darker than the
    // picture under them. A new seed on every film frame (24 a second) moves it the way film stock does.
    var seed = Math.floor($.step(t, 24) * 24) % 997;
    var id = $.uid();
    $.def('<filter id="' + id + '" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="' + f2(freq / Math.max(1, $.k)) + '" numOctaves="2" seed="' + seed + '" result="n"/><feColorMatrix in="n" type="matrix" values="2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  2.4 0 0 0 -0.7  0 0 0 0 ' + f2(amount * 0.42) + '"/></filter>');
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" filter="url(#' + id + ')"/>';
  }
  if (vig > 0) {
    var g = $.uid();
    $.def('<radialGradient id="' + g + '" cx="50%" cy="50%" r="72%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="' + f2(vig * 0.85) + '"/></radialGradient>');
    s += '<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#' + g + ')"/>';
  }
  return s;
}
