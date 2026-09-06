'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Draws the charts — the bars on the dashboard and the
// lines on the analytics screen — as shapes written directly into the page.
//
// WHY NOTHING IS DOWNLOADED TO DO THIS: a charting library is a few hundred
// kilobytes to draw a dozen rectangles, and the customer website deliberately
// pulls in no such thing. Drawn this way the charts appear instantly, stay sharp
// on any screen, take their colours from the same stylesheet as everything else,
// and there is no third-party package to keep up to date. The whole file is
// shorter than the library's documentation.
//
// THREE RULES THESE CHARTS FOLLOW, AND WHY:
//
//   1. ONE SCALE PER CHART. Never two different measures sharing a picture with
//      a scale up each side. Revenue and booking counts are different things and
//      putting them on one pair of axes invites a comparison that means nothing —
//      the two lines cross wherever the scales happen to make them cross. So
//      money and counts get separate charts, every time.
//
//   2. EVERY CHART CAN BE READ AS A TABLE. A picture of a trend is nothing at
//      all to somebody using a screen reader, and it is the wrong shape for
//      anybody who wants to copy three figures into an email. Same numbers, two
//      ways round, one button.
//
//   3. HOVER IS PART OF THE CHART, NOT AN EXTRA. A chart that cannot tell you
//      what a bar is worth makes you estimate it against a gridline. The hover
//      targets are full-height strips, so a short bar in a quiet week is as easy
//      to point at as a tall one.
//
// The colours come from --chart-1/2/3 in app/globals.css, which were checked
// with a validator rather than picked by eye. The note there explains what was
// checked and how to re-run it.

import React, { useEffect, useRef, useState } from 'react';
import { Icon, Text } from '@/components/ui';
import styles from './chart.module.css';

// ---- MEASURING THE SPACE ----
// The chart has to know its own width in real pixels before it can work out
// where anything goes. Letting the SVG stretch instead would scale the text
// along with the picture, so the labels on a wide card would come out larger
// than the labels on a narrow one.
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
}

// Rounds an axis maximum up to something a person would choose — 250 rather
// than 237 — so the gridlines land on numbers worth reading.
//
// WHOLE NUMBERS GET WHOLE GRIDLINES. A chart counting bookings was drawing its
// lines at 3.75 and 11.25, because a nice-looking maximum of 15 divided by four
// gridlines is not itself a whole number. There is no such thing as three
// quarters of a booking, and a reader checking a bar against a fractional line
// has to do sums to get back to a number that means something. So for counts the
// maximum is nudged up to something that divides cleanly.
function niceMax(value: number, wholeNumbers = false): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10];
  let max = 10 * magnitude;
  for (const step of steps) {
    if (value <= step * magnitude) {
      max = step * magnitude;
      break;
    }
  }

  // Round up until every gridline lands on a whole number.
  if (wholeNumbers) {
    max = Math.max(GRID_LINES, Math.ceil(max / GRID_LINES) * GRID_LINES);
  }

  return max;
}

export type Point = { label: string; value: number };

const PAD = { top: 12, right: 8, bottom: 26, left: 52 };
const HEIGHT = 220;
const GRID_LINES = 4;

// ==================================================================
// THE FRAME
// The title, the show-as-table switch, and whichever of the two is
// currently showing.
// ==================================================================
export function ChartFrame({
  title,
  subtitle,
  valueColumn,
  points,
  format,
  children,
}: {
  title: string;
  subtitle?: string;
  // The heading over the numbers in the table view.
  valueColumn: string;
  points: Point[];
  format: (value: number) => string;
  children: React.ReactNode;
}) {
  const [asTable, setAsTable] = useState(false);

  return (
    <figure className={styles.frame}>
      <figcaption className={styles.frameHead}>
        <div className={styles.frameTitle}>
          {/* One series per chart, so the title names it and there is no legend
              to read. A legend for a single line is a box explaining that the
              blue line is the blue line. */}
          <Text variant="h3" as="h3">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="small" tone="ink3" as="p" raw>
              {subtitle}
            </Text>
          ) : null}
        </div>

        <button
          type="button"
          className={styles.tableToggle}
          onClick={() => setAsTable((current) => !current)}
          aria-pressed={asTable}
        >
          <Icon name={asTable ? 'bar-chart-outline' : 'list-outline'} size={14} />
          {asTable ? 'Show chart' : 'Show as table'}
        </button>
      </figcaption>

      {asTable ? (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Period</th>
              <th>{valueColumn}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.label}>
                <td>{point.label}</td>
                <td>{format(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        children
      )}
    </figure>
  );
}

// ==================================================================
// BARS
// For counts over a period — how many bookings in each of the last
// twelve weeks.
// ==================================================================
export function BarChart({
  points,
  color = 'var(--chart-2)',
  format = (v: number) => v.toLocaleString(),
  // An extra line in the tooltip, for context that is worth having but must not
  // become a second axis — the money behind a week's booking count.
  secondary,
}: {
  points: Point[];
  color?: string;
  format?: (value: number) => string;
  secondary?: (index: number) => { label: string; value: string } | undefined;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  // Bars in this panel always count something — bookings, new accounts — so the
  // axis is held to whole numbers.
  const max = niceMax(Math.max(...points.map((p) => p.value), 1), true);

  const band = points.length > 0 ? plotWidth / points.length : 0;
  // A 2px gap of surface between neighbouring bars, so two tall bars read as two
  // marks rather than one block.
  const barWidth = Math.max(2, band * 0.62);

  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  return (
    <div className={styles.plot} ref={ref}>
      {width > 0 ? (
        <svg
          className={styles.svg}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Bar chart of ${points.length} periods. Use the table view for the figures.`}
          onMouseLeave={() => setHover(null)}
        >
          {/* The gridlines and their labels, drawn first so every mark sits on
              top of them. */}
          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const value = (max / GRID_LINES) * i;
            const lineY = y(value);
            return (
              <g key={i}>
                <line
                  className={styles.gridLine}
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={lineY}
                  y2={lineY}
                />
                <text className={styles.axisLabel} x={PAD.left - 8} y={lineY + 4} textAnchor="end">
                  {format(value)}
                </text>
              </g>
            );
          })}

          {points.map((point, i) => {
            const barX = PAD.left + i * band + (band - barWidth) / 2;
            const barY = y(point.value);
            const barHeight = Math.max(0, PAD.top + plotHeight - barY);
            const dim = hover !== null && hover !== i;

            return (
              <g key={point.label}>
                <rect
                  className={`${styles.bar} ${dim ? styles.barDim : ''}`}
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  // Rounded at the top only. The bottom is anchored to the
                  // baseline, and rounding that would lift the mark off its own
                  // axis.
                  rx={Math.min(4, barWidth / 2)}
                  fill={color}
                />
                {/* Squares off the bottom two corners that rx just rounded. */}
                {barHeight > 4 ? (
                  <rect
                    className={`${styles.bar} ${dim ? styles.barDim : ''}`}
                    x={barX}
                    y={PAD.top + plotHeight - 4}
                    width={barWidth}
                    height={4}
                    fill={color}
                  />
                ) : null}

                {/* The full-height hover strip. */}
                <rect
                  className={styles.hitArea}
                  x={PAD.left + i * band}
                  y={PAD.top}
                  width={band}
                  height={plotHeight}
                  onMouseEnter={() => setHover(i)}
                />

                {/* Every third label, so they do not collide on a narrow card. */}
                {i % 3 === 0 || i === points.length - 1 ? (
                  <text
                    className={styles.axisLabel}
                    x={PAD.left + i * band + band / 2}
                    y={HEIGHT - 8}
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      ) : null}

      {hover !== null && points[hover] ? (
        <Tooltip
          x={PAD.left + hover * band + band / 2}
          y={y(points[hover].value) - 10}
          label={points[hover].label}
          rows={[
            { color, label: 'Value', value: format(points[hover].value) },
            ...(secondary?.(hover)
              ? [
                  {
                    color: 'var(--ink3)',
                    label: secondary(hover)!.label,
                    value: secondary(hover)!.value,
                  },
                ]
              : []),
          ]}
        />
      ) : null}
    </div>
  );
}

// ==================================================================
// A LINE
// For a measure moving over months — revenue, sign-ups.
// ==================================================================
export function LineChart({
  points,
  color = 'var(--chart-1)',
  format = (v: number) => v.toLocaleString(),
}: {
  points: Point[];
  color?: string;
  format?: (value: number) => string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));

  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + i * step;
  const y = (value: number) => PAD.top + plotHeight - (value / max) * plotHeight;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ');
  // The shaded area under the line. Faint, because it is there to give the line
  // a sense of volume, not to be a second mark competing with it.
  const area =
    points.length > 0
      ? `${path} L ${x(points.length - 1)} ${PAD.top + plotHeight} L ${x(0)} ${PAD.top + plotHeight} Z`
      : '';

  const gradientId = `area-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <div className={styles.plot} ref={ref}>
      {width > 0 ? (
        <svg
          className={styles.svg}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`Line chart across ${points.length} months. Use the table view for the figures.`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {Array.from({ length: GRID_LINES + 1 }, (_, i) => {
            const value = (max / GRID_LINES) * i;
            const lineY = y(value);
            return (
              <g key={i}>
                <line
                  className={styles.gridLine}
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={lineY}
                  y2={lineY}
                />
                <text className={styles.axisLabel} x={PAD.left - 8} y={lineY + 4} textAnchor="end">
                  {format(value)}
                </text>
              </g>
            );
          })}

          <path d={area} fill={`url(#${gradientId})`} />
          <path className={styles.line} d={path} stroke={color} />

          {/* The crosshair and the dot, only where the pointer is. */}
          {hover !== null ? (
            <>
              <line
                className={styles.crosshair}
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={PAD.top + plotHeight}
              />
              <circle
                className={styles.marker}
                cx={x(hover)}
                cy={y(points[hover].value)}
                r={5}
                fill={color}
              />
            </>
          ) : null}

          {points.map((point, i) => (
            <g key={point.label}>
              <rect
                className={styles.hitArea}
                x={x(i) - step / 2}
                y={PAD.top}
                width={Math.max(step, 1)}
                height={plotHeight}
                onMouseEnter={() => setHover(i)}
              />
              {i % 2 === 0 || i === points.length - 1 ? (
                <text className={styles.axisLabel} x={x(i)} y={HEIGHT - 8} textAnchor="middle">
                  {point.label}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      ) : null}

      {hover !== null && points[hover] ? (
        <Tooltip
          x={x(hover)}
          y={y(points[hover].value) - 14}
          label={points[hover].label}
          rows={[{ color, label: 'Value', value: format(points[hover].value) }]}
        />
      ) : null}
    </div>
  );
}

// ---- THE HOVER BOX ----
function Tooltip({
  x,
  y,
  label,
  rows,
}: {
  x: number;
  y: number;
  label: string;
  rows: { color: string; label: string; value: string }[];
}) {
  return (
    <div className={styles.tooltip} style={{ left: x, top: y }}>
      <Text variant="caption" tone="ink3" as="p" raw>
        {label}
      </Text>
      {rows.map((row) => (
        <div key={row.label} className={styles.tooltipRow}>
          <span className={styles.swatch} style={{ background: row.color }} aria-hidden="true" />
          <Text variant="label" as="span" raw>
            {row.value}
          </Text>
        </div>
      ))}
    </div>
  );
}
