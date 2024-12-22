/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function arc(x_start, y_start, x_end, y_end, x_radius, y_radius, stroke_colour, stroke_dasharray = null)
{
    return `<path d="M ${x_start} ${y_start} A ${x_radius} ${y_radius} 0 0 1 ${x_end} ${y_end}" stroke-width="1" stroke="${stroke_colour}" fill-opacity="0"${stroke_dasharray ? ' stroke-dasharray="' + stroke_dasharray + '"' : ""}/>`;
}

export function put_in_svg(width, height, elem)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elem}</svg>`;
}

export function put_in_defs(elem)
{
    return `<defs>${elem}</defs>`;
}

export function put_in_symbol(id, width, height, elem)
{
    return `<symbol id="${id}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${elem}</symbol>`;
}

export function put_in_protein_symbol(id, width, height, elem)
{
    return `<symbol id="${id}" width="${width}" height="${height}" viewBox="0 0 ${width / 2} ${height / 2}">${elem}</symbol>`;
}

export function put_in_hyperlink(href, elem)
{
    return `<a href="${href}" target="_blank">${elem}</a>`;
}

export function isovis_logo_symbol(id, width, height)
{
    return `<symbol id="${id}" width="${width}" height="${height}" viewBox="0 0 495 480">${isovis_logo()}</symbol>`;
}

export function isovis_logo()
{
    return `<line x1="12" y1="15" x2="483" y2="15" stroke="#da3b26" stroke-width="2"/><line x1="60" y1="53" x2="435" y2="53" stroke="#4ca98f" stroke-width="2"/><line x1="162" y1="88" x2="333" y2="88" stroke="#da3b26" stroke-width="2"/><line x1="212" y1="129" x2="283" y2="129" stroke="#78beab" stroke-width="2"/><line x1="190" y1="148" x2="305" y2="148" stroke="#e36c5c" stroke-width="2"/><line x1="190" y1="167" x2="305" y2="167" stroke="#78beab" stroke-width="2"/><line x1="212" y1="186" x2="283" y2="186" stroke="#e36c5c" stroke-width="2"/><line x1="227" y1="226" x2="268" y2="226" stroke="#a5d4c7" stroke-width="2"/><line x1="217" y1="247" x2="278" y2="247" stroke="#ec9d92" stroke-width="2"/><line x1="217" y1="268" x2="278" y2="268" stroke="#a5d4c7" stroke-width="2"/><line x1="227" y1="289" x2="268" y2="289" stroke="#ec9d92" stroke-width="2"/><line x1="235" y1="326.7" x2="260" y2="326.7" stroke="#d2e9e3" stroke-width="2"/><line x1="230" y1="343.3" x2="265" y2="343.3" stroke="#f5cec9" stroke-width="2"/><line x1="228" y1="360" x2="267" y2="360" stroke="#d2e9e3" stroke-width="2"/><line x1="230" y1="376.7" x2="265" y2="376.7" stroke="#f5cec9" stroke-width="2"/><line x1="235" y1="393.3" x2="260" y2="393.3" stroke="#d2e9e3" stroke-width="2"/><line x1="245" y1="428" x2="250" y2="428" stroke="#f5cec9" stroke-width="2"/><line x1="243" y1="439" x2="252" y2="439" stroke="#d2e9e3" stroke-width="2"/><line x1="245" y1="450" x2="250" y2="450" stroke="#f5cec9" stroke-width="2"/><path d="M 5 5 C 30 40 45 60 247.5 110 M 490 5 C 465 40 450 60 247.5 110 M 247.5 110 Q 365 157.5 247.5 205 M 247.5 110 Q 130 157.5 247.5 205 M 247.5 205 Q 312 257.5 247.5 310 M 247.5 205 Q 183 257.5 247.5 310 M 247.5 310 Q 285 360 247.5 410 M 247.5 310 Q 210 360 247.5 410" stroke="black" stroke-width="4" fill-opacity="0"/><line x1="205" y1="475" x2="290" y2="475" stroke="black" stroke-width="4"/><path d="M 247.5 410 Q 255 442.5 246 474 M 247.5 410 Q 240 442.5 249 474" stroke="black" stroke-width="2.5" fill-opacity="0"/>`;
}

export function use(href, x, y)
{
    return `<use href="${href}" x="${x}" y="${y}"/>`;
}

export function rect(x, y, width, height, fill)
{
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}"/>`;
}

export function rounded_rect(x, y, width, height, rx, ry, fill)
{
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
}

export function line(x1, y1, x2, y2, stroke, stroke_width)
{
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${stroke_width}"/>`;
}

export function dashed_line(x1, y1, x2, y2, stroke, stroke_width, stroke_dasharray)
{
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${stroke_width}" stroke-dasharray="${stroke_dasharray}"/>`;
}

export function polygon(points, fill, stroke, stroke_width)
{
    return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${stroke_width}"/>`;
}

export function polygon_strokeless_transparent(points, fill, fill_opacity)
{
    return `<polygon points="${points}" fill="${fill}" fill-opacity="${fill_opacity}"/>`;
}

export function text(text, x, y, font_size, font_family)
{
    return `<text x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function text_preserve_whitespace_central_baseline(text, x, y, font_size, font_family)
{
    return `<text xml:space="preserve" dominant-baseline="central" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function text_centered(text, x, y, font_size, font_family)
{
    return `<text text-anchor="middle" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function text_right_aligned(text, x, y, font_size, font_family)
{
    return `<text text-anchor="end" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function text_topped_centered(text, x, y, font_size, font_family, fill = "")
{
    return `<text xml:space="preserve" dominant-baseline="hanging" text-anchor="middle" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}"${fill ? ' fill="' + fill + '"' : ''}>${text}</text>`;
}

export function text_double_centered(text, x, y, font_size, font_family, fill)
{
    return `<text dominant-baseline="middle" text-anchor="middle" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}"${fill ? ' fill="' + fill + '"' : ''}>${text}</text>`;
}

export function text_hanging_baseline(text, x, y, font_size, font_family)
{
    return `<text dominant-baseline="hanging" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function diagonal_text(text, x, y, font_size, font_family)
{
    return `<text transform="rotate(-45 ${x} ${y})" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function tspan(text, fill)
{
    return `<tspan${fill ? ' fill="' + fill + '"' : ''}>${text}</tspan>`
}

export function heatmap_legend_text(text, x, y, font_size, font_family)
{
    return `<text dominant-baseline="middle" transform="rotate(90 ${x} ${y})" x="${x}" y="${y}" font-size="${font_size}" font-family="${font_family}">${text}</text>`;
}

export function linear_gradient(id, stops)
{
    let stop_str = "";
    for (let [offset, stop_color] of stops)
        stop_str += `<stop offset="${offset}" stop-color="${stop_color}"/>`;

    let linear_gradient_elem = `<linearGradient id="${id}">${stop_str}</linearGradient>`;
    return put_in_defs(linear_gradient_elem);
}